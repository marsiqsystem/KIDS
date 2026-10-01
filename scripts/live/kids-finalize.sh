#!/usr/bin/env bash
#
# Hand a finished class recording to the KIDS app, which puts it in Google Drive.
#
# Installed on the CLASS SERVER, not run from the repo. Jibri calls it once per
# recording with the recording's directory (jibri.conf, recording.finalize-script):
#
#   /opt/kids/kids-finalize.sh /srv/recordings/<session-id>
#
# and cron calls it every 20 minutes to retry anything that did not go through:
#
#   /opt/kids/kids-finalize.sh --pending
#
# For each .mp4 it:
#   1. asks the app for a one-off Google Drive upload address ("start"),
#   2. sends the video straight to Google with curl,
#   3. tells the app which Drive file it made ("done") -- the app shares it for
#      Google's player and puts it on the batch's phones,
#   4. deletes the local copy, ONLY after step 3 answered yes.
#
# This box never holds the Google token. It holds KIDS_JITSI_SECRET, which it
# already has for join tokens, and signs each request with it.
#
# Settings: /etc/kids/recording.env (root:jibri, 640)
#   KIDS_APP_URL=https://www.kidskolkata.org
#   KIDS_JITSI_SECRET=<the same secret as Vercel's KIDS_JITSI_SECRET>
#
# Log: /var/log/jitsi/jibri/kids-finalize.log

set -uo pipefail

# Overridable only so the script can be rehearsed off the server.
ROOT=${KIDS_RECORDINGS_DIR:-/srv/recordings}
LOG=${KIDS_FINALIZE_LOG:-/var/log/jitsi/jibri/kids-finalize.log}
# shellcheck disable=SC1090
source "${KIDS_RECORDING_ENV:-/etc/kids/recording.env}"

say() { echo "$(date '+%F %T') $*" >> "$LOG"; }

# POST a JSON body to the app, signed. Prints the response body; returns
# non-zero unless the app answered 2xx.
call() {
  local body=$1 ts sig out code
  ts=$(date +%s)
  sig=$(printf '%s.%s' "$ts" "$body" | openssl dgst -sha256 -hmac "$KIDS_JITSI_SECRET" -hex | awk '{print $NF}')
  out=$(mktemp)
  code=$(curl -sS -o "$out" -w '%{http_code}' -X POST "$KIDS_APP_URL/api/live/recording" \
    -H 'content-type: application/json' \
    -H "x-kids-timestamp: $ts" \
    -H "x-kids-signature: $sig" \
    --max-time 60 --data "$body")
  cat "$out"
  rm -f "$out"
  [[ $code == 2* ]]
}

# The Jitsi room is the last path segment of metadata.json's meeting_url.
room_of() {
  local dir=$1
  if [[ -f $dir/metadata.json ]]; then
    jq -r '.meeting_url // empty' "$dir/metadata.json" | sed -E 's#.*/##; s#\?.*##' | tr 'A-Z' 'a-z'
  fi
}

handle() {
  local dir=$1 room mp4 bytes reply url drive_id
  room=$(room_of "$dir")
  if [[ -z $room ]]; then
    say "SKIP $dir: no meeting_url in metadata.json"
    return 0
  fi

  shopt -s nullglob
  for mp4 in "$dir"/*.mp4; do
    [[ -f $mp4.uploaded || -f $mp4.drive ]] && continue
    bytes=$(stat -c %s "$mp4")
    if (( bytes == 0 )); then
      say "SKIP $mp4: empty"
      continue
    fi

    # Step 1. A 404 means no class has this room (a test room, a stray): keep
    # the file and stop retrying it, so it can be looked at by hand.
    if ! reply=$(call "$(jq -cn --arg r "$room" --argjson b "$bytes" '{action:"start",room:$r,bytes:$b}')"); then
      say "START FAILED $mp4 ($room): $reply"
      if grep -q 'No class has room' <<<"$reply"; then touch "$mp4.no-class"; fi
      continue
    fi
    url=$(jq -r '.url // empty' <<<"$reply")
    [[ -z $url ]] && { say "START gave no url for $mp4: $reply"; continue; }

    # Step 2. Straight to Google. The address is good for this one file.
    reply=$(curl -sS -X PUT -H 'content-type: video/mp4' --upload-file "$mp4" \
      --retry 3 --retry-delay 10 --max-time 7200 "$url")
    drive_id=$(jq -r '.id // empty' <<<"$reply" 2>/dev/null)
    if [[ -z $drive_id ]]; then
      say "UPLOAD FAILED $mp4: $reply"
      continue
    fi
    # Remember the Drive id at once: if step 3 fails, the retry must not
    # upload the whole video a second time.
    echo "$drive_id" > "$mp4.drive"

    if ! reply=$(call "$(jq -cn --arg d "$drive_id" '{action:"done",driveId:$d}')"); then
      say "DONE FAILED $mp4 (drive $drive_id): $reply"
      continue
    fi
    touch "$mp4.uploaded"
    say "OK $mp4 -> drive $drive_id, class $(jq -r '.classId' <<<"$reply")"
  done

  # Only when every video in the directory is safely handed over.
  local left=0
  for mp4 in "$dir"/*.mp4; do [[ -f $mp4.uploaded ]] || left=1; done
  if (( left == 0 )); then rm -rf -- "$dir"; say "CLEANED $dir"; fi
}

# A video uploaded to Drive whose "done" call failed: finish it without
# re-uploading.
finish_pending_done() {
  local dir=$1 mp4 drive_id reply
  shopt -s nullglob
  for mp4 in "$dir"/*.mp4; do
    [[ -f $mp4.drive && ! -f $mp4.uploaded ]] || continue
    drive_id=$(cat "$mp4.drive")
    if reply=$(call "$(jq -cn --arg d "$drive_id" '{action:"done",driveId:$d}')"); then
      touch "$mp4.uploaded"
      say "OK (retry) $mp4 -> drive $drive_id"
    else
      say "DONE FAILED again $mp4: $reply"
    fi
  done
}

if [[ ${1:-} == --pending ]]; then
  for dir in "$ROOT"/*/; do
    dir=${dir%/}
    # Not while Jibri may still be writing it.
    [[ -n $(find "$dir" -name '*.mp4' -mmin -10 -print -quit) ]] && continue
    finish_pending_done "$dir"
    # A file already given to Drive only needs "done"; skip a re-upload.
    for mp4 in "$dir"/*.mp4; do [[ -f $mp4.drive && ! -f $mp4.uploaded ]] && continue 2; done
    [[ -n $(find "$dir" -name '*.no-class' -print -quit) ]] && continue
    handle "$dir"
  done
else
  [[ -d ${1:-} ]] || { say "called without a directory: ${1:-}"; exit 0; }
  handle "$1"
fi
exit 0

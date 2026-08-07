"""Patch approved videos from videos.json into the authored asset batch files.

Umar owns the video list and I own the trick and the interactive, so the two
live apart: videos.json is his, assets/*.json are mine. This script copies his
side into mine without touching a word of the teaching content, which means a
reissued video list can simply be re-imported.

    python tools/questions/import_videos.py --dry-run   # show what would change
    python tools/questions/import_videos.py             # write

A video id only exists here because a human put it in videos.json, so importing
one sets approved: true. That is the whole point of the flag -- see the video
rule in the README.

The reverse matters just as much: a chapter that is NOT in videos.json has its
id cleared and approved set back to false. A link can turn out to be the wrong
video or can die, and when that happens removing the row from videos.json has to
be enough to pull it off the page -- otherwise a withdrawal silently fails to
withdraw. The authored query and the teaching content are never touched.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
BATCH_DIR = HERE / "assets"
VIDEOS = HERE / "videos.json"


def main() -> int:
    dry = "--dry-run" in sys.argv[1:]
    supplied = {(v["bucket"], v["chapter"]): v for v in json.loads(VIDEOS.read_text(encoding="utf-8"))}

    changed = unchanged = withdrawn = 0
    missing = []
    for path in sorted(BATCH_DIR.glob("*.json")):
        records = json.loads(path.read_text(encoding="utf-8"))
        dirty = False
        for rec in records:
            key = (rec["bucket"], rec["chapter"])
            v = supplied.get(key)
            video = rec["video"]
            if v is None:
                missing.append(key)
                if video.get("video_id") is not None or video.get("approved"):
                    video["video_id"] = None
                    video["approved"] = False
                    for field in ("language", "duration", "start"):
                        video.pop(field, None)
                    dirty = True
                    withdrawn += 1
                continue
            before = json.dumps(video, sort_keys=True)
            # The authored query is kept: it records what was looked for, and it
            # is what a re-search would start from if this video ever dies.
            video["video_id"] = v["video_id"]
            video["approved"] = True
            for field in ("language", "duration", "start"):
                if field in v:
                    video[field] = v[field]
            if json.dumps(video, sort_keys=True) != before:
                dirty = True
                changed += 1
            else:
                unchanged += 1
        if dirty and not dry:
            path.write_text(json.dumps(records, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        if dirty:
            print(f"{'would patch' if dry else 'patched'} {path.name}")

    print(f"\n{changed} video(s) {'would be ' if dry else ''}set, {unchanged} already current")
    print(f"{withdrawn} video(s) {'would be ' if dry else ''}withdrawn (no longer in videos.json)")
    print(f"{len(missing)} authored chapter(s) still have no video in videos.json")
    unused = set(supplied) - {(r['bucket'], r['chapter'])
                              for p in BATCH_DIR.glob('*.json')
                              for r in json.loads(p.read_text(encoding='utf-8'))}
    print(f"{len(unused)} video(s) in videos.json are waiting for their chapter to be authored")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

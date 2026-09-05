"use client";

import { useState } from "react";

/**
 * The chapter video. Design 4c's three rules, kept literally.
 *
 *   1. The embed never becomes a link out. No title bar, no channel avatar, no
 *      "Watch on YouTube" — a student sent to youtube.com meets autoplay and
 *      Shorts and does not come back.
 *   2. The source is credited in text under the frame, because the credit is
 *      owed. We hold no teacher or channel name for any of the 312 approved
 *      videos, so the credit says what is true — hosted on YouTube, played
 *      here — and never invents a name.
 *   3. Nothing autoplays and nothing queues a next video.
 *
 * The frame does not load until it is tapped. That is rule 1 enforced rather
 * than requested, and it is also the difference between a chapter page costing
 * a few kilobytes and costing a megabyte on a school's 3G. Until the tap,
 * YouTube is not contacted at all.
 */
export default function VideoEmbed({
  videoId,
  language,
  duration,
  start,
  chapter,
}: {
  videoId: string;
  language: string | null;
  duration: string | null;
  start: number | null;
  chapter: string;
}) {
  const [playing, setPlaying] = useState(false);

  const params = new URLSearchParams({
    autoplay: "1", // safe: only ever reached by a deliberate tap
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    iv_load_policy: "3",
  });
  if (start) params.set("start", String(start));

  const spoken = language
    ? language.charAt(0) + language.slice(1).toLowerCase()
    : null;

  return (
    <div className="app-video">
      {playing ? (
        <div className="app-video__frame">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?${params}`}
            title={`${chapter} — chapter video`}
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      ) : (
        <button type="button" className="app-video__poster" onClick={() => setPlaying(true)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a YouTube
              thumbnail is a remote URL on a domain we do not control; routing it
              through the image optimiser would cost a serverless invocation per
              chapter for no gain. */}
          <img
            src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
            alt=""
            aria-hidden="true"
            loading="lazy"
          />
          <span className="app-video__play" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.5 4.6v14.8L19.5 12z" />
            </svg>
          </span>
          <span className="app-video__label">
            Play inside the app
            {duration ? ` · ${duration}` : ""}
          </span>
        </button>
      )}

      <p className="app-video__credit">
        Hosted on YouTube and played here. KIDS does not host video.
        {spoken ? ` This one is in ${spoken}.` : ""}
      </p>
    </div>
  );
}

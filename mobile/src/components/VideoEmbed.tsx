import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { color, font, radius } from "@/theme";

const ORIGIN = "https://www.kidskolkata.org";

/**
 * The chapter video — the website's VideoEmbed, and its three rules, kept:
 *
 *   1. The embed never becomes a link out. A child sent to YouTube meets
 *      autoplay and Shorts and does not come back — so any navigation away
 *      from the embed is refused here, not merely discouraged.
 *   2. The source is credited in text under the frame. We hold no teacher or
 *      channel name, so the credit says what is true and invents nothing.
 *   3. Nothing autoplays and nothing queues a next video.
 *
 * Until the tap, YouTube is not contacted at all — only its thumbnail.
 */
export default function VideoEmbed({
  videoId,
  language,
  duration,
  start,
}: {
  videoId: string;
  language: string | null;
  duration: string | null;
  start: number | null;
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
  params.set("origin", ORIGIN);
  // YouTube refuses an embed that arrives with no referring site (its "Error
  // 153"). A bare WebView has none, so the frame sits in a one-line page whose
  // origin is the KIDS website — the same frame the website itself shows.
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%}</style></head><body><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></body></html>`;

  const spoken = language ? language.charAt(0) + language.slice(1).toLowerCase() : null;

  return (
    <View style={{ gap: 6 }}>
      <View style={styles.frame}>
        {playing ? (
          <WebView
            source={{ html, baseUrl: ORIGIN }}
            style={{ flex: 1, backgroundColor: "#000" }}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            allowsFullscreenVideo
            // Rule 1: the player may load what it needs inside its frame, but
            // the page itself never navigates — a tap on YouTube's logo or a
            // suggested video goes nowhere.
            onShouldStartLoadWithRequest={(req) => req.isTopFrame === false || req.url === `${ORIGIN}/` || req.url === "about:blank"}
            setSupportMultipleWindows={false}
          />
        ) : (
          <Pressable onPress={() => setPlaying(true)} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel="Play the chapter video">
            <Image source={{ uri: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <View style={styles.play}>
              <Text style={{ color: color.maroonDeep, fontSize: 22, marginLeft: 3 }}>▶</Text>
            </View>
            <Text style={styles.label}>{duration ?? "Play"}</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.credit}>Hosted on YouTube{spoken ? ` · ${spoken}` : ""}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { aspectRatio: 16 / 9, borderRadius: radius.xl, overflow: "hidden", backgroundColor: color.ink },
  play: {
    position: "absolute",
    alignSelf: "center",
    top: "50%",
    marginTop: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: color.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    position: "absolute",
    right: 10,
    bottom: 10,
    fontFamily: font.bodySemibold,
    fontSize: 12,
    color: color.white,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    overflow: "hidden",
  },
  credit: { fontFamily: font.body, fontSize: 12, color: color.inkMuted, textAlign: "center" },
});

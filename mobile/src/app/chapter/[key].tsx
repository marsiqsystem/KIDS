import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Check, Lightbulb, VideoOff, X } from "lucide-react-native";
import { Btn, Card, Empty, Loading, Offline, Screen, s } from "@/components/kit";
import VideoEmbed from "@/components/VideoEmbed";
import { useScreen } from "@/hooks/useScreen";
import { useSession } from "@/lib/session";
import { color, font, radius } from "@/theme";

/**
 * One chapter — the website's /app/learn/[key] (board 07, 2C): the trick, the
 * video, the questions. The header takes the subject's full colour, the only
 * place a subject owns a header. The chapter's real size is stated wherever it
 * is mentioned — "Practise · 3 questions", never a bare "Practise".
 */
type ChapterModel = {
  key: string;
  section: string;
  hue: string;
  chapter: string;
  video: { id: string; language: string | null; duration: string | null; start: number | null } | null;
  trick: string | null;
  total: number;
  seen: number;
  right: number;
  toRevise: number;
  questions: { id: string; stem: string; state: "new" | "right" | "again"; on: string | null }[];
};

export default function ChapterScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const insets = useSafeAreaInsets();
  const { call } = useSession();
  const { data, failed } = useScreen<ChapterModel>(`/learn/${encodeURIComponent(key)}`);
  const [asked, setAsked] = useState<"no" | "busy" | "yes" | "failed">("no");

  if (!data) return failed ? <Offline show /> : <Loading />;

  async function askForVideo() {
    setAsked("busy");
    try {
      await call(`/learn/${encodeURIComponent(key)}/video`, { method: "POST", body: {} });
      setAsked("yes");
    } catch {
      setAsked("failed");
    }
  }

  return (
    <Screen pad={false}>
      <View style={[styles.hero, { backgroundColor: data.hue, paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityLabel="Back to Learn" hitSlop={6}>
          <ArrowLeft size={24} color={color.white} />
        </Pressable>
        <Text style={styles.subject}>{data.section}</Text>
        <Text style={styles.name} accessibilityRole="header">
          {data.chapter}
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16, gap: 14 }}>
        {data.video ? (
          <VideoEmbed videoId={data.video.id} language={data.video.language} duration={data.video.duration} start={data.video.start} />
        ) : (
          // Some chapters have no explainer filmed. Said plainly; the written
          // explanations stand on their own.
          <Card tone="dashed" style={{ alignItems: "center", gap: 10 }}>
            <Empty title="No video yet" icon={<VideoOff size={30} color={color.teal} />} />
            {asked === "yes" ? (
              <Text style={s.line}>KIDS has your request for this chapter.</Text>
            ) : (
              <>
                <Btn label="Ask for a video" kind="outline" small busy={asked === "busy"} onPress={askForVideo} />
                {asked === "failed" ? <Text style={s.line}>No connection. Try again.</Text> : null}
              </>
            )}
          </Card>
        )}

        {data.trick ? (
          <View style={styles.trick}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Lightbulb size={18} color={color.maroonDeep} />
              <Text style={styles.trickHead}>The trick</Text>
            </View>
            <Text style={styles.trickBody}>{data.trick}</Text>
          </View>
        ) : null}

        <View style={styles.stats}>
          {[
            [data.seen, "seen"],
            [data.right, "got right"],
            [data.toRevise, "to revise"],
          ].map(([n, label]) => (
            <View key={label} style={styles.stat}>
              <Text style={styles.statN}>{n}</Text>
              <Text style={s.meta}>{label}</Text>
            </View>
          ))}
        </View>

        {data.total > 0 ? (
          <Card>
            <Text style={s.label}>Questions in this chapter</Text>
            <View style={{ marginTop: 6 }}>
              {data.questions.map((q) => (
                <View key={q.id} style={styles.q}>
                  <View
                    style={[
                      styles.qDot,
                      q.state === "right" && { backgroundColor: color.teal, borderWidth: 0 },
                      q.state === "again" && { backgroundColor: color.maroonTint, borderWidth: 0 },
                    ]}
                  >
                    {q.state === "right" ? <Check size={13} color={color.white} /> : q.state === "again" ? <X size={13} color={color.maroon} /> : null}
                  </View>
                  <Text style={styles.qStem} numberOfLines={2}>
                    {q.stem}
                  </Text>
                  {q.state === "new" ? (
                    <Text style={[styles.tag, { backgroundColor: color.newWash, color: color.royalBlue }]}>New</Text>
                  ) : q.state === "right" ? (
                    <Text style={[styles.tag, { backgroundColor: color.creamMuted, color: color.inkMuted }]}>Right · {q.on}</Text>
                  ) : (
                    <Text style={[styles.tag, { backgroundColor: color.goldWash, color: color.maroonDeep }]}>Again</Text>
                  )}
                </View>
              ))}
            </View>
          </Card>
        ) : (
          <Card tone="dashed">
            <Empty title="Nothing here yet" line="This chapter has no questions loaded." />
          </Card>
        )}

        {data.total > 0 ? (
          <>
            <Text style={[s.line, { textAlign: "center" }]}>Practice here never breaks your streak.</Text>
            <Btn
              label={`Practise · ${data.total} question${data.total === 1 ? "" : "s"}`}
              onPress={() => router.push({ pathname: "/practice/[key]", params: { key: data.key } })}
            />
          </>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 10, paddingBottom: 22, marginBottom: 2 },
  back: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  subject: { fontFamily: font.bodySemibold, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: "rgba(255,255,255,0.85)", paddingHorizontal: 8 },
  name: { fontFamily: font.display, fontSize: 26, lineHeight: 31, color: color.white, paddingHorizontal: 8, marginTop: 4 },
  trick: { backgroundColor: color.goldWash, borderWidth: 1, borderColor: color.goldLight, borderRadius: radius.xl, padding: 16, gap: 6 },
  trickHead: { fontFamily: font.bodySemibold, fontSize: 14, color: color.maroonDeep },
  trickBody: { fontFamily: font.body, fontSize: 15, lineHeight: 22, color: color.ink },
  stats: { flexDirection: "row", gap: 10 },
  stat: { flex: 1, alignItems: "center", backgroundColor: color.white, borderWidth: 1, borderColor: color.creamMuted, borderRadius: radius.lg, paddingVertical: 12 },
  statN: { fontFamily: font.display, fontSize: 24, color: color.ink, fontVariant: ["tabular-nums"] },
  q: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9 },
  qDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: color.dash, alignItems: "center", justifyContent: "center" },
  qStem: { flex: 1, fontFamily: font.body, fontSize: 14, lineHeight: 19, color: color.ink },
  tag: { fontFamily: font.bodySemibold, fontSize: 11, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, overflow: "hidden" },
});

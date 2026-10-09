import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { ChevronRight, Play, PlayCircle, Search } from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";
import { Btn, Card, Empty, Hero, Loading, Offline, Row, Screen, s } from "@/components/kit";
import { useScreen } from "@/hooks/useScreen";
import { color, font, radius } from "@/theme";

/**
 * Learn — the website's /app/learn and ChapterBrowse (board 07, 2A–2B).
 *
 * On top, the student's subjects as rings — chapters touched of chapters there
 * are, a measure of what has been SEEN, never of mastery. Subjects not chosen
 * stay visible with what adding them would bring. Below, every chapter of the
 * class and stream under its subject, each stating its real size.
 *
 * Search and filters run here over the list the server already narrowed. A
 * child whose batch has had a recorded class gets a row to the recordings;
 * everybody else would be shown an empty promise.
 */
type Chapter = {
  key: string;
  section: string;
  hue: string;
  initials: string;
  chapter: string;
  total: number;
  seen: number;
  wrong: number;
  hasVideo: boolean;
  mine: boolean;
};
type LearnModel = { noStream: boolean; chapters: Chapter[]; recordedClasses: number };
type Filter = "mine" | "video" | "fresh" | "weak";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "mine", label: "My subjects" },
  { id: "video", label: "Has a video" },
  { id: "fresh", label: "Not started" },
  { id: "weak", label: "Weak" },
];

export default function Learn() {
  const { data, failed, refreshing, refresh } = useScreen<LearnModel>("/learn");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Set<Filter>>(new Set());
  const [subject, setSubject] = useState<string | null>(null);
  const chapters = useMemo(() => data?.chapters ?? [], [data]);

  const subjects = useMemo(() => {
    const out = new Map<string, { section: string; hue: string; initials: string; chapters: number; touched: number; questions: number; unseen: number; videos: number; mine: boolean }>();
    for (const c of chapters) {
      const x = out.get(c.section) ?? { section: c.section, hue: c.hue, initials: c.initials, chapters: 0, touched: 0, questions: 0, unseen: 0, videos: 0, mine: c.mine };
      x.chapters += 1;
      x.touched += c.seen > 0 ? 1 : 0;
      x.questions += c.total;
      x.unseen += c.total - c.seen;
      x.videos += c.hasVideo ? 1 : 0;
      out.set(c.section, x);
    }
    const all = [...out.values()];
    return [...all.filter((x) => x.mine), ...all.filter((x) => !x.mine)];
  }, [chapters]);

  const groups = useMemo(() => {
    // A plain lowercase contains: locale folding is wrong for Bengali.
    const needle = query.trim().toLowerCase();
    const shown = chapters.filter((c) => {
      if (subject && c.section !== subject) return false;
      if (needle && !c.chapter.toLowerCase().includes(needle) && !c.section.toLowerCase().includes(needle)) return false;
      if (active.has("mine") && !c.mine) return false;
      if (active.has("video") && !c.hasVideo) return false;
      if (active.has("fresh") && c.seen > 0) return false;
      // A real mistake on record, not a guess from one low score.
      if (active.has("weak") && c.wrong === 0) return false;
      return true;
    });
    const out: { section: string; hue: string; rows: Chapter[] }[] = [];
    for (const row of shown) {
      const last = out[out.length - 1];
      if (last && last.section === row.section) last.rows.push(row);
      else out.push({ section: row.section, hue: row.hue, rows: [row] });
    }
    return out;
  }, [chapters, query, active, subject]);

  if (!data) return failed ? <Screen onRefresh={refresh} refreshing={refreshing}><Offline show /></Screen> : <Loading />;

  const withVideo = chapters.filter((c) => c.hasVideo).length;
  const toggle = (id: Filter) =>
    setActive((was) => {
      const next = new Set(was);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const mine = subjects.filter((x) => x.mine);
  const others = subjects.filter((x) => !x.mine);

  return (
    <Screen pad={false} onRefresh={refresh} refreshing={refreshing}>
      <Hero title="Learn" chips={data.noStream ? undefined : [{ label: `${withVideo} videos` }]} />
      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        <Offline show={failed} />
        {data.noStream ? (
          <Card tone="dashed">
            <Empty title="Your stream is not on file" line="Ask the office to add Arts, Commerce or Science, then your chapters appear here." />
          </Card>
        ) : (
          <>
            {data.recordedClasses > 0 && !subject && !query && active.size === 0 ? (
              <Row
                icon={<PlayCircle size={22} color={color.maroon} />}
                title="Class recordings"
                line={`${data.recordedClasses} class${data.recordedClasses === 1 ? "" : "es"} to watch again`}
                onPress={() => router.push("/recordings")}
              />
            ) : null}
            {!subject && !query && active.size === 0 ? (
              <View style={{ gap: 10 }}>
                {mine.length > 0 ? <Text style={s.label}>My subjects · {mine.length}</Text> : null}
                {mine.map((x) => (
                  <Pressable key={x.section} onPress={() => setSubject(x.section)} style={s.row} accessibilityRole="button">
                    <SmallRing hue={x.hue} value={x.touched} total={x.chapters} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowTitle}>{x.section}</Text>
                      <Text style={s.rowLine}>
                        {x.touched === x.chapters ? `All ${x.chapters} chapters seen` : `${x.chapters} chapters · ${x.videos} videos`}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={color.inkMuted} />
                  </Pressable>
                ))}

                {others.length > 0 ? <Text style={s.label}>Not chosen</Text> : null}
                {others.map((x) => (
                  <Pressable key={x.section} onPress={() => setSubject(x.section)} style={[s.row, styles.off]} accessibilityRole="button">
                    <View style={[styles.badge, { borderColor: x.hue }]}>
                      <Text style={[styles.badgeText, { color: x.hue }]}>{x.initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowTitle}>{x.section}</Text>
                      <Text style={s.rowLine}>
                        {x.chapters} chapters · {x.questions} questions
                      </Text>
                    </View>
                    {x.unseen > 0 ? <Text style={[styles.tag, styles.tagNew]}>+{x.unseen}</Text> : null}
                  </Pressable>
                ))}
                <Btn label="Change my subjects" kind="outline" onPress={() => router.push("/subjects")} />
              </View>
            ) : null}

            <View style={styles.search}>
              <Search size={20} color={color.inkMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search a chapter"
                placeholderTextColor={color.inkFaint}
                style={styles.searchInput}
                accessibilityLabel="Search a chapter"
                returnKeyType="search"
              />
            </View>

            <View style={styles.filters}>
              {subject ? (
                <Pressable onPress={() => setSubject(null)} style={[styles.filter, { backgroundColor: subjects.find((x) => x.section === subject)?.hue, borderColor: "transparent" }]} accessibilityLabel={`${subject}, tap to show every subject`}>
                  <Text style={[styles.filterText, { color: color.white }]}>{subject} ✕</Text>
                </Pressable>
              ) : null}
              {FILTERS.map((f) => {
                const on = active.has(f.id);
                return (
                  <Pressable key={f.id} onPress={() => toggle(f.id)} style={[styles.filter, on && styles.filterOn]} accessibilityState={{ selected: on }}>
                    <Text style={[styles.filterText, on && { color: color.cream }]}>{f.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {groups.length === 0 ? (
              <Text style={[s.line, { textAlign: "center" }]}>Nothing matches. Clear a filter.</Text>
            ) : (
              groups.map((g) => (
                <View key={g.section} style={{ gap: 6 }}>
                  <View style={[styles.groupHead, { borderLeftColor: g.hue }]}>
                    <Text style={styles.groupName}>{g.section}</Text>
                    <Text style={s.meta}>
                      {g.rows.filter((r) => r.seen > 0).length} of {g.rows.length} chapters seen
                    </Text>
                  </View>
                  {g.rows.map((row) => (
                    <Pressable
                      key={row.key}
                      onPress={() => router.push({ pathname: "/chapter/[key]", params: { key: row.key } })}
                      style={({ pressed }) => [styles.chapter, row.seen > 0 && { borderLeftColor: g.hue }, pressed && { opacity: 0.9 }]}
                    >
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={styles.chapterName}>{row.chapter}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text style={s.meta}>
                            {row.seen === 0 ? `${row.total} question${row.total === 1 ? "" : "s"}` : `${row.seen} of ${row.total} seen`}
                          </Text>
                          {row.hasVideo ? (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                              <Play size={11} color={color.maroon} fill={color.maroon} />
                              <Text style={[s.meta, { color: color.maroon }]}>Video</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                      {row.wrong > 0 ? <Text style={[styles.tag, styles.tagAgain]}>Weak</Text> : null}
                      {row.seen === 0 ? <Text style={[styles.tag, styles.tagNew]}>New</Text> : null}
                      <ChevronRight size={18} color={color.inkMuted} />
                    </Pressable>
                  ))}
                </View>
              ))
            )}
          </>
        )}
      </View>
    </Screen>
  );
}

function SmallRing({ hue, value, total }: { hue: string; value: number; total: number }) {
  const size = 44;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <View style={{ width: size, height: size }} accessibilityLabel={`${value} of ${total} chapters seen`}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color.creamMuted} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={hue} strokeWidth={stroke} fill="none" strokeDasharray={`${c * pct} ${c}`} rotation={-90} origin={`${size / 2}, ${size / 2}`} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ fontFamily: font.bodySemibold, fontSize: 10.5, color: color.ink }}>
          {value}/{total}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  off: { borderStyle: "dashed", borderColor: color.dash, backgroundColor: color.creamSurface },
  badge: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  badgeText: { fontFamily: font.bodyBold, fontSize: 13 },
  tag: { fontFamily: font.bodySemibold, fontSize: 11, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, overflow: "hidden" },
  tagNew: { backgroundColor: color.newWash, color: color.royalBlue },
  tagAgain: { backgroundColor: color.goldWash, color: color.maroonDeep },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 52,
    paddingHorizontal: 14,
    backgroundColor: color.white,
    borderWidth: 1,
    borderColor: color.creamMuted,
    borderRadius: radius.lg,
  },
  searchInput: { flex: 1, fontFamily: font.body, fontSize: 16, color: color.ink, paddingVertical: 10 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filter: { minHeight: 36, justifyContent: "center", paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: color.dash, backgroundColor: color.white },
  filterOn: { backgroundColor: color.maroon, borderColor: color.maroon },
  filterText: { fontFamily: font.bodyMedium, fontSize: 13, color: color.ink },
  groupHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", borderLeftWidth: 4, paddingLeft: 10, marginTop: 8 },
  groupName: { fontFamily: font.bodySemibold, fontSize: 15, color: color.ink },
  chapter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 60,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: color.white,
    borderWidth: 1,
    borderColor: color.creamMuted,
    borderLeftWidth: 4,
    borderLeftColor: color.creamMuted,
    borderRadius: radius.lg,
  },
  chapterName: { fontFamily: font.bodyMedium, fontSize: 15, lineHeight: 20, color: color.ink },
});

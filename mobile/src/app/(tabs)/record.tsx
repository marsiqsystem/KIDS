import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Svg, { Circle as SvgCircle, Polyline } from "react-native-svg";
import { Btn, Loading, Offline, Screen } from "@/components/kit";
import { Badge, H3, Lbl, Note, OfflinePending, P, Panel, Privacy, ResultHeader, Score, Sub, st as rs } from "@/components/record/parts";
import { num, useRecord, type AwardResult, type LaterResult, type Practice } from "@/lib/record";
import { color, font, radius } from "@/theme";

/**
 * My Record — the website's /app/record: the portal's published result, the
 * landing of <ResultView>, with both papers side by side. Each opens its full
 * marksheet on a screen of its own (paper/online, paper/written).
 *
 * Above July: every later result and the award, once published. Below: the
 * practice line from the daily loop, which is the one thing here the portal
 * knows nothing about and must never read like a mark.
 */
export default function Record() {
  const { data, failed, refreshing, refresh } = useRecord();
  if (!data) return failed ? <Screen onRefresh={refresh} refreshing={refreshing}><Offline show /></Screen> : <Loading />;
  const { result: r, later, award, practice } = data;

  return (
    <Screen pad={false} onRefresh={refresh} refreshing={refreshing}>
      <ResultHeader r={r} />
      <View style={{ paddingHorizontal: 16, gap: 14, paddingTop: 4 }}>
        <Offline show={failed} />

        {award ? <AwardCard a={award} /> : null}
        {later.map((x, i) => (
          <LaterCard key={`${x.paper_name}-${i}`} r={x} />
        ))}

        <View style={{ paddingTop: 6 }}>
          <Lbl>Published {r.publishedOn}</Lbl>
          <Text style={styles.ready}>Your result is ready</Text>
          <P>You sat two papers on the same morning. They are marked separately and shown separately. Open either one — you can come back for the other.</P>
        </View>

        {r.online ? (
          <PaperCard
            title="Online Exam"
            what="50 questions · 30 minutes · on your phone"
            marks={r.online.marks}
            total={r.online.total}
            percent={r.online.percent}
            rank={r.online.ranks ? `Rank ${num(r.online.ranks.classRank)} of ${num(r.online.ranks.classSat)} in Class ${r.classLabel}` : null}
            onPress={() => router.push("/paper/online")}
          />
        ) : (
          <Absent title="Online Exam" what="50 questions · 30 minutes · on your phone" line="Our records show no answer sheet was started on your ID that morning." />
        )}

        {!r.offlinePublished ? (
          <OfflinePending />
        ) : r.offline ? (
          <PaperCard
            title="Offline (Written) Exam"
            what="100 questions · OMR sheet · at your centre"
            marks={r.offline.marks}
            total={r.offline.total}
            percent={r.offline.percent}
            rank={r.offline.classRank !== null ? `Rank ${num(r.offline.classRank)} of ${num(r.offline.classSat)} in Class ${r.classLabel}` : null}
            onPress={() => router.push("/paper/written")}
          />
        ) : (
          <Absent
            title="Offline (Written) Exam"
            what="100 questions · OMR sheet · at your centre"
            line="Our records show no answer sheet was collected under your Unique ID that morning."
          />
        )}

        <Privacy />
        <PracticeStrip practice={practice} />
      </View>
    </Screen>
  );
}

function PaperCard({ title, what, marks, total, percent, rank, onPress }: { title: string; what: string; marks: number; total: number; percent: number; rank: string | null; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [rs.panel, rs.panelGold, pressed && { opacity: 0.92 }]} accessibilityRole="button" accessibilityLabel={`${title}, ${marks} of ${total}. Open full marksheet`}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <H3>{title}</H3>
          <Text style={[rs.sub, { marginBottom: 0 }]}>{what}</Text>
        </View>
        <View>
          <Badge tone="teal">Ready</Badge>
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 12, gap: 12 }}>
        <Score marks={marks} total={total} size={50} />
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Text style={styles.side}>{percent}%</Text>
          {rank ? <Text style={[styles.side, { textAlign: "right" }]}>{rank}</Text> : null}
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: color.creamMuted, marginVertical: 12 }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={styles.open}>Open full marksheet</Text>
        <Text style={styles.open}>→</Text>
      </View>
    </Pressable>
  );
}

function Absent({ title, what, line }: { title: string; what: string; line: string }) {
  return (
    <Panel>
      <View style={{ flexDirection: "row" }}>
        <Badge tone="outline">Not attempted</Badge>
      </View>
      <Text style={[rs.h3, { marginTop: 8 }]}>{title}</Text>
      <Text style={rs.sub}>{what}</Text>
      <Note title="You did not sit this paper">
        <P style={{ marginBottom: 6 }}>So there are no marks and no rank for it. {line}</P>
        <P>If you believe you did sit it, tell your school co-ordinator.</P>
      </Note>
    </Panel>
  );
}

const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 10) / 10}`);

/** The SET 2026 award — says what it is made of. */
function AwardCard({ a }: { a: AwardResult }) {
  return (
    <Panel>
      <H3>{a.series_name} · your award mark</H3>
      <Sub>Class {a.cohort}</Sub>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 24 }}>
        <View>
          <Text style={styles.big}>
            {pct(a.award_percent)}
            <Text style={styles.bigOf}>/100</Text>
          </Text>
          <Lbl>{a.phases === 2 ? "Average of Phase 1 and Phase 2" : "From the one phase you sat"}</Lbl>
        </View>
        {a.ranked && a.rank !== null ? (
          <View>
            <Text style={[styles.big, { color: color.ink }]}>
              {num(a.rank)}
              <Text style={styles.bigOf}> of {num(a.cohort_size)}</Text>
            </Text>
            <Lbl>{a.list === "one" ? "Among students who sat one phase" : a.list === "both" ? "Among students who sat both phases" : `In Class ${a.cohort}`}</Lbl>
          </View>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        <View style={styles.phase}>
          <Lbl>Phase 1 · July, written</Lbl>
          <Text style={styles.phaseV}>{a.phase1_percent === null ? "Not sat" : `${pct(a.phase1_percent)} / 100`}</Text>
        </View>
        <View style={styles.phase}>
          <Lbl>Phase 2 · December, app</Lbl>
          <Text style={styles.phaseV}>{a.phase2_percent === null ? "Not sat" : `${pct(a.phase2_percent)} / 100`}</Text>
        </View>
      </View>
    </Panel>
  );
}

/** A paper after July — a December phase or a mock. */
function LaterCard({ r }: { r: LaterResult }) {
  return (
    <Panel>
      <H3>{r.paper_name}</H3>
      <Sub>{r.kind === "mock" ? "Mock · not counted anywhere" : `Class ${r.cohort}`}</Sub>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
        <View style={[styles.phase, { backgroundColor: color.maroonTint, borderWidth: 0 }]}>
          <Text style={styles.big}>
            {r.marks}
            <Text style={styles.bigOf}>/{r.question_count}</Text>
          </Text>
          <Lbl>Marks</Lbl>
        </View>
        {r.ranked && r.cohort_rank !== null ? (
          <View style={styles.phase}>
            <Text style={[styles.big, { color: color.ink }]}>
              {num(r.cohort_rank)}
              <Text style={styles.bigOf}> of {num(r.cohort_sat)}</Text>
            </Text>
            <Lbl>Rank in Class {r.cohort}</Lbl>
          </View>
        ) : null}
      </View>
      <P muted small>
        {r.correct} correct · {r.wrong} wrong · {r.blank} left blank
        {r.cohort_avg !== null ? ` · class average ${pct(r.cohort_avg)}` : ""}
        {r.cohort_high !== null ? ` · highest ${r.cohort_high}` : ""}
      </P>
      {r.timed_out ? <P muted small>Submitted automatically when time ran out.</P> : null}
      {r.receipt ? <P muted small>Receipt {r.receipt}</P> : null}
    </Panel>
  );
}

/** "Practice since the exam" — own record, not a rank. */
function PracticeStrip({ practice }: { practice: Practice }) {
  if (practice.answered === 0) {
    return (
      <Panel style={{ gap: 10 }}>
        <Text style={styles.stripHead}>Practice since the exam</Text>
        <P muted>Nothing yet. Your daily set is five questions; once you have answered a few, your own record appears here.</P>
        <Btn label="Start today’s set" kind="outline" small onPress={() => router.push("/set")} />
      </Panel>
    );
  }
  return (
    <Panel style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text style={styles.stripHead}>Practice since the exam</Text>
        <Text style={rs.linkNote}>{practice.accuracy}% right first time</Text>
      </View>
      {practice.weeks.length > 1 ? <Spark weeks={practice.weeks} /> : null}
      <P muted>
        Of the {num(practice.answered)} questions the app has put in front of you, you were right at first sight on {num(practice.right)}. This is your own record,
        not a rank — nobody else is in this line.
      </P>
    </Panel>
  );
}

/** Drawn from the weeks that exist — two weeks practised, two points. */
function Spark({ weeks }: { weeks: Practice["weeks"] }) {
  const w = 300;
  const h = 64;
  const pad = 8;
  const step = (w - pad * 2) / (weeks.length - 1);
  const y = (p: number) => pad + (1 - p / 100) * (h - pad * 2);
  return (
    <View>
      <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <Polyline points={weeks.map((k, i) => `${pad + i * step},${y(k.pct)}`).join(" ")} fill="none" stroke={color.maroon} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {weeks.map((k, i) => (
          <SvgCircle key={k.week} cx={pad + i * step} cy={y(k.pct)} r={3} fill={color.maroon} />
        ))}
      </Svg>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {weeks.map((k) => (
          <Text key={k.week} style={{ fontFamily: font.body, fontSize: 10, color: color.inkMuted, textAlign: "center" }}>
            {k.label}
            {"\n"}
            <Text style={{ fontFamily: font.bodyBold, color: color.ink }}>{k.pct}%</Text>
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ready: { fontFamily: font.display, fontSize: 23, color: color.maroon, marginTop: 6, marginBottom: 6 },
  side: { fontFamily: font.body, fontSize: 12, lineHeight: 18, color: color.inkMuted, fontVariant: ["tabular-nums"] },
  open: { fontFamily: font.bodySemibold, fontSize: 14, color: color.maroon },
  big: { fontFamily: font.display, fontSize: 32, color: color.maroon, fontVariant: ["tabular-nums"] },
  bigOf: { fontFamily: font.bodySemibold, fontSize: 14, color: color.inkMuted },
  phase: { flex: 1, backgroundColor: color.creamSurface, borderWidth: 1, borderColor: color.creamMuted, borderRadius: radius.lg, padding: 12, gap: 4 },
  phaseV: { fontFamily: font.bodySemibold, fontSize: 14, color: color.ink, fontVariant: ["tabular-nums"] },
  stripHead: { fontFamily: font.bodySemibold, fontSize: 15, color: color.ink },
});

import { useState, type ReactNode } from "react";
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BatteryLow, Check, Clock, DoorClosed, EyeOff, MapPin, PencilLine, ReceiptText, Smartphone, WifiOff } from "lucide-react-native";
import { Btn, Card, s as kit } from "@/components/kit";
import { ist, pad2, useServerCountdown } from "@/lib/clock";
import { color, font, radius } from "@/theme";

/**
 * The faces of the Exam tab around the paper itself — the website's
 * ExamFaces.tsx (redesign board 04), natively. Presentational only: which face
 * shows is decided on the server (GET /api/m/v1/exam) or by the runner's
 * stage, never here and never from the phone's clock.
 *
 * Not drawn, although the board has it: a room and a desk number. KIDS holds
 * neither, so the place is only ever the centre.
 */

/** The rules ruled on 14 September 2026, plus the one about leaving the paper. */
export function FourRules() {
  const rows: [ReactNode, string][] = [
    [<Clock key="c" size={22} color={color.maroon} />, "Everyone’s paper ends at the same time. A late start gets less time."],
    [<BatteryLow key="b" size={22} color={color.maroon} />, "If your phone dies, the invigilator moves your paper to another phone."],
    [<WifiOff key="w" size={22} color={color.maroon} />, "No signal? Keep answering. Answers are kept on the phone and sent later."],
    [<PencilLine key="p" size={22} color={color.maroon} />, "Change any answer until you hand in. Nothing is shown until results."],
    // Said BEFORE the paper, on purpose: a child told up front has been
    // treated fairly; one caught by a rule they never heard of has not.
    [<EyeOff key="e" size={22} color={color.maroon} />, "Stay on the paper. Each time you leave it for another app, your invigilator sees it."],
  ];
  return (
    <Card>
      <Text style={[kit.label, { marginBottom: 10 }]}>Five things to know</Text>
      <View style={{ gap: 12 }}>
        {rows.map(([icon, line]) => (
          <View key={line} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <View style={s.ruleIcon}>{icon}</View>
            <Text style={[kit.line, { flex: 1, color: color.ink, fontSize: 14 }]}>{line}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

export function PaperHero({ eyebrow = "Students Evaluation Test 2026", name, startsAt, minutes }: { eyebrow?: string; name: string; startsAt?: string; minutes?: number }) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={[color.maroon, color.maroonDeep]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={[s.hero, { paddingTop: insets.top + 18 }]}>
      <Image source={require("@/assets/images/kids-icon.png")} style={s.crest} />
      <Text style={s.eyebrow}>{eyebrow}</Text>
      <Text style={s.heroName} accessibilityRole="header">
        {name}
      </Text>
      {startsAt ? (
        <View style={{ flexDirection: "row", gap: 22, marginTop: 14 }}>
          <Fact label="Date" value={ist(startsAt, { day: "numeric", month: "short", year: "numeric" })} />
          <Fact label="Time" value={ist(startsAt, { hour: "numeric", minute: "2-digit" })} />
          {minutes ? <Fact label="Length" value={`${minutes} min`} /> : null}
        </View>
      ) : null}
    </LinearGradient>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={s.factLabel}>{label}</Text>
      <Text style={s.factValue}>{value}</Text>
    </View>
  );
}

/** Days, hours, minutes to a moment, on the server's clock. */
export function OpensIn({ at, serverNowIso, label = "Opens in" }: { at: string; serverNowIso: string; label?: string }) {
  const left = useServerCountdown(at, serverNowIso);
  return (
    <Card tone="gold" style={{ alignItems: "center" }}>
      <Text style={kit.label}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 14, marginTop: 8 }} accessibilityRole="timer">
        {left.days > 0 ? <Unit n={String(left.days)} u="d" /> : null}
        <Unit n={pad2(left.hours)} u="h" />
        <Unit n={pad2(left.minutes)} u="m" />
        {left.days === 0 ? <Unit n={pad2(left.seconds)} u="s" /> : null}
      </View>
    </Card>
  );
}

function Unit({ n, u }: { n: string; u: string }) {
  return (
    <Text style={s.unit}>
      {n}
      <Text style={s.unitU}>{u}</Text>
    </Text>
  );
}

export function CentreCard({ name, note }: { name: string; note?: string }) {
  return (
    <Card style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <MapPin size={20} color={color.maroon} />
      <View style={{ flex: 1 }}>
        <Text style={kit.label}>Your centre</Text>
        <Text style={[kit.h, { marginTop: 3 }]}>{name}</Text>
        {note ? <Text style={kit.line}>{note}</Text> : null}
      </View>
    </Card>
  );
}

export function WaitingRoom({ name, startsAtIso, serverNowIso, centre }: { name: string; startsAtIso: string; serverNowIso: string; centre: string }) {
  const left = useServerCountdown(startsAtIso, serverNowIso);
  const h = left.totalHours;
  return (
    <View style={{ flex: 1, backgroundColor: color.cream }}>
      <PaperHero eyebrow="Waiting room" name={name} />
      <View style={{ padding: 20, alignItems: "center", gap: 12 }}>
        <Text style={kit.label}>Starts in</Text>
        <Text style={s.waitClock} accessibilityRole="timer">
          {h > 0 ? `${h}:` : ""}
          {pad2(left.minutes)}:{pad2(left.seconds)}
        </Text>
        <View style={s.tealChip}>
          <Check size={15} color={color.teal} />
          <Text style={s.tealChipText}>Checked in · {centre}</Text>
        </View>
        <Text style={[kit.line, { textAlign: "center", fontSize: 14 }]}>
          Keep your phone on this screen.{"\n"}
          <Text style={{ fontFamily: font.bodyBold, color: color.ink }}>The paper opens once only.</Text>
        </Text>
      </View>
    </View>
  );
}

export function StartFace({
  name,
  busy,
  resuming,
  error,
  onStart,
  questionCount,
  closes,
}: {
  name: string;
  busy: boolean;
  resuming: boolean;
  error: string;
  onStart: () => void;
  questionCount: number;
  closes: string;
}) {
  const refused = /another phone/i.test(error);
  return (
    <View style={{ flex: 1, backgroundColor: color.cream }}>
      <PaperHero eyebrow={resuming ? "Your paper is waiting" : "The paper is open"} name={name} />
      <View style={{ padding: 16, gap: 14 }}>
        {error ? (
          <Note icon={refused ? <Smartphone size={20} color={color.maroonDeep} /> : <WifiOff size={20} color={color.maroon} />} gold={refused}>
            <Text style={kit.h}>{refused ? "Your paper is on another phone" : "That did not open"}</Text>
            <Text style={kit.line}>{refused ? "Ask the invigilator to move it to this one." : error}</Text>
          </Note>
        ) : null}
        <Card style={{ alignItems: "center" }}>
          <Text style={s.big}>{questionCount}</Text>
          <Text style={kit.line}>questions · everyone ends at {closes}</Text>
        </Card>
        <Text style={[kit.line, { textAlign: "center", fontFamily: font.bodyBold, color: color.ink }]}>The paper opens once only.</Text>
        <Btn label={busy ? "Opening" : error ? "Try again" : resuming ? "Carry on" : "Start"} busy={busy} onPress={onStart} />
      </View>
    </View>
  );
}

export function HandingIn({ visible }: { visible: boolean }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={s.handing}>
        <View style={s.handingCard} accessibilityRole="alert">
          <ActivityIndicator color={color.gold} size="large" />
          <Text style={s.handingTitle}>Handing in…</Text>
          <Text style={kit.line}>Do not close the app.</Text>
        </View>
      </View>
    </Modal>
  );
}

/**
 * "Answers received". Built like KIDS collateral — gold frame, maroon band —
 * because a child will screenshot it and send it home. No score, ever.
 */
export function Receipt({ paper, receipt, handedInIso, answered, total, centre }: { paper: string; receipt: string | null; handedInIso: string; answered: number; total: number; centre?: string }) {
  return (
    <View style={s.receipt}>
      <LinearGradient colors={[color.maroon, color.maroonDeep]} style={s.receiptBand}>
        <Image source={require("@/assets/images/kids-icon.png")} style={s.crest} />
        <View style={s.receiptTick}>
          <Check size={28} color={color.maroonDeep} />
        </View>
        <Text style={s.receiptTitle}>Answers received</Text>
        <Text style={{ fontFamily: font.body, fontSize: 13.5, color: color.goldLight }}>Locked and safe.</Text>
      </LinearGradient>
      <View style={{ padding: 18, gap: 10 }}>
        {receipt ? (
          <View style={{ alignItems: "center" }}>
            <Text style={kit.label}>Receipt number</Text>
            <Text style={s.receiptCode} selectable>
              {receipt}
            </Text>
          </View>
        ) : null}
        <View style={{ height: 1, backgroundColor: color.creamMuted, marginVertical: 4 }} />
        <Row k="Paper" v={paper} />
        <Row k="Handed in" v={ist(handedInIso, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} />
        {total > 0 ? (
          <>
            <Row k="Answered" v={`${answered} of ${total}`} />
            <Row k="Left blank" v={String(total - answered)} />
          </>
        ) : null}
        {centre ? <Row k="Centre" v={centre} /> : null}
        <Text style={[kit.line, { textAlign: "center", marginTop: 6 }]}>Results are published by the KIDS office. Nothing is shown until then.</Text>
      </View>
    </View>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Text style={kit.line}>{k}</Text>
      <Text style={[kit.h, { fontSize: 14, flexShrink: 1, textAlign: "right" }]}>{v}</Text>
    </View>
  );
}

/** Every paper handed in through the app, each with its receipt. */
export function PapersSat({ rows }: { rows: { name: string; receipt: string; submitted_at: string }[] }) {
  if (!rows.length) return null;
  return (
    <View style={{ gap: 8 }}>
      <Text style={kit.label}>Papers you have sat</Text>
      {rows.map((r) => (
        <View key={r.receipt} style={kit.row}>
          <View style={kit.rowIcon}>
            <ReceiptText size={20} color={color.maroon} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={kit.rowTitle}>{r.name}</Text>
            <Text style={[kit.rowLine, { fontVariant: ["tabular-nums"] }]}>{r.receipt}</Text>
          </View>
          <Text style={[kit.meta, { textAlign: "right" }]}>
            {ist(r.submitted_at, { day: "numeric", month: "short" })}
            {"\n"}
            {ist(r.submitted_at, { year: "numeric" })}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function ClosedNote({ started }: { started: boolean }) {
  return (
    <Note icon={<DoorClosed size={20} color={color.inkMuted} />}>
      <Text style={kit.h}>This paper has closed</Text>
      <Text style={kit.line}>{started ? "Your receipt is below." : "You did not start it. Nothing is on your record for it."}</Text>
    </Note>
  );
}

function Note({ icon, children, gold }: { icon: ReactNode; children: ReactNode; gold?: boolean }) {
  return (
    <View style={s.note}>
      <View style={[s.noteIcon, gold && { backgroundColor: color.goldWash }]}>{icon}</View>
      <View style={{ flex: 1, gap: 2 }}>{children}</View>
    </View>
  );
}

/**
 * Choose your subjects — for a set with optional subjects. Shown once, as the
 * paper opens, before any question. Two taps on purpose: pick, then confirm,
 * because the server fixes the choice the moment it is sent.
 */
export function ChooseSubjects({
  paperLine,
  choose,
  optional,
  compulsory,
  error,
  onConfirm,
  closes,
  deadlineIso,
  serverNowIso,
}: {
  paperLine: string;
  choose: number;
  optional: { name: string; count: number }[];
  compulsory: { name: string; count: number }[];
  error: string;
  onConfirm: (subjects: string[]) => Promise<void>;
  closes: string;
  deadlineIso: string;
  serverNowIso: string;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const full = picked.length === choose;
  const toggle = (n: string) => setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : p.length < choose ? [...p, n] : p));
  // In the set's order, not the order they were tapped.
  const ordered = optional.map((o) => o.name).filter((n) => picked.includes(n));
  const total = compulsory.reduce((a, c) => a + c.count, 0) + optional.filter((o) => picked.includes(o.name)).reduce((a, o) => a + o.count, 0);
  const named = compulsory.filter((c) => c.name).map((c) => c.name);

  const send = async () => {
    setBusy(true);
    await onConfirm(ordered);
    setBusy(false);
  };

  const band = (title: string, sub?: string) => <ChooseBand line={paperLine} title={title} sub={sub} deadlineIso={deadlineIso} serverNowIso={serverNowIso} />;

  if (error && confirming) {
    return (
      <View style={{ flex: 1, backgroundColor: color.cream }}>
        {band(`Your ${choose} subjects`)}
        <View style={{ padding: 20, alignItems: "center", gap: 12 }}>
          <WifiOff size={34} color={color.maroon} />
          <Text style={[kit.h, { textAlign: "center" }]}>That did not go through — check your signal</Text>
          <Text style={[kit.line, { textAlign: "center" }]}>{error}</Text>
          <View style={{ alignSelf: "stretch" }}>
            <Btn label={busy ? "Trying" : "Try again"} busy={busy} onPress={send} />
          </View>
        </View>
      </View>
    );
  }

  if (confirming) {
    return (
      <View style={{ flex: 1, backgroundColor: color.cream }}>
        {band(`Your ${choose} subjects`)}
        <View style={{ padding: 20, gap: 10, flex: 1 }}>
          {ordered.map((n) => (
            <Text key={n} style={[kit.h, { fontSize: 18 }]}>
              {n}
            </Text>
          ))}
          <Text style={[kit.line, { marginTop: 8, fontSize: 14 }]}>
            These cannot be changed once you start. You will answer <Text style={{ fontFamily: font.bodyBold, color: color.ink }}>{total} questions</Text>.
          </Text>
        </View>
        <View style={s.chooseFoot}>
          <View style={{ flex: 1 }}>
            <Btn label="Change" kind="outline" disabled={busy} onPress={() => setConfirming(false)} />
          </View>
          <View style={{ flex: 1.6 }}>
            <Btn label={busy ? "Opening" : "Start with these"} busy={busy} onPress={send} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.cream }}>
      {band(`Choose ${choose} subject${choose === 1 ? "" : "s"}`, `${named.length ? `Everyone answers ${named.join(" and ")}. ` : ""}Your time is running; everyone ends at ${closes}.`)}
      <View style={{ padding: 16, gap: 10, flex: 1 }}>
        {optional.map((o) => {
          const on = picked.includes(o.name);
          return (
            <Pressable
              key={o.name}
              onPress={() => toggle(o.name)}
              disabled={!on && full}
              style={[s.subject, on && s.subjectOn, !on && full && { opacity: 0.5 }]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <View style={{ flex: 1 }}>
                <Text style={kit.h}>{o.name}</Text>
                <Text style={kit.line}>{o.count} questions</Text>
              </View>
              {on ? (
                <View style={s.subjectTick}>
                  <Check size={16} color={color.white} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <View style={s.chooseFoot}>
        <View style={{ flex: 1 }}>
          <Btn label={full ? "Continue" : `Choose ${choose - picked.length} more`} disabled={!full} onPress={() => setConfirming(true)} />
        </View>
      </View>
    </View>
  );
}

function ChooseBand({ line, title, sub, deadlineIso, serverNowIso }: { line: string; title: string; sub?: string; deadlineIso: string; serverNowIso: string }) {
  const insets = useSafeAreaInsets();
  const left = useServerCountdown(deadlineIso, serverNowIso);
  const secs = Math.floor(left.total / 1000);
  return (
    <LinearGradient colors={[color.maroon, color.maroonDeep]} style={[s.band, { paddingTop: insets.top + 12 }]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
        <Text style={[s.eyebrow, { flex: 1 }]}>{line}</Text>
        <Text style={s.bandClock} accessibilityRole="timer" accessibilityLabel="Time left">
          {Math.floor(secs / 60)}:{pad2(secs % 60)}
        </Text>
      </View>
      <Text style={s.heroName}>{title}</Text>
      {sub ? <Text style={[s.eyebrow, { color: color.cream, opacity: 0.85, marginTop: 6 }]}>{sub}</Text> : null}
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  ruleIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: color.maroonWash, alignItems: "center", justifyContent: "center" },
  hero: { paddingHorizontal: 20, paddingBottom: 22, overflow: "hidden" },
  crest: { position: "absolute", right: -18, top: -10, width: 120, height: 120, opacity: 0.1 },
  eyebrow: { fontFamily: font.body, fontSize: 13, color: color.goldLight },
  heroName: { fontFamily: font.display, fontSize: 26, lineHeight: 31, color: color.cream, marginTop: 4 },
  factLabel: { fontFamily: font.body, fontSize: 11, color: color.goldLight, textTransform: "uppercase", letterSpacing: 1 },
  factValue: { fontFamily: font.bodySemibold, fontSize: 15, color: color.cream, marginTop: 2 },
  unit: { fontFamily: font.display, fontSize: 34, color: color.maroon, fontVariant: ["tabular-nums"] },
  unitU: { fontFamily: font.body, fontSize: 14, color: color.inkMuted },
  waitClock: { fontFamily: font.display, fontSize: 64, color: color.maroon, fontVariant: ["tabular-nums"] },
  tealChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#E3F3F0", borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
  tealChipText: { fontFamily: font.bodySemibold, fontSize: 13, color: "#0D5248" },
  big: { fontFamily: font.display, fontSize: 48, color: color.maroon, fontVariant: ["tabular-nums"] },
  handing: { flex: 1, backgroundColor: "rgba(43,26,28,0.7)", alignItems: "center", justifyContent: "center", padding: 30 },
  handingCard: { backgroundColor: color.cream, borderRadius: radius.xl, padding: 28, alignItems: "center", gap: 10, alignSelf: "stretch" },
  handingTitle: { fontFamily: font.display, fontSize: 22, color: color.ink },
  receipt: { borderWidth: 2, borderColor: color.gold, borderRadius: radius.xl, overflow: "hidden", backgroundColor: color.white },
  receiptBand: { alignItems: "center", paddingVertical: 22, gap: 6, overflow: "hidden" },
  receiptTick: { width: 54, height: 54, borderRadius: 27, backgroundColor: color.gold, alignItems: "center", justifyContent: "center" },
  receiptTitle: { fontFamily: font.display, fontSize: 24, color: color.cream },
  receiptCode: { fontFamily: font.bodyBold, fontSize: 26, letterSpacing: 2, color: color.maroon, marginTop: 4, fontVariant: ["tabular-nums"] },
  note: { flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: color.white, borderWidth: 1, borderColor: color.creamMuted, borderRadius: radius.lg, padding: 14 },
  noteIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: color.creamSurface, alignItems: "center", justifyContent: "center" },
  subject: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, padding: 14, backgroundColor: color.white, borderWidth: 1.5, borderColor: color.creamMuted, borderRadius: radius.lg },
  subjectOn: { borderColor: color.maroon, backgroundColor: color.maroonWash },
  subjectTick: { width: 28, height: 28, borderRadius: 14, backgroundColor: color.maroon, alignItems: "center", justifyContent: "center" },
  chooseFoot: { flexDirection: "row", gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: color.creamMuted, backgroundColor: color.white },
  band: { paddingHorizontal: 20, paddingBottom: 18 },
  bandClock: { fontFamily: font.bodyBold, fontSize: 16, color: color.gold, fontVariant: ["tabular-nums"] },
});

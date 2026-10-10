import { useEffect, useRef, useState, type ReactNode } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, ChevronLeft, Flag, LayoutGrid, Maximize2, RotateCcw, WifiOff, X } from "lucide-react-native";
import { Btn, s as kit } from "@/components/kit";
import { API_URL } from "@/lib/api";
import { useServerCountdown } from "@/lib/clock";
import { readJson, writeJson } from "@/lib/store";
import { color, font, radius } from "@/theme";

/**
 * The live paper — the website's AppPaper (redesign board 04, state 5),
 * natively. One question at a time, a navigator grid, a flag, and a review
 * before handing in. Nothing moves but the clock; there is no verdict and no
 * colour of judgement anywhere on it.
 *
 * Purely presentational: it owns no answers, no clock and no network. The only
 * things it keeps for itself are which question is on screen and which are
 * flagged, on this phone, so a reopened app returns to "You were on question 34".
 */
export type Question = { q: string; context?: string; options: string[]; section?: string; image?: string; optionImages?: (string | null)[] };
export type Save = "saved" | "saving" | "offline";

const LETTERS = ["A", "B", "C", "D", "E", "F"];
/** Diagrams are served by the website once the paper has started; public and cached. */
export const imageUrl = (id: string) => `${API_URL}/api/exam-image/${id}`;

export default function AppPaper({
  questions,
  answers,
  onChoose,
  onSubmit,
  clock,
  deadlineIso,
  serverNowIso,
  save,
  resumed,
  storageKey,
}: {
  questions: Question[];
  answers: (number | null)[];
  onChoose: (question: number, option: number) => void;
  onSubmit: () => void;
  /** The ticking clock. A slot, so it re-renders itself and not the paper. */
  clock: ReactNode;
  deadlineIso: string;
  serverNowIso: string;
  save: Save;
  resumed: boolean;
  storageKey: string;
}) {
  const insets = useSafeAreaInsets();
  const total = questions.length;
  const [at, setAt] = useState(() => {
    const n = Number(readJson<number>(`${storageKey}:at`));
    return Number.isInteger(n) && n >= 0 && n < total ? n : 0;
  });
  const [flags, setFlags] = useState<number[]>(() => {
    const f = readJson<number[]>(`${storageKey}:flags`);
    return Array.isArray(f) ? f.filter((x) => Number.isInteger(x)) : [];
  });
  const [view, setView] = useState<"question" | "grid" | "review">("question");
  const [zoom, setZoom] = useState<string | null>(null);
  const [welcome, setWelcome] = useState(resumed);
  const [resumedAt] = useState(at);
  const scroller = useRef<ScrollView>(null);

  useEffect(() => writeJson(`${storageKey}:at`, at), [storageKey, at]);
  useEffect(() => writeJson(`${storageKey}:flags`, flags), [storageKey, flags]);

  const q = questions[at];
  const answered = answers.filter((a) => a !== null).length;
  const blank = total - answered;
  const flagged = flags.length;

  const go = (i: number) => {
    setAt(Math.max(0, Math.min(total - 1, i)));
    setView("question");
    setWelcome(false);
    scroller.current?.scrollTo({ y: 0, animated: false });
  };
  const toggleFlag = () => setFlags((f) => (f.includes(at) ? f.filter((x) => x !== at) : [...f, at].sort((a, b) => a - b)));

  // Sections, if the paper carries them: consecutive runs of the same name.
  const sections: { name: string | null; from: number; to: number }[] = [];
  questions.forEach((question, i) => {
    const name = question.section ?? null;
    const last = sections[sections.length - 1];
    if (last && last.name === name) last.to = i;
    else sections.push({ name, from: i, to: i });
  });
  const mine = sections.find((x) => at >= x.from && at <= x.to);
  const sectionIndex = mine ? sections.indexOf(mine) + 1 : 0;

  const bar = (
    <View style={[s.bar, { paddingTop: insets.top + 6 }]}>
      {view === "review" ? (
        <Pressable onPress={() => setView("question")} style={s.icon} accessibilityLabel="Back to the paper">
          <ArrowLeft size={22} color={color.cream} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={s.barLabel}>{view === "review" ? "Before you hand in" : "Time left"}</Text>
        {clock}
      </View>
      {view === "question" ? (
        <View style={{ alignItems: "flex-end" }}>
          <Text style={s.where}>
            Q {at + 1} of {total}
          </Text>
          <Text style={[s.save, save === "offline" && { color: color.goldLight }]}>{save === "offline" ? "Kept on phone" : save === "saving" ? "Sending" : "Saved"}</Text>
        </View>
      ) : null}
      {view !== "review" ? (
        <Pressable onPress={() => setView(view === "grid" ? "question" : "grid")} style={s.icon} accessibilityLabel={view === "grid" ? "Close the question list" : "All questions"}>
          {view === "grid" ? <X size={22} color={color.cream} /> : <LayoutGrid size={22} color={color.cream} />}
        </Pressable>
      ) : null}
    </View>
  );

  if (view === "review") {
    return (
      <View style={s.frame}>
        {bar}
        <View style={{ padding: 16, gap: 16 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Count n={answered} label="answered" />
            <Count n={blank} label="left blank" tone="blank" />
            <Count n={flagged} label="flagged" tone="flag" />
          </View>
          <Text style={[kit.line, { fontSize: 15, color: color.ink }]}>
            Once you hand in, <Text style={{ fontFamily: font.bodyBold }}>you cannot come back</Text>. <MinutesLeft deadlineIso={deadlineIso} serverNowIso={serverNowIso} />
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Btn label="Keep working" kind="outline" onPress={() => setView(blank > 0 ? "grid" : "question")} />
            </View>
            <View style={{ flex: 1 }}>
              <Btn label="Hand in" onPress={onSubmit} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (view === "grid") {
    return (
      <View style={s.frame}>
        {bar}
        <View style={s.legend}>
          <Legend kind="done" label={`Answered ${answered}`} />
          <Legend kind="blank" label={`Blank ${blank}`} />
          <Legend kind="flag" label={`Flagged ${flagged}`} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          {sections.map((sec, n) => (
            <View key={sec.from} style={{ gap: 8 }}>
              {sec.name ? (
                <Text style={kit.label}>
                  Section {n + 1} · {sec.name} · {sec.to - sec.from + 1}
                </Text>
              ) : null}
              <View style={s.grid}>
                {questions.slice(sec.from, sec.to + 1).map((_, k) => {
                  const i = sec.from + k;
                  const kind = flags.includes(i) ? "flag" : answers[i] !== null ? "done" : "blank";
                  return (
                    <Pressable
                      key={i}
                      onPress={() => go(i)}
                      style={[s.cell, kind === "done" && s.cellDone, kind === "flag" && s.cellFlag, i === at && s.cellHere]}
                      accessibilityLabel={`Question ${i + 1}, ${kind === "flag" ? "flagged" : kind === "done" ? "answered" : "blank"}`}
                    >
                      <Text style={[s.cellN, kind === "done" && { color: color.cream }]}>{i + 1}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={[s.foot, { paddingBottom: insets.bottom + 12 }]}>
          <Btn label="Hand in the paper" kind="outline" onPress={() => setView("review")} />
        </View>
      </View>
    );
  }

  const allPictures = q.options.length > 1 && q.options.every((_, i) => q.optionImages?.[i]);

  return (
    <View style={s.frame}>
      {bar}
      {mine?.name ? (
        <View style={s.strip}>
          <Text style={kit.label}>
            Section {sectionIndex} · {mine.name}
          </Text>
          <Text style={kit.meta}>{mine.to - mine.from + 1} q</Text>
        </View>
      ) : null}

      <ScrollView ref={scroller} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        {save === "offline" ? (
          <View style={[s.note, { backgroundColor: color.goldWash, borderColor: color.goldLight }]} accessibilityRole="alert">
            <WifiOff size={18} color={color.maroonDeep} />
            <View style={{ flex: 1 }}>
              <Text style={kit.h}>No signal — answers kept on this phone</Text>
              <Text style={kit.line}>Keep answering. The server’s clock still counts.</Text>
            </View>
          </View>
        ) : null}
        {welcome ? (
          <View style={[s.note, { backgroundColor: "#E3F3F0", borderColor: "#B7DED5" }]}>
            <RotateCcw size={18} color="#0D5248" />
            <View style={{ flex: 1 }}>
              <Text style={kit.h}>Welcome back — your answers are still here</Text>
              <Text style={kit.line}>You were on question {resumedAt + 1}. The clock kept running.</Text>
            </View>
          </View>
        ) : null}

        {q.context ? <Text style={s.context}>{q.context}</Text> : null}
        <Text style={s.stem}>{q.q}</Text>
        {q.image ? (
          <Pressable onPress={() => setZoom(q.image!)} style={s.figure} accessibilityLabel="Open the diagram full screen">
            <Image source={{ uri: imageUrl(q.image) }} style={{ width: "100%", height: 200 }} resizeMode="contain" accessibilityLabel={`Diagram for question ${at + 1}`} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-end" }}>
              <Maximize2 size={13} color={color.inkMuted} />
              <Text style={kit.meta}>Tap to enlarge</Text>
            </View>
          </Pressable>
        ) : null}

        {/* Every option a picture: a 2 × 2 grid of figures, board 17 A6. */}
        <View style={allPictures ? { flexDirection: "row", flexWrap: "wrap", gap: 10 } : { gap: 10 }} accessibilityLabel={`Question ${at + 1} options`}>
          {q.options.map((option, i) => {
            const picked = answers[at] === i;
            const img = q.optionImages?.[i];
            return (
              <Pressable
                key={i}
                onPress={() => onChoose(at, i)}
                accessibilityRole="button"
                accessibilityState={{ selected: picked }}
                style={[s.opt, picked && s.optOn, allPictures && { width: "48%", flexDirection: "column", alignItems: "stretch" }]}
              >
                <View style={[s.mark, picked && { backgroundColor: color.maroon }]}>
                  <Text style={[s.letter, picked && { color: color.cream }]}>{LETTERS[i]}</Text>
                </View>
                <View style={{ flex: allPictures ? undefined : 1, gap: 6 }}>
                  {img ? <Image source={{ uri: imageUrl(img) }} style={{ width: "100%", height: 110 }} resizeMode="contain" accessibilityLabel={`Option ${LETTERS[i]}`} /> : null}
                  {option ? <Text style={s.optText}>{option}</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[s.controls, { paddingBottom: insets.bottom + 10 }]}>
        <Pressable onPress={toggleFlag} style={[s.square, flags.includes(at) && s.squareOn]} accessibilityState={{ selected: flags.includes(at) }} accessibilityLabel={flags.includes(at) ? "Remove the flag" : "Flag this question"}>
          <Flag size={22} color={flags.includes(at) ? color.maroonDeep : color.maroon} />
        </Pressable>
        <Pressable onPress={() => at !== 0 && go(at - 1)} accessibilityState={{ disabled: at === 0 }} style={[s.square, at === 0 && { opacity: 0.4 }]} accessibilityLabel="Previous question">
          <ChevronLeft size={24} color={color.maroon} />
        </Pressable>
        <View style={{ flex: 1 }}>{at === total - 1 ? <Btn label="Hand in" onPress={() => setView("review")} /> : <Btn label="Next" onPress={() => go(at + 1)} />}</View>
      </View>

      <Modal visible={zoom !== null} animationType="fade" onRequestClose={() => setZoom(null)}>
        <View style={{ flex: 1, backgroundColor: color.ink, paddingTop: insets.top }}>
          <Pressable onPress={() => setZoom(null)} style={[s.icon, { alignSelf: "flex-end", margin: 8 }]} accessibilityLabel="Close the diagram">
            <X size={24} color={color.cream} />
          </Pressable>
          {/* A scroller, not a pinch: the picture large, moved with a finger. */}
          <ScrollView horizontal contentContainerStyle={{ alignItems: "center" }}>
            <ScrollView contentContainerStyle={{ justifyContent: "center", flexGrow: 1 }}>
              {zoom ? <Image source={{ uri: imageUrl(zoom) }} style={{ width: 720, height: 720 }} resizeMode="contain" accessibilityLabel="Diagram, full size" /> : null}
            </ScrollView>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function Count({ n, label, tone }: { n: number; label: string; tone?: "blank" | "flag" }) {
  return (
    <View style={[s.count, tone === "blank" && { backgroundColor: color.creamSurface }, tone === "flag" && { backgroundColor: color.goldWash, borderColor: color.goldLight }]}>
      <Text style={s.countN}>{n}</Text>
      <Text style={kit.meta}>{label}</Text>
    </View>
  );
}

function Legend({ kind, label }: { kind: "done" | "blank" | "flag"; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={[s.key, kind === "done" && s.cellDone, kind === "flag" && s.cellFlag]} />
      <Text style={kit.meta}>{label}</Text>
    </View>
  );
}

function MinutesLeft({ deadlineIso, serverNowIso }: { deadlineIso: string; serverNowIso: string }) {
  const left = useServerCountdown(deadlineIso, serverNowIso);
  const minutes = Math.max(0, Math.floor(left.total / 60000));
  return (
    <Text>
      You still have {minutes} minute{minutes === 1 ? "" : "s"}.
    </Text>
  );
}

/** The hall clock, big and plain. Urgency is a colour of the digits, never a flash. */
export function AppClockFace({ seconds }: { seconds: number }) {
  const sec = Math.max(0, seconds);
  const h = Math.floor(sec / 3600);
  const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  const last = sec <= 300;
  return (
    <Text accessibilityRole="timer" accessibilityLabel={last ? "Five minutes left" : "Time left"} style={[s.clock, last && { color: color.gold, fontSize: 30 }]}>
      {h > 0 ? `${h}:` : ""}
      {mm}:{ss}
    </Text>
  );
}

const s = StyleSheet.create({
  frame: { flex: 1, backgroundColor: color.cream },
  bar: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: color.maroonDeep, paddingHorizontal: 12, paddingBottom: 10 },
  barLabel: { fontFamily: font.body, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: color.goldLight },
  clock: { fontFamily: font.bodyBold, fontSize: 24, color: color.cream, fontVariant: ["tabular-nums"] },
  where: { fontFamily: font.bodySemibold, fontSize: 14, color: color.cream, fontVariant: ["tabular-nums"] },
  save: { fontFamily: font.body, fontSize: 11.5, color: "#9FDCCB" },
  icon: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  strip: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: color.creamSurface, borderBottomWidth: 1, borderBottomColor: color.creamMuted },
  note: { flexDirection: "row", gap: 10, alignItems: "flex-start", borderWidth: 1, borderRadius: radius.lg, padding: 12 },
  context: { fontFamily: font.body, fontSize: 14, lineHeight: 21, color: color.inkMuted, backgroundColor: color.creamSurface, padding: 12, borderRadius: radius.md },
  stem: { fontFamily: font.bodySemibold, fontSize: 19, lineHeight: 27, color: color.ink },
  figure: { backgroundColor: color.white, borderWidth: 1, borderColor: color.creamMuted, borderRadius: radius.md, padding: 8, gap: 4 },
  opt: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: color.white, borderWidth: 1.5, borderColor: color.creamMuted, borderRadius: radius.lg },
  optOn: { borderColor: color.maroon, backgroundColor: color.maroonWash },
  mark: { width: 34, height: 34, borderRadius: 17, backgroundColor: color.creamSurface, alignItems: "center", justifyContent: "center" },
  letter: { fontFamily: font.bodyBold, fontSize: 15, color: color.maroon },
  optText: { fontFamily: font.body, fontSize: 16, lineHeight: 22, color: color.ink },
  controls: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: color.creamMuted, backgroundColor: color.white },
  square: { width: 56, height: 56, borderRadius: radius.lg, borderWidth: 1.5, borderColor: color.creamMuted, alignItems: "center", justifyContent: "center", backgroundColor: color.white },
  squareOn: { backgroundColor: color.gold, borderColor: color.gold },
  legend: { flexDirection: "row", gap: 16, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: color.white, borderBottomWidth: 1, borderBottomColor: color.creamMuted },
  key: { width: 14, height: 14, borderRadius: 4, borderWidth: 1.5, borderColor: color.dash, backgroundColor: color.white },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cell: { width: 52, height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: color.dash, backgroundColor: color.white, alignItems: "center", justifyContent: "center" },
  cellDone: { backgroundColor: color.maroon, borderColor: color.maroon },
  cellFlag: { backgroundColor: color.goldWash, borderColor: color.gold },
  cellHere: { borderWidth: 3, borderColor: color.ink },
  cellN: { fontFamily: font.bodySemibold, fontSize: 15, color: color.ink, fontVariant: ["tabular-nums"] },
  foot: { padding: 16, borderTopWidth: 1, borderTopColor: color.creamMuted, backgroundColor: color.white },
  count: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 14, backgroundColor: color.white, borderWidth: 1, borderColor: color.creamMuted, borderRadius: radius.lg },
  countN: { fontFamily: font.display, fontSize: 30, color: color.ink, fontVariant: ["tabular-nums"] },
});

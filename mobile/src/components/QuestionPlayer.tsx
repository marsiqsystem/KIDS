import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, CloudCheck, Lightbulb, RotateCcw, WifiOff, X } from "lucide-react-native";
import { Btn, s as kit } from "@/components/kit";
import { useSession } from "@/lib/session";
import { color, font, radius } from "@/theme";

/**
 * The question player — the website's QuestionPlayer (board 02, 2B–2D),
 * natively.
 *
 * The cards arrive WITHOUT their answers. Tapping an option posts it, the
 * server writes it down and only then says what was right. So the key is never
 * on the phone until the child has committed.
 *
 * Correct is teal with a star; wrong reveals the key in teal and marks the
 * chosen row in maroon wash — no red, no shake — and the "Why" sheet rises by
 * itself, because that is the moment the explanation is for.
 */

export type PlayCard = {
  id: string;
  stem: string;
  context: string | null;
  options: string[];
  chapter: string | null;
  section: string;
  hue: string;
  seen: { lastAnsweredAt: string; wasCorrect: boolean; chosen: number | null } | null;
};

export type Verdict = {
  correct: boolean;
  answerIndex: number;
  whyCorrect: string | null;
  whyWrong: Record<string, string>;
  days: number;
  previousChoice: number | null;
  previouslyWrong: boolean;
};

const LETTERS = ["A", "B", "C", "D", "E"];
const BENGALI = /[ঀ-৿]/;

export default function QuestionPlayer({
  cards,
  startAt,
  answerPath,
  daily,
  onDone,
  onLeave,
}: {
  cards: PlayCard[];
  startAt: number;
  /** The API path that marks an answer: /set or /learn/<key>/practice. */
  answerPath: string;
  /** Today's five shows New / Again; a chapter's practice does not. */
  daily: boolean;
  onDone: () => void;
  onLeave: () => void;
}) {
  const { call } = useSession();
  const insets = useSafeAreaInsets();
  const first = Math.min(startAt, Math.max(cards.length - 1, 0));
  const [at, setAt] = useState(first);
  const [chosen, setChosen] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  // What each question came to, for the dots across the top. The ones answered
  // before this visit are unknown here and simply show as done.
  const [results, setResults] = useState<Record<number, boolean>>({});
  const [why, setWhy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const card = cards[at];
  const last = at === cards.length - 1;

  async function commit(option: number) {
    if (verdict || pending) return;
    setChosen(option);
    setFailed(null);
    setPending(true);
    try {
      const res = await call<{ ok: boolean; verdict?: Verdict; message?: string }>(answerPath, {
        method: "POST",
        body: { id: card.id, chosen: option },
      });
      if (!res.ok || !res.verdict) {
        setChosen(null);
        setFailed(res.message ?? "That answer was not taken.");
        return;
      }
      setVerdict(res.verdict);
      setResults((r) => ({ ...r, [at]: res.verdict!.correct }));
      if (!res.verdict.correct) setWhy(true);
    } catch {
      // The answer did not reach KIDS. Say so and let them tap again rather
      // than pretending it landed — this is a phone on a school's 3G.
      setChosen(null);
      setFailed("Not sent. Check signal, tap again.");
    } finally {
      setPending(false);
    }
  }

  function next() {
    setWhy(false);
    if (last) {
      onDone();
      return;
    }
    setAt((i) => i + 1);
    setChosen(null);
    setVerdict(null);
    setFailed(null);
  }

  if (!card) {
    return (
      <View style={[styles.frame, { paddingTop: insets.top + 24, padding: 16, gap: 14 }]}>
        <Text style={kit.line}>No questions left here.</Text>
        <Btn label="Back" kind="outline" onPress={onLeave} />
      </View>
    );
  }

  const repeatedMistake = verdict && !verdict.correct && verdict.previousChoice === chosen && verdict.previouslyWrong;

  return (
    <View style={styles.frame}>
      <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
        <View style={styles.top}>
          <Pressable onPress={onLeave} style={styles.leave} accessibilityLabel="Leave — your answers are kept" hitSlop={6}>
            <X size={24} color={color.ink} />
          </Pressable>
          <View style={styles.dots}>
            {cards.map((c, i) => {
              const r = results[i];
              const kind = i === at && !verdict ? "here" : r === true ? "right" : r === false ? "wrong" : i < first ? "done" : "todo";
              return (
                <View
                  key={c.id}
                  style={[
                    styles.dot,
                    kind === "here" && { backgroundColor: color.maroon, flex: 1.6 },
                    kind === "right" && { backgroundColor: color.teal },
                    kind === "wrong" && { backgroundColor: color.maroonTint },
                    kind === "done" && { backgroundColor: color.inkFaint },
                  ]}
                />
              );
            })}
          </View>
          <Text style={styles.count}>
            {at + 1}/{cards.length}
          </Text>
        </View>
        <View style={styles.chips}>
          {daily ? (
            card.seen ? (
              <Text style={[styles.chip, { backgroundColor: color.goldWash, color: color.maroonDeep }]}>Again</Text>
            ) : (
              <Text style={[styles.chip, { backgroundColor: color.newWash, color: color.royalBlue }]}>New</Text>
            )
          ) : null}
          <Text style={[styles.chip, { backgroundColor: card.hue, color: color.white }]}>{card.section}</Text>
          {card.chapter ? (
            <Text style={styles.chapter} numberOfLines={1}>
              {card.chapter}
            </Text>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 24 }}>
        {verdict?.correct ? (
          <Text style={styles.sparks} accessibilityElementsHidden>
            ★ ★ ★
          </Text>
        ) : null}

        {card.context ? <Text style={styles.context}>{card.context}</Text> : null}
        <Text style={[styles.stem, BENGALI.test(card.stem) && { fontFamily: undefined }]}>{card.stem}</Text>

        <View style={{ gap: 10 }} accessibilityLabel="Options">
          {card.options.map((option, i) => {
            const isAnswer = verdict?.answerIndex === i;
            const isMine = chosen === i;
            const state = !verdict ? (isMine ? "picked" : "") : isAnswer ? "right" : isMine ? "wrong" : "faded";
            return (
              <Pressable
                key={i}
                onPress={() => commit(i)}
                disabled={!!verdict || pending}
                accessibilityRole="button"
                accessibilityState={{ selected: isMine }}
                style={[
                  styles.opt,
                  state === "picked" && { borderColor: color.maroon, backgroundColor: color.maroonWash },
                  state === "right" && { borderColor: color.teal, backgroundColor: "#E3F3F0" },
                  state === "wrong" && { borderColor: color.maroonTint, backgroundColor: color.maroonWash },
                  state === "faded" && { opacity: 0.5 },
                ]}
              >
                <View
                  style={[
                    styles.mark,
                    state === "picked" && { backgroundColor: color.maroon },
                    state === "right" && { backgroundColor: color.teal },
                    state === "wrong" && { backgroundColor: color.maroonTint },
                  ]}
                >
                  {state === "right" ? (
                    <Check size={20} color={color.white} accessibilityLabel="Correct" />
                  ) : state === "wrong" ? (
                    <X size={18} color={color.maroon} accessibilityLabel="Your answer" />
                  ) : (
                    <Text style={[styles.letter, state === "picked" && { color: color.cream }]}>{LETTERS[i]}</Text>
                  )}
                </View>
                <Text style={[styles.optText, BENGALI.test(option) && { fontFamily: undefined }]}>{option}</Text>
                {state === "right" && verdict?.correct ? <Text style={{ color: color.gold, fontSize: 18 }}>★</Text> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={{ gap: 12, marginTop: 4 }}>
          {failed ? (
            <View style={styles.toast} accessibilityRole="alert">
              <WifiOff size={15} color={color.maroonDeep} />
              <Text style={styles.toastText}>{failed}</Text>
            </View>
          ) : pending ? (
            <Text style={styles.status}>Sending…</Text>
          ) : verdict ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center" }}>
              <CloudCheck size={15} color={color.teal} />
              <Text style={styles.status}>Saved</Text>
            </View>
          ) : null}

          {verdict ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Btn label="Why?" kind="outline" onPress={() => setWhy(true)} />
              </View>
              <View style={{ flex: 1.4 }}>
                <Btn label={last ? "Finish" : "Next"} onPress={next} />
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Modal visible={why && !!verdict} transparent animationType="slide" onRequestClose={() => setWhy(false)}>
        <Pressable style={styles.scrim} onPress={() => setWhy(false)} accessibilityLabel="Close" />
        {verdict ? (
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.grip} />
            <ScrollView contentContainerStyle={{ gap: 10 }}>
              <Text style={{ position: "absolute", opacity: 0 }}>
                {`The answer is ${LETTERS[verdict.answerIndex]}: ${card.options[verdict.answerIndex]}`}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Lightbulb size={20} color={color.gold} />
                <Text style={styles.whyHead}>Why {LETTERS[verdict.answerIndex]}</Text>
              </View>
              {verdict.whyCorrect ? <Text style={styles.whyBody}>{verdict.whyCorrect}</Text> : null}

              {Object.keys(verdict.whyWrong).length > 0 ? (
                <>
                  <View style={styles.rule} />
                  <Text style={kit.label}>Why not the others</Text>
                  {Object.entries(verdict.whyWrong).map(([index, text]) => (
                    <Text key={index} style={styles.whyBody}>
                      <Text style={{ fontFamily: font.bodyBold }}>{LETTERS[Number(index)]} · </Text>
                      {text}
                    </Text>
                  ))}
                </>
              ) : null}

              {repeatedMistake ? <Text style={styles.again}>You chose {LETTERS[chosen!]} last time too.</Text> : null}

              <View style={styles.back}>
                <RotateCcw size={18} color={color.inkMuted} />
                <Text style={kit.line}>
                  Back in{" "}
                  <Text style={{ fontFamily: font.bodyBold, color: color.ink }}>
                    {verdict.days} day{verdict.days === 1 ? "" : "s"}
                  </Text>
                </Text>
              </View>
              <Btn label={last ? "Finish" : "Next"} onPress={next} />
            </ScrollView>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: color.cream },
  bar: { backgroundColor: color.white, borderBottomWidth: 1, borderBottomColor: color.creamMuted, paddingHorizontal: 8, paddingBottom: 10 },
  top: { flexDirection: "row", alignItems: "center", gap: 8 },
  leave: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  dots: { flex: 1, flexDirection: "row", gap: 5 },
  dot: { flex: 1, height: 6, borderRadius: 3, backgroundColor: color.creamMuted },
  count: { fontFamily: font.bodySemibold, fontSize: 13, color: color.inkMuted, minWidth: 34, textAlign: "right", marginRight: 8, fontVariant: ["tabular-nums"] },
  chips: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, marginTop: 4 },
  chip: { fontFamily: font.bodySemibold, fontSize: 11, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, overflow: "hidden" },
  chapter: { flex: 1, fontFamily: font.body, fontSize: 12, color: color.inkMuted },
  sparks: { textAlign: "center", fontSize: 22, color: color.gold, letterSpacing: 6 },
  context: { fontFamily: font.body, fontSize: 14, lineHeight: 21, color: color.inkMuted, backgroundColor: color.creamSurface, padding: 12, borderRadius: radius.md },
  stem: { fontFamily: font.bodySemibold, fontSize: 19, lineHeight: 27, color: color.ink },
  opt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 60,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: color.white,
    borderWidth: 1.5,
    borderColor: color.creamMuted,
    borderRadius: radius.lg,
  },
  mark: { width: 34, height: 34, borderRadius: 999, backgroundColor: color.creamSurface, alignItems: "center", justifyContent: "center" },
  letter: { fontFamily: font.bodyBold, fontSize: 15, color: color.maroon },
  optText: { flex: 1, fontFamily: font.body, fontSize: 16, lineHeight: 22, color: color.ink },
  toast: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center", backgroundColor: color.goldWash, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  toastText: { fontFamily: font.bodyMedium, fontSize: 13, color: color.maroonDeep },
  status: { fontFamily: font.body, fontSize: 13, color: color.inkMuted, textAlign: "center" },
  scrim: { flex: 1, backgroundColor: "rgba(43,26,28,0.4)" },
  sheet: { maxHeight: "80%", backgroundColor: color.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 10 },
  grip: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: color.creamMuted, marginBottom: 12 },
  whyHead: { fontFamily: font.display, fontSize: 22, color: color.ink },
  whyBody: { fontFamily: font.body, fontSize: 15, lineHeight: 22, color: color.ink },
  rule: { height: 1, backgroundColor: color.creamMuted, marginVertical: 4 },
  again: { fontFamily: font.bodySemibold, fontSize: 14, color: color.maroon },
  back: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
});

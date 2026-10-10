import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Loading, Offline } from "@/components/kit";
import {
  BackBar,
  Bar,
  Chips,
  Count,
  Disc,
  Field,
  H3,
  Lbl,
  LinkRow,
  ONLINE_LABEL,
  OfflinePending,
  P,
  Panel,
  Privacy,
  Rank,
  ResultHeader,
  Rule,
  Score,
  StarRule,
  Sub,
  pc,
  sheet,
  st as rs,
  type SheetState,
} from "@/components/record/parts";
import { num, useRecord, type MarkedQuestion, type QuestionStatus } from "@/lib/record";
import { color, font, radius } from "@/theme";

/**
 * The online paper's marksheet — <ResultView>'s Marksheet, natively, card for
 * card. Every number arrives computed by scripts/publish-results.ts; this
 * screen does no arithmetic on marks beyond drawing a bar's length.
 */
const LETTERS = ["A", "B", "C", "D"];

export default function OnlinePaper() {
  const insets = useSafeAreaInsets();
  const { data, failed } = useRecord({ fresh: false });
  const [filter, setFilter] = useState<"all" | QuestionStatus>("all");
  const [openQ, setOpenQ] = useState<number | null>(null);

  if (!data) return failed ? <Offline show /> : <Loading />;
  const r = data.result;
  const online = r.online;
  if (!online) return <Redirect href="/record" />;
  const cls = r.classLabel;
  const rows = online.questions.filter((q) => filter === "all" || q.status === filter);

  return (
    <View style={{ flex: 1, backgroundColor: color.cream }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}>
        <ResultHeader r={r} />
        <BackBar label="Online paper" />
        <View style={{ padding: 16, gap: 16 }}>
          <Panel gold style={{ alignItems: "center", paddingTop: 20 }}>
            <Lbl>Online Exam Marksheet</Lbl>
            <View style={{ marginTop: 10 }}>
              <Score marks={online.marks} total={online.total} />
            </View>
            <Text style={{ fontFamily: font.body, fontSize: 14.5, color: color.ink, marginTop: 8 }}>
              {online.percent}% · {online.marks} of {online.total} marks
            </Text>
            <View style={{ alignSelf: "stretch" }}>
              <StarRule />
            </View>
            <P muted small style={{ textAlign: "center" }}>
              Marks come straight from your assessed answers. One mark for each correct answer, and nothing taken away for a wrong one.
            </P>
            {online.isFullMarks ? (
              <P small style={{ textAlign: "center", color: color.maroon, fontFamily: font.bodySemibold, marginTop: 10 }}>
                You answered every question correctly.{" "}
                {online.cohort.fullMarks > 1 ? `${num(online.cohort.fullMarks)} students across all classes did that.` : "You are the only student across all classes who did that."}
              </P>
            ) : null}
          </Panel>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Count st="correct" n={online.correct} label="Correct" />
            <Count st="wrong" n={online.wrong} label="Wrong" />
            <Count st="blank" n={online.blank} label="Not answered" />
          </View>

          {online.ranks ? (
            <Panel>
              <H3>Where you stand</H3>
              <View style={{ gap: 8, marginTop: 10 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Rank label={`Rank in Class ${cls}`} value={num(online.ranks.classRank)} sub={`of ${num(online.ranks.classSat)}`} />
                  <Rank label="Percentile in class" value={online.ranks.percentile === null ? "—" : online.ranks.percentile.toFixed(1)} sub={`Class ${cls} only`} />
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Rank label="In your exam centre" value={num(online.ranks.centreRank)} sub={`of ${num(online.ranks.centreSat)}`} />
                  <Rank label="In your school" value={num(online.ranks.schoolRank)} sub={`of ${num(online.ranks.schoolSat)}`} />
                </View>
              </View>
              <P muted small style={{ marginTop: 12 }}>
                A rank is only a position in a list on one morning. It does not decide what you can learn next.
              </P>
            </Panel>
          ) : (
            <Panel>
              <H3>Why there is no rank here</H3>
              <P style={{ marginTop: 6 }}>On exam morning you sat the paper written for a different class. Every mark above is honestly yours and is counted in full.</P>
              <P style={{ marginTop: 8 }}>
                But your classmates answered different questions, so placing you in a list beside them would not mean anything. That is why there is no rank and
                no class comparison on this page — not because of anything you did.
              </P>
            </Panel>
          )}

          <Panel>
            <H3>How the half hour went</H3>
            <View style={{ marginTop: 6 }}>
              <Field label="Submitted at" value={`${online.submittedAt ?? "—"}${online.timedOut ? " (auto)" : ""}`} />
              {/* "of 30" only when they handed it in themselves: the window shut
                  at 11:00 for everyone, so a late starter never had 30. */}
              <Field
                label="Time taken"
                value={online.minutesTaken === null ? "—" : online.timedOut ? `${online.minutesTaken} min` : `${online.minutesTaken} min of 30`}
              />
              <Field label="Questions answered" value={`${online.answered} of ${online.total}`} last />
            </View>
            <P style={{ marginTop: 10 }}>
              {online.timedOut
                ? "The exam window closed at 11:00 before you pressed submit, so the paper submitted itself. Everything you had marked was saved — nothing was lost."
                : online.minutesLeft === null
                  ? "Your paper was received and marked in full."
                  : `You finished with ${online.minutesLeft} minute${online.minutesLeft === 1 ? "" : "s"} still on the clock. The time did not run out on you.`}
            </P>
          </Panel>

          {online.ranks ? (
            <Panel>
              <H3>You and your class</H3>
              <Sub>
                {num(online.ranks.classSat)} students in Class {cls} sat this paper. Across all four classes, {num(online.cohort.sat)} of {num(online.cohort.enrolled)} sat it and
                the average was {online.cohort.average}.
              </Sub>
              <View style={{ gap: 12 }}>
                <Bar label="You" value={String(online.marks)} pct={(online.marks / online.total) * 100} fill={color.maroon} />
                <Bar label={`Class ${cls} average`} value={online.classAvg.toFixed(2)} pct={(online.classAvg / online.total) * 100} fill={color.teal} />
                <Bar label={`Class ${cls} highest`} value={String(online.classHigh)} pct={(online.classHigh / online.total) * 100} fill={color.gold} />
              </View>
              <P muted small style={{ marginTop: 12 }}>
                Classes IX, X, XI and XII sat four different papers, so nobody is ever compared across classes.
              </P>
            </Panel>
          ) : null}

          <Panel>
            <H3>What to do next</H3>
            <Sub>Read against how the rest of your class answered.</Sub>
            {online.shone.length > 0 ? (
              <>
                <View style={{ marginBottom: 8 }}>
                  <Lbl tone={pc.okInk}>You did well here</Lbl>
                </View>
                <View style={{ gap: 8 }}>
                  {online.shone.map((q) => (
                    <LinkRow key={q.n} note={`Q${q.n} — only ${q.classPct}% of Class ${cls} got this right`} noteColor={pc.okInk} text={q.q} onPress={() => setOpenQ(q.n)} />
                  ))}
                </View>
              </>
            ) : (
              <>
                <View style={{ marginBottom: 8 }}>
                  <Lbl tone={pc.okInk}>Where to start</Lbl>
                </View>
                <P>Nothing to list here from this paper. That is alright — start with the three below, which most of your class found easy, and they will be the quickest to learn.</P>
              </>
            )}
            <Rule />
            <View style={{ marginBottom: 8 }}>
              <Lbl tone={color.maroon}>Worth going back to</Lbl>
            </View>
            {online.revise.length > 0 ? (
              <View style={{ gap: 8 }}>
                {online.revise.map((q) => (
                  <LinkRow key={q.n} note={`Q${q.n} — ${q.classPct}% of Class ${cls} got this right`} noteColor={color.maroon} text={q.q} onPress={() => setOpenQ(q.n)} />
                ))}
              </View>
            ) : (
              <P>There is nothing to revise from this paper — you answered every question correctly.</P>
            )}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14, backgroundColor: color.creamMuted, borderRadius: radius.sm, padding: 12 }}>
              <Text style={{ color: color.gold, fontSize: 15 }}>★</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.bodySemibold, fontSize: 13, color: color.maroon, marginBottom: 3 }}>Short video lessons — coming later</Text>
                <P muted small>
                  KIDS is preparing a lesson for each question. When one is ready it will appear right here, beside the question it fixes. Nothing to sign up for.
                </P>
              </View>
            </View>
          </Panel>

          <View style={[rs.panel, { paddingHorizontal: 0, paddingBottom: 0 }]}>
            <View style={{ paddingHorizontal: 16, gap: 10, paddingBottom: 12 }}>
              <H3>Every question, one by one</H3>
              <P muted small>
                Tap a question to see what it asked, what you chose and what was correct. The number on the right is the share of your class who got it right.
              </P>
              <Chips
                value={filter}
                onChange={setFilter}
                items={[
                  { id: "all", label: `All ${online.total}` },
                  { id: "wrong", label: `Wrong ${online.wrong}` },
                  { id: "blank", label: `Blank ${online.blank}` },
                  { id: "correct", label: `Correct ${online.correct}` },
                ]}
              />
            </View>
            {rows.map((q) => (
              <Pressable key={q.n} onPress={() => setOpenQ(q.n)} style={rowStyle} accessibilityRole="button" accessibilityLabel={`Question ${q.n}, ${ONLINE_LABEL[q.status]}`}>
                <Disc st={q.status as SheetState} size={24} />
                <Text style={qn}>{q.n}</Text>
                <Text style={{ flex: 1, fontFamily: font.body, fontSize: 13.5, lineHeight: 19, color: color.ink }}>{q.q}</Text>
                <Text style={qn}>{q.classPct}%</Text>
              </Pressable>
            ))}
          </View>

          <OfflinePending />
          <Privacy />
        </View>
      </ScrollView>
      {/* Behind the phone's clock and battery: scrolled text must not run under them. */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, backgroundColor: "#0C2A2E", zIndex: 2 }} />

      {openQ !== null ? (
        <QuestionSheet
          question={online.questions[openQ - 1]}
          total={online.total}
          classLabel={cls}
          onClose={() => setOpenQ(null)}
          onPrev={() => setOpenQ((n) => Math.max(1, (n ?? 1) - 1))}
          onNext={() => setOpenQ((n) => Math.min(online.total, (n ?? 1) + 1))}
        />
      ) : null}
    </View>
  );
}

const rowStyle = { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, minHeight: 54, paddingVertical: 10, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: color.creamMuted };
const qn = { fontFamily: font.body, fontSize: 12, color: color.inkMuted, minWidth: 24, fontVariant: ["tabular-nums" as const] };

function QuestionSheet({
  question: q,
  total,
  classLabel,
  onClose,
  onPrev,
  onNext,
}: {
  question: MarkedQuestion;
  total: number;
  classLabel: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const insets = useSafeAreaInsets();
  const insight =
    q.status === "correct" && q.classPct <= 45
      ? "Most of your class missed this one. You did not."
      : q.status === "correct"
        ? "Well answered."
        : q.status === "blank" && q.classPct >= 70
          ? "You left this blank and most of your class got it right — a quick one to pick up."
          : q.status === "blank"
            ? "Left blank. Nothing was taken away for it."
            : q.classPct >= 70
              ? "Most of your class got this right, so it is worth going over once."
              : `A hard one — only ${q.classPct}% of your class managed it.`;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(43,26,28,0.5)" }} onPress={onClose} accessibilityLabel="Close" />
      <View style={[sheet.box, { paddingBottom: insets.bottom + 12 }]}>
        <View style={sheet.head}>
          <View>
            <Lbl>
              Question {q.n} of {total}
            </Lbl>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
              <Disc st={q.status as SheetState} size={21} />
              <Text style={{ fontFamily: font.bodySemibold, fontSize: 13.5, color: color.ink }}>{ONLINE_LABEL[q.status]}</Text>
            </View>
          </View>
          <Pressable onPress={onClose} style={sheet.close} accessibilityRole="button">
            <Text style={{ fontFamily: font.bodySemibold, fontSize: 13.5, color: color.maroon }}>Close</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {q.context ? <Text style={sheet.context}>{q.context}</Text> : null}
          <Text style={sheet.stem}>{q.q}</Text>
          {q.options.map((text, i) => {
            const isCorrect = i === q.answer;
            const isPickedWrong = q.picked === i && !isCorrect;
            return (
              <View key={i} style={sheet.opt}>
                {isCorrect ? (
                  <Disc st="correct" size={22} />
                ) : isPickedWrong ? (
                  <Disc st="wrong" size={22} />
                ) : (
                  <View style={sheet.letter}>
                    <Text style={{ fontFamily: font.bodyBold, fontSize: 11, color: pc.skipInk }}>{LETTERS[i]}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: font.body, fontSize: 14.5, lineHeight: 21, color: color.ink }}>{text}</Text>
                  {isCorrect ? <Text style={[sheet.tag, { color: pc.okInk }]}>{q.status === "correct" ? "Correct answer — you chose it" : "Correct answer"}</Text> : null}
                  {isPickedWrong ? <Text style={[sheet.tag, { color: color.maroon }]}>You chose this</Text> : null}
                </View>
              </View>
            );
          })}
          <View style={[sheet.opt, { flexDirection: "column", alignItems: "stretch", gap: 6 }]}>
            <Text style={{ fontFamily: font.body, fontSize: 13.5, color: color.ink }}>
              {q.classPct}% of Class {classLabel} answered this correctly.
            </Text>
            <Text style={{ fontFamily: font.body, fontSize: 13, color: color.maroon }}>{insight}</Text>
          </View>
          {q.status !== "correct" ? (
            <View style={{ flexDirection: "row", gap: 8, backgroundColor: color.creamMuted, borderRadius: radius.sm, padding: 11 }}>
              <Text style={{ color: color.gold }}>★</Text>
              <Text style={{ flex: 1, fontFamily: font.body, fontSize: 12.5, color: color.inkMuted }}>A short lesson for this question is being made — not available yet.</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
            <Pressable onPress={() => q.n !== 1 && onPrev()} accessibilityState={{ disabled: q.n === 1 }} style={[sheet.nav, q.n === 1 && { opacity: 0.4 }]} accessibilityRole="button">
              <Text style={[sheet.navText, { color: color.maroon }]}>← Previous</Text>
            </Pressable>
            <Pressable onPress={() => q.n !== total && onNext()} accessibilityState={{ disabled: q.n === total }} style={[sheet.nav, { backgroundColor: color.maroon }, q.n === total && { opacity: 0.4 }]} accessibilityRole="button">
              <Text style={[sheet.navText, { color: color.cream }]}>Next →</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

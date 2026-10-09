import { useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View, type ViewStyle } from "react-native";
import { Redirect, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { Btn, Loading, Offline } from "@/components/kit";
import { LearnIt } from "@/components/record/LearnIt";
import {
  AS,
  BackBar,
  Badge,
  Bar,
  Chips,
  Count,
  Disc,
  H3,
  Lbl,
  LinkRow,
  P,
  Panel,
  Privacy,
  Rank,
  ResultHeader,
  Rule,
  ST,
  Score,
  StarRule,
  Sub,
  pc,
  sheet,
  st as rs,
  type SheetState,
} from "@/components/record/parts";
import { num, useRecord, type OfflineStatus, type ReviewedQuestion } from "@/lib/record";
import { color, font, radius } from "@/theme";

/**
 * The written paper's marksheet — the website's OfflineSheet.tsx, natively, in
 * the design's order: the marks, how we got them, the counts, where you stand,
 * section by section, the sheet itself, the class, every question, the
 * chapters, Learn it, what to do next, and taking it with you.
 *
 * Every chapter tally below counts only from this child's own questions as the
 * scorer marked them; no mark is recomputed.
 */
const one = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
const CENTRE_DATE = "Sunday 19 July 2026";
type FilterId = "all" | OfflineStatus;
const FILTER_WORD: Record<OfflineStatus, string> = { wrong: "wrong", blank: "blank", correct: "correct", grace: "grace", double: "not read" };
const LEGEND: { k: SheetState; text: string }[] = [
  { k: "correct", text: "You filled the right bubble. The letter is shown solid." },
  { k: "wrong", text: "Your filled bubble is solid maroon; the right one is ringed in a dashed line." },
  { k: "blank", text: "You left every bubble on that line empty." },
  { k: "graced", text: "A grace mark. No answer was possible, so everyone was given the mark." },
  { k: "flagged", text: "The machine could not read the line — two marks, or too faint." },
];

export default function WrittenPaper() {
  const insets = useSafeAreaInsets();
  const { data, failed } = useRecord({ fresh: false });
  const [filter, setFilter] = useState<FilterId>("all");
  const [open, setOpen] = useState<number | null>(null);
  const scroller = useRef<ScrollView>(null);
  // Where "Learn it" sits in the page, and each card within it, so "Learn this
  // chapter" can scroll to the card — the website's anchor link, natively.
  // Each offset is relative to its own parent, so they are kept apart and added
  // up only when used: layout events arrive in no promised order.
  const tops = useRef({ body: 0, learn: 0, list: 0 });
  const cardTops = useRef<Record<string, number>>({});

  const model = useMemo(() => (data?.result.offline ? build(data.result.offline, data.result.offlineQuestions, data.result.classLabel) : null), [data]);

  if (!data) return failed ? <Offline show /> : <Loading />;
  const r = data.result;
  const sheetM = r.offline;
  if (!sheetM || !model) return <Redirect href="/record" />;
  const questions = r.offlineQuestions;
  const cls = r.classLabel;
  const learn = r.offlineLearn;
  const canLearn = new Set(learn.map((c) => c.chapter));
  const rows = questions.filter((q) => filter === "all" || q.status === filter);
  const opened = open === null ? null : (questions.find((q) => q.n === open) ?? null);

  const goLearn = (chapter: string) => {
    setOpen(null);
    const y = cardTops.current[chapter];
    const { body, learn: wrap, list } = tops.current;
    if (y !== undefined) scroller.current?.scrollTo({ y: body + wrap + list + y - 12, animated: true });
  };

  const filters: { id: FilterId; label: string }[] = [
    { id: "all", label: `All ${sheetM.total}` },
    { id: "wrong", label: `Wrong ${model.wrong}` },
    { id: "blank", label: `Blank ${model.blank}` },
    { id: "correct", label: `Correct ${model.correct}` },
    { id: "grace", label: `Grace ${model.graced}` },
  ];
  if (model.flagged) filters.push({ id: "double", label: `Not read ${model.flagged}` });

  return (
    <View style={{ flex: 1, backgroundColor: color.cream }}>
      <ScrollView ref={scroller} contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}>
        <ResultHeader r={r} />
        <BackBar label="Written paper" />
        <View style={{ padding: 16, gap: 16 }} onLayout={(e) => (tops.current.body = e.nativeEvent.layout.y)}>
          <Panel gold style={{ alignItems: "center", paddingTop: 20 }}>
            <Lbl>Written Paper Marksheet</Lbl>
            <View style={{ marginTop: 10 }}>
              <Score marks={sheetM.marks} total={sheetM.total} />
            </View>
            <Text style={{ fontFamily: font.body, fontSize: 14.5, color: color.ink, marginTop: 8 }}>
              {sheetM.percent}% · {sheetM.marks} of {sheetM.total} marks
            </Text>
            <View style={{ alignSelf: "stretch" }}>
              <StarRule />
            </View>
            <P muted small style={{ textAlign: "center" }}>
              One mark for each correct answer. Nothing is taken away for a wrong answer, and a blank counts the same as a wrong one — zero.
            </P>
            {sheetM.isFullMarks ? (
              <P small style={{ textAlign: "center", color: color.maroon, fontFamily: font.bodySemibold, marginTop: 10 }}>
                You answered every question correctly.
              </P>
            ) : null}
          </Panel>

          <Panel>
            <Lbl>How we got this</Lbl>
            <P style={{ marginTop: 6 }}>
              Written at {r.centre} on {CENTRE_DATE}. Your OMR sheet was scanned and machine-read at the KIDS office, then checked against the master roster
              for Class {cls}.
            </P>
          </Panel>

          <View style={{ flexDirection: "row", gap: 6 }}>
            <Count st="correct" n={model.correct} label="Correct" />
            <Count st="wrong" n={model.wrong} label="Wrong" />
            <Count st="blank" n={model.blank + model.flagged} label="Not answered" />
            <Count st="graced" n={model.graced} label="Grace marks" />
          </View>

          {sheetM.ranked && sheetM.classRank !== null ? (
            <Panel>
              <H3>Where you stand</H3>
              {/* Two, as the design has it: four ranks invite a child to shop
                  for the flattering one. */}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                <Rank label={`Rank in Class ${cls}`} value={num(sheetM.classRank)} sub={`of ${num(sheetM.classSat)}`} />
                {sheetM.percentile !== null ? <Rank label="Percentile in class" value={sheetM.percentile.toFixed(1)} sub={`Class ${cls} only`} /> : null}
              </View>
              <P muted small style={{ marginTop: 12 }}>
                Ranks are worked out within Class {cls} only. There is no cut-off and nothing to pass or fail.
              </P>
            </Panel>
          ) : (
            <Panel>
              <H3>Why there is no rank here</H3>
              <P style={{ marginTop: 6 }}>
                A rank needs every sheet in your class to be marked and checked the same way. A small number of sheets could not be placed in that list, and yours
                is one of them.
              </P>
              <P style={{ marginTop: 6 }}>Your marks are unaffected — everything below is your own paper, in full.</P>
            </Panel>
          )}

          <Panel>
            <H3>Section by section</H3>
            <Sub>{model.sectionNote}</Sub>
            <View style={{ gap: 13 }}>
              {model.ranked.map((x) => (
                <View key={x.name}>
                  <Bar label={x.name} value={`${x.marks} / ${x.total}`} pct={x.fillPct} fill={color.maroon} track={x.trackPct} />
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                    {x.isCommon ? <Text style={[tiny, { color: pc.okInk }]}>COMMON TO EVERYONE</Text> : null}
                    {x.isOptional ? <Text style={tiny}>YOUR OPTIONAL SUBJECT</Text> : null}
                    <Text style={tiny}>
                      Q{x.first}–{x.last} · {x.fillPct}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            <P muted small style={{ marginTop: 12 }}>
              Bar lengths are drawn to the size of each section, so a {model.minOut}-mark section can never look like a {model.maxOut}-mark one. Strongest at the top.
            </P>
          </Panel>

          <Panel gold>
            <H3>Your sheet, as we read it</H3>
            <Sub>Every bubble on your OMR sheet, printed back to you: the one you filled, and the one the answer key says. Tap any line to open that question.</Sub>
            <Chips items={filters} value={filter} onChange={setFilter} />
            <P muted small style={{ marginVertical: 10 }}>
              {filter === "all"
                ? `Showing all ${sheetM.total} questions. The filter above also drives the list further down the page.`
                : `Showing the ${rows.length} question${rows.length === 1 ? "" : "s"} you can filter to. The sheet below keeps them lit and dims the rest.`}
            </P>
            <View style={legendBox}>
              <Lbl>How to read this sheet</Lbl>
              {LEGEND.map((lg) => (
                <View key={lg.k} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start", marginTop: 8 }}>
                  <Disc st={lg.k} size={22} />
                  <Text style={{ flex: 1, fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.ink }}>{lg.text}</Text>
                </View>
              ))}
            </View>
            <View style={{ gap: 18, marginTop: 14 }}>
              {model.panels.map((panel) => {
                let lastSection = "";
                return (
                  <View key={panel.title} style={omrPanel}>
                    <View style={omrHead}>
                      <Text style={[tiny, { color: color.maroon, fontFamily: font.bodyBold }]}>{panel.title.toUpperCase()}</Text>
                      <Text style={tiny}>{panel.score}</Text>
                    </View>
                    {panel.qs.map((q) => {
                      const v = ST[AS[q.status]];
                      const sec = sheetM.sections.find((x) => q.n >= x.first && q.n <= x.last);
                      const newSection = (sec?.name ?? "") !== lastSection;
                      lastSection = sec?.name ?? "";
                      const dim = filter !== "all" && q.status !== filter ? 0.22 : 1;
                      return (
                        <View key={q.n}>
                          {newSection && sec ? (
                            <Text style={[tiny, { backgroundColor: "#F6EFE2", paddingHorizontal: 10, paddingTop: 6, paddingBottom: 3 }]}>
                              {sec.name.toUpperCase()} · Q{sec.first}–{sec.last}
                            </Text>
                          ) : null}
                          <Pressable onPress={() => setOpen(q.n)} style={[omrLine, { opacity: dim }]} accessibilityLabel={`Question ${q.n} — ${v.label}`} accessibilityRole="button">
                            <Text style={[tiny, { width: 24, textAlign: "right" }]}>{q.n}</Text>
                            <View style={{ flexDirection: "row", gap: 5 }}>
                              {["a", "b", "c", "d"].map((o, i) => {
                                const marked = q.marked === o || q.second === o;
                                const isKey = q.key === o;
                                const kind =
                                  // A line the machine could not read: the first
                                  // two are hatched, because which two is exactly
                                  // what is not known.
                                  q.status === "double"
                                    ? i < 2
                                      ? "flag"
                                      : "plain"
                                    : q.status === "grace"
                                      ? marked
                                        ? "grace"
                                        : "plain"
                                      : marked && isKey
                                        ? "both"
                                        : marked
                                          ? "pick"
                                          : isKey
                                            ? "key"
                                            : "plain";
                                return (
                                  <View key={o} style={bubble(kind)}>
                                    <Text style={bubbleText(kind)}>{o.toUpperCase()}</Text>
                                  </View>
                                );
                              })}
                            </View>
                            <View style={{ marginLeft: "auto", width: 22, height: 22, borderRadius: 5, backgroundColor: v.bg, borderWidth: 1.5, borderColor: v.stroke, alignItems: "center", justifyContent: "center" }}>
                              <Text style={{ color: v.fg, fontFamily: font.bodyBold, fontSize: 12 }}>{v.glyph}</Text>
                            </View>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
            <P muted small style={{ marginTop: 14, fontStyle: "italic" }}>
              This is what the scanner read off the paper you handed in. If a line does not match what you remember marking, tell your school co-ordinator — the
              physical sheet is kept.
            </P>
          </Panel>

          <Panel>
            <H3>You and your class</H3>
            <Sub>
              {num(sheetM.classSat)} students in Class {cls} sat this written paper. Classes IX to XII sat different papers, so nobody is compared across classes.
            </Sub>
            <View style={{ gap: 12 }}>
              <Bar label="You" value={String(sheetM.marks)} pct={sheetM.total ? (sheetM.marks / sheetM.total) * 100 : 0} fill={color.maroon} />
              <Bar label={`Class ${cls} average`} value={one(sheetM.classAvg)} pct={sheetM.total ? (sheetM.classAvg / sheetM.total) * 100 : 0} fill={color.teal} />
            </View>
            {model.haveAvg ? (
              <>
                <Rule />
                <Lbl tone={color.maroon}>Section by section, against your class</Lbl>
                <P muted small style={{ marginVertical: 8 }}>
                  The overall number hides this. A section where you are well below the class is worth more of your time than one where you are already ahead.
                </P>
                <View style={{ gap: 11 }}>
                  {model.gaps.map((x) => (
                    <Bar
                      key={x.name}
                      label={x.name}
                      value={`${x.gap >= 0 ? "+" : "−"}${one(Math.abs(x.gap))} against the class`}
                      pct={x.fillPct}
                      fill={color.maroon}
                      track={x.trackPct}
                      marker={x.classAvg !== null && x.total ? Math.round((x.classAvg / x.total) * 100) : null}
                    />
                  ))}
                </View>
                <P muted small style={{ marginTop: 12 }}>
                  The teal line on each bar is the Class {cls} average for that section, worked out from how the whole class answered those same questions.
                </P>
                <P style={{ marginTop: 10 }}>{model.standingLine}</P>
              </>
            ) : null}
          </Panel>

          <View style={[rs.panel, { paddingHorizontal: 0, paddingBottom: 0 }]}>
            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
              <H3>Every question, explained</H3>
              <P muted small>
                Every question carries a written explanation — why the right answer is right, and why each of the others is not. Tap any line to read it.
              </P>
            </View>
            {rows.map((q) => (
              <Pressable key={q.n} onPress={() => setOpen(q.n)} style={qRow} accessibilityRole="button" accessibilityLabel={`Question ${q.n}, ${ST[AS[q.status]].label}`}>
                <Disc st={AS[q.status]} size={24} />
                <Text style={qNum}>{q.n}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: font.body, fontSize: 13.5, lineHeight: 19, color: color.ink }}>{q.stem || `${q.section} — question ${q.n}`}</Text>
                  <Text style={[tiny, { marginTop: 2, letterSpacing: 0 }]}>{q.chapter ? `${q.section} · ${q.chapter}` : q.section}</Text>
                </View>
                <Text style={qNum}>{q.status === "grace" ? "grace" : q.classPct !== null ? `${Math.round(q.classPct)}%` : ""}</Text>
              </Pressable>
            ))}
          </View>

          <Panel>
            <H3>By chapter</H3>
            <Sub>
              Your {sheetM.total} questions came from {model.all.length} chapters. These are the ones that actually cost you marks, heaviest first.
            </Sub>
            {model.chapters.length > 0 ? (
              <>
                <View style={{ gap: 10 }}>
                  {model.chapters.map((c) => (
                    <Pressable key={c.name} onPress={() => canLearn.has(c.name) && goLearn(c.name)} style={chapterRow} accessibilityRole="button">
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                        <Text style={{ flex: 1, fontFamily: font.bodySemibold, fontSize: 14, color: color.ink }}>{c.name}</Text>
                        <Text style={{ fontFamily: font.bodyBold, fontSize: 12.5, color: c.got === 0 ? color.maroon : color.ink }}>
                          {c.got} of {c.asked}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4, marginTop: 7 }}>
                        {c.qs.map((q) => (
                          <Disc key={q.n} st={q.status === "correct" ? "correct" : "wrong"} size={17} />
                        ))}
                        <Text style={[tiny, { letterSpacing: 0, marginLeft: 4 }]}>
                          {c.section} · {c.lost} mark{c.lost === 1 ? "" : "s"} lost
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
                <P muted small style={{ marginTop: 12 }}>
                  {model.chapterTail}
                </P>
              </>
            ) : (
              <P>Nothing to single out. You did not lose more than a mark in any one chapter of this paper.</P>
            )}
          </Panel>

          <View onLayout={(e) => (tops.current.learn = e.nativeEvent.layout.y)}>
            <Panel>
              <H3>Learn it</H3>
              {learn.length > 0 ? (
                <>
                  <Sub>A trick to remember it, something to practise on, and a video where one exists.</Sub>
                  <View onLayout={(e) => (tops.current.list = e.nativeEvent.layout.y)}>
                    <LearnIt cards={learn} onLayoutCard={(chapter, y) => (cardTops.current[chapter] = y)} />
                  </View>
                </>
              ) : (
                <View style={[chapterRow, { marginTop: 8 }]}>
                  <P style={{ marginBottom: 6 }}>There is nothing here for you to fix from this paper.</P>
                  <P muted small>
                    Your paper touched {model.all.length} chapters, and each one still has a trick, a practice set and sometimes a video. Open the Learn tab to
                    find them.
                  </P>
                </View>
              )}
            </Panel>
          </View>

          <Panel>
            <H3>What to do next</H3>
            <Sub>Worked out from the chapters your questions came from, not from single questions.</Sub>
            <View style={{ marginBottom: 8 }}>
              <Lbl tone={pc.okInk}>{model.strong.length ? "You did well here" : "Where to start"}</Lbl>
            </View>
            {model.strong.length > 0 ? (
              <View style={{ gap: 8 }}>
                {model.strong.map((c) => (
                  <LinkRow key={c.name} note={`All ${c.asked} questions correct · ${c.section}`} noteColor={pc.okInk} text={c.name} onPress={() => canLearn.has(c.name) && goLearn(c.name)} />
                ))}
              </View>
            ) : (
              <P>Nothing to list here from this paper. That is alright — start with the chapters below. They are the ones that cost you the most, so they are where the marks are.</P>
            )}
            <Rule />
            <View style={{ marginBottom: 8 }}>
              <Lbl tone={color.maroon}>Worth going back to</Lbl>
            </View>
            {model.revise.length > 0 ? (
              <View style={{ gap: 8 }}>
                {model.revise.map((c) => (
                  <LinkRow
                    key={c.name}
                    note={`${c.lost} mark${c.lost === 1 ? "" : "s"} lost here · ${c.section}`}
                    noteColor={color.maroon}
                    text={c.name}
                    aside={canLearn.has(c.name) ? "Learn it →" : undefined}
                    onPress={() => canLearn.has(c.name) && goLearn(c.name)}
                  />
                ))}
              </View>
            ) : (
              <P>There is nothing to revise from this paper — you answered every question correctly.</P>
            )}
            <P style={{ marginTop: 14 }}>
              {sheetM.isFullMarks
                ? "You answered every question on the paper. Take the chapters you enjoyed and go further into them."
                : "One paper on one morning tells you which chapters to open next. That is all it tells you, and it is worth knowing."}
            </P>
          </Panel>

          <Panel gold style={{ gap: 10 }}>
            <H3>Take it with you</H3>
            <P muted>A one-page A4 marksheet with your sheet printed on it, ready to keep in your file or show at school.</P>
            <Btn label="Download your marksheet (A4)" onPress={() => WebBrowser.openBrowserAsync(r.marksheetHref)} />
          </Panel>

          <Panel>
            <Lbl>Your other paper</Lbl>
            {r.online ? (
              <>
                <P style={{ marginVertical: 8 }}>
                  You also sat the online paper. It was a different paper of 50 questions in half an hour, so the two scores are not comparable and are never added
                  together.
                </P>
                <Pressable onPress={() => router.replace("/paper/online")} style={[chapterRow, { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 48 }]} accessibilityRole="button">
                  <Text style={{ fontFamily: font.display, fontSize: 16, color: color.maroon }}>Online Exam</Text>
                  <Text style={{ fontFamily: font.bodySemibold, fontSize: 13, color: color.maroon }}>
                    {r.online.marks} / {r.online.total} →
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={{ fontFamily: font.display, fontSize: 16.5, color: color.maroon, marginVertical: 4 }}>Online Exam</Text>
                <P>You did not sit this one, so there is no result for it.</P>
              </>
            )}
          </Panel>

          <Privacy />
        </View>
      </ScrollView>

      {opened ? (
        <QuestionSheet
          q={opened}
          pool={rows}
          all={questions}
          total={sheetM.total}
          classLabel={cls}
          filterWord={filter === "all" ? null : FILTER_WORD[filter]}
          onClose={() => setOpen(null)}
          onStep={setOpen}
          onLearn={opened.chapter && canLearn.has(opened.chapter) ? goLearn : null}
        />
      ) : null}
    </View>
  );
}

/** Everything the page draws that is a grouping of the scorer's own rows. */
function build(sheetM: NonNullable<import("@/lib/record").ResultModel["offline"]>, questions: ReviewedQuestion[], cls: string) {
  // `correct` counts grace inside it and `wrong` counts doubles inside it,
  // because that is how they scored; the design shows the buckets a child can
  // act on, so both are taken back out.
  const correct = sheetM.correct - sheetM.grace;
  const wrong = sheetM.wrong - sheetM.doubles;

  const maxOut = Math.max(1, ...sheetM.sections.map((x) => x.total));
  const minOut = Math.min(...sheetM.sections.map((x) => x.total));
  const four = sheetM.sections.length === 4;
  const withPct = sheetM.sections.map((x, i) => ({
    ...x,
    trackPct: Math.round((x.total / maxOut) * 100),
    fillPct: x.total ? Math.round((x.marks / x.total) * 100) : 0,
    isCommon: four && i === 0,
    isOptional: four && i > 0,
  }));
  const ranked = [...withPct].sort((a, b) => b.fillPct - a.fillPct || a.first - b.first);
  const sectionNote = `${sheetM.sections.length} sections, and they are not the same size. ${
    four ? `The first block was sat by everyone in Class ${cls}; the other three are the subjects printed on your own sheet.` : "Marks and the out-of are shown for each."
  }`;

  const gaps = withPct.map((x) => ({ ...x, gap: x.marks - (x.classAvg ?? x.marks) }));
  const haveAvg = withPct.some((x) => x.classAvg !== null);
  const best = gaps.reduce((a, b) => (b.gap > a.gap ? b : a), gaps[0]);
  const worst = gaps.reduce((a, b) => (b.gap < a.gap ? b : a), gaps[0]);
  const standingLine = !haveAvg
    ? ""
    : worst.gap < -0.5
      ? `Against your class you are strongest in ${best.name} and furthest behind in ${worst.name} — that is where the marks are waiting, not in the sections you already answer well.`
      : "You are at or above the class average in every section of this paper.";

  const panels: { title: string; score: string; qs: ReviewedQuestion[] }[] = [];
  for (let p = 0; p * 25 < sheetM.total; p++) {
    const slice = questions.slice(p * 25, p * 25 + 25);
    const got = slice.filter((q) => q.status === "correct" || q.status === "grace").length;
    panels.push({ title: `Q${p * 25 + 1} – Q${Math.min(p * 25 + 25, sheetM.total)}`, score: `${got} of ${slice.length}`, qs: slice });
  }

  const map = new Map<string, { name: string; section: string; asked: number; got: number; qs: ReviewedQuestion[] }>();
  for (const q of questions) {
    if (!q.chapter || q.status === "grace" || q.status === "double") continue;
    const m = map.get(q.chapter) ?? { name: q.chapter, section: q.section, asked: 0, got: 0, qs: [] };
    m.asked += 1;
    m.qs.push(q);
    if (q.status === "correct") m.got += 1;
    map.set(q.chapter, m);
  }
  const all = [...map.values()].map((c) => ({ ...c, lost: c.asked - c.got }));
  const big = all.filter((c) => c.asked >= 2 && c.lost > 0).sort((a, b) => b.lost - a.lost || b.asked - a.asked);
  const singles = all.filter((c) => c.asked === 1 && c.lost > 0);
  const avgPct = (c: { qs: ReviewedQuestion[]; asked: number }) => c.qs.reduce((x, q) => x + (q.classPct ?? 0), 0) / c.asked;

  return {
    correct,
    wrong,
    blank: sheetM.blank,
    graced: sheetM.grace,
    flagged: sheetM.doubles,
    maxOut,
    minOut,
    ranked,
    sectionNote,
    gaps,
    haveAvg,
    standingLine,
    panels,
    all,
    chapters: big.slice(0, 6),
    chapterTail: singles.length
      ? `Another ${singles.length} chapter${singles.length === 1 ? "" : "s"} had only one question on this paper and you missed it. One question out of one tells us very little, so it is not listed above.`
      : "Every chapter above had at least two questions on your paper, so the pattern is real and not one unlucky question.",
    strong: all
      .filter((c) => c.asked >= 2 && c.lost === 0)
      .sort((a, b) => avgPct(a) - avgPct(b))
      .slice(0, 3),
    revise: big.slice(0, 3),
  };
}

const LETTER = ["A", "B", "C", "D", "E"];

/** The design's insight line; "most of your class missed this" is tested before "well answered". */
function insightFor(q: ReviewedQuestion, cls: string): string {
  const pct = q.classPct ?? 0;
  if (q.status === "grace") return "Nothing here is your fault, and nothing was lost.";
  if (q.status === "double") return "This one line is the only part of your sheet the machine could not read.";
  if (q.status === "correct" && pct <= 45) return "Most of your class missed this one. You did not.";
  if (q.status === "correct") return "Well answered.";
  if (q.status === "blank" && pct >= 70) return "You left this blank and most of your class got it right — a quick one to pick up.";
  if (q.status === "blank") return "Left blank. Nothing was taken away for it.";
  if (pct >= 70) return "Most of your class got this right, so it is worth going over once.";
  return `A hard one — only ${Math.round(pct)}% of Class ${cls} managed it.`;
}

/**
 * One written question, opened — the website's OfflineQuestionSheet, block for
 * block: what you marked, why yours fails, why the right one works, the others,
 * then how the class found it. The reason comes before the correction.
 */
function QuestionSheet({
  q,
  pool,
  all,
  total,
  classLabel,
  filterWord,
  onClose,
  onStep,
  onLearn,
}: {
  q: ReviewedQuestion;
  pool: ReviewedQuestion[];
  all: ReviewedQuestion[];
  total: number;
  classLabel: string;
  filterWord: string | null;
  onClose: () => void;
  onStep: (n: number) => void;
  onLearn: ((chapter: string) => void) | null;
}) {
  const insets = useSafeAreaInsets();
  const v = ST[AS[q.status]];
  const at = pool.findIndex((x) => x.n === q.n);
  const walkAll = !filterWord || at === -1;
  const step = (dir: number) => {
    const list = walkAll ? all : pool;
    if (!list.length) return;
    const here = list.findIndex((x) => x.n === q.n);
    onStep(list[((here === -1 ? 0 : here) + dir + list.length) % list.length].n);
  };
  const counter = `Question ${q.n} of ${total}` + (walkAll ? "" : ` · ${at + 1} of ${pool.length} ${filterWord}`);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(43,26,28,0.5)" }} onPress={onClose} accessibilityLabel="Close" />
      <View style={[sheet.box, { paddingBottom: insets.bottom + 12 }]}>
        <View style={sheet.head}>
          <View style={{ flex: 1 }}>
            <Lbl>{counter}</Lbl>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
              <Disc st={AS[q.status]} size={21} />
              <Text style={{ fontFamily: font.bodySemibold, fontSize: 13.5, color: color.ink }}>{v.label}</Text>
            </View>
          </View>
          <Pressable onPress={onClose} style={sheet.close} accessibilityRole="button">
            <Text style={{ fontFamily: font.bodySemibold, fontSize: 13.5, color: color.maroon }}>Close</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {q.section || q.chapter ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {q.section ? <Badge tone="maroon">{q.section}</Badge> : null}
              {q.chapter ? <Badge tone="outline">{q.chapter}</Badge> : null}
            </View>
          ) : null}
          {q.context ? <Text style={[sheet.context, { fontStyle: "italic", backgroundColor: "transparent", padding: 0 }]}>{q.context}</Text> : null}
          <Text style={sheet.stem}>{q.stem || `${q.section} — question ${q.n}`}</Text>

          {q.status === "double" ? (
            <Box border={color.gold} bg="#FBF3E2">
              <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: pc.goldInk, marginBottom: 4 }}>The scanner could not read this bubble</Text>
              <P small style={{ marginBottom: 6 }}>Two bubbles were filled on this line, so there was no single answer to mark.</P>
              <P small>
                No mark was given and none was taken away. Your physical sheet is kept at the centre — if you believe this is wrong, tell your school co-ordinator
                and it will be looked at by hand.
              </P>
            </Box>
          ) : null}

          {q.options.length > 0 ? (
            q.options.map((text, i) => {
              const isAns = q.answerIndex === i;
              // On an unread line there is no "you chose it": which bubble they
              // meant is exactly what is not known.
              const isPicked = q.status !== "double" && q.pickedIndex === i;
              let mark = LETTER[i];
              let bg: string = color.creamMuted;
              let stroke: string = pc.skipLine;
              let fg: string = pc.skipInk;
              let border: string = color.creamMuted;
              let tag = "";
              let tagColor: string = color.ink;
              if (q.status === "grace") {
                if (isPicked) {
                  bg = "#F7EEDA";
                  stroke = color.gold;
                  fg = pc.goldInk;
                  border = color.gold;
                  tag = "You marked this";
                  tagColor = pc.goldInk;
                }
              } else if (isAns) {
                mark = "✓";
                bg = pc.okBg;
                stroke = pc.okLine;
                fg = pc.okInk;
                border = pc.okLine;
                tag = isPicked ? "Correct answer — you chose it" : "Correct answer";
                tagColor = pc.okInk;
              } else if (isPicked) {
                mark = "✕";
                bg = pc.noBg;
                stroke = pc.noLine;
                fg = pc.noInk;
                border = pc.noLine;
                tag = "You marked this";
                tagColor = color.maroon;
              }
              return (
                <View key={i} style={[sheet.opt, { borderColor: border }]}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: bg, borderWidth: 1.5, borderColor: stroke, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontFamily: font.bodyBold, fontSize: 11.5, color: fg }}>{mark}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: font.body, fontSize: 14.5, lineHeight: 21, color: color.ink }}>
                      <Text style={{ fontFamily: font.bodyBold, color: color.inkMuted }}>{LETTER[i]}.</Text> {text}
                    </Text>
                    {tag ? <Text style={[sheet.tag, { color: tagColor }]}>{tag}</Text> : null}
                  </View>
                </View>
              );
            })
          ) : (
            <P muted>This question is not in the published question bank, so only your sheet can be shown for it.</P>
          )}

          {q.status === "grace" ? (
            <Box border={color.gold} bg="#FBF3E2">
              <Lbl tone={pc.goldInk}>Why no answer was possible</Lbl>
              <P style={{ marginVertical: 6 }}>The printed paper carried no correct option for this question, so it was withdrawn after the exam.</P>
              <P style={{ color: color.maroon, fontFamily: font.bodySemibold }}>
                {q.pickedIndex === null
                  ? "You left this line blank, and the mark was given to you anyway."
                  : `You marked ${LETTER[q.pickedIndex]}. Everyone was given this mark, whatever they filled in.`}
              </P>
            </Box>
          ) : null}

          {q.whyWrong && q.pickedIndex !== null ? (
            <Box border="#E2C3C7" bg="#FBEEF0">
              <Lbl tone={color.maroon}>Why {LETTER[q.pickedIndex]} is not the answer</Lbl>
              <P style={{ marginTop: 6 }}>{q.whyWrong}</P>
            </Box>
          ) : null}

          {q.whyCorrect && q.status !== "grace" ? (
            <Box border="#B7DED5" bg="#E8F5F1">
              <Lbl tone={pc.okInk}>Why {q.answerIndex !== null ? LETTER[q.answerIndex] : "the answer"} is right</Lbl>
              <P style={{ marginTop: 6 }}>{q.whyCorrect}</P>
            </Box>
          ) : null}

          {q.status !== "grace" && q.whyOthers.length > 0 ? (
            <Box border={color.creamMuted} bg={color.creamSurface}>
              <Lbl>And the others</Lbl>
              {q.whyOthers.map((o) => (
                <P key={o.index} muted small style={{ marginTop: 5 }}>
                  <Text style={{ fontFamily: font.bodyBold, color: color.ink }}>{LETTER[o.index]}</Text> — {o.text}
                </P>
              ))}
            </Box>
          ) : null}

          <Box border={color.creamMuted} bg={color.creamSurface}>
            <P small>
              {q.status === "grace"
                ? "Withdrawn question — no class figure applies."
                : q.classPct !== null
                  ? `${Math.round(q.classPct)}% of Class ${classLabel} answered this correctly.`
                  : `Class ${classLabel} figures are not published for this question.`}
            </P>
            <P small style={{ color: color.maroon, marginTop: 6 }}>
              {insightFor(q, classLabel)}
            </P>
          </Box>

          {onLearn && q.chapter ? (
            <Pressable onPress={() => onLearn(q.chapter)} style={[sheet.opt, { borderColor: color.gold, backgroundColor: "#F7EEDA", alignItems: "center", minHeight: 52 }]} accessibilityRole="button">
              <View style={{ flex: 1 }}>
                <Lbl tone={pc.goldInk}>Learn this chapter</Lbl>
                <Text style={{ fontFamily: font.body, fontSize: 14, color: color.ink, marginTop: 2 }}>{q.chapter}</Text>
              </View>
              <Text style={{ fontFamily: font.bodyBold, color: color.maroon }}>→</Text>
            </Pressable>
          ) : null}

          <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
            <Pressable onPress={() => step(-1)} style={sheet.nav} accessibilityRole="button">
              <Text style={[sheet.navText, { color: color.maroon }]}>← Previous</Text>
            </Pressable>
            <Pressable onPress={() => step(1)} style={[sheet.nav, { backgroundColor: color.maroon }]} accessibilityRole="button">
              <Text style={[sheet.navText, { color: color.cream }]}>Next →</Text>
            </Pressable>
          </View>
          <Text style={[tiny, { textAlign: "center", letterSpacing: 0 }]}>
            {walkAll ? `Previous and next move through all ${total} questions.` : `Previous and next stay inside your ${filterWord} filter.`}
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Box({ children, border, bg }: { children: React.ReactNode; border: string; bg: string }) {
  return <View style={{ borderWidth: 1, borderColor: border, backgroundColor: bg, borderRadius: radius.sm, padding: 12 }}>{children}</View>;
}

type BubbleKind = "both" | "pick" | "key" | "flag" | "grace" | "plain";

/** One bubble on one line, as the design draws it. The hatch of an unread line becomes a dotted ring. */
function bubble(kind: BubbleKind): ViewStyle {
  const base: ViewStyle = { width: 21, height: 21, borderRadius: 11, alignItems: "center", justifyContent: "center" };
  switch (kind) {
    case "both":
      return { ...base, backgroundColor: "#0F7A69", borderWidth: 2, borderColor: "#0B5F53" };
    case "pick":
      return { ...base, backgroundColor: color.maroon, borderWidth: 2, borderColor: color.maroon };
    case "key":
      return { ...base, backgroundColor: color.white, borderWidth: 2, borderStyle: "dashed", borderColor: "#0F7A69" };
    case "flag":
      return { ...base, backgroundColor: "#C9B79C", borderWidth: 2, borderStyle: "dotted", borderColor: pc.goldInk };
    case "grace":
      return { ...base, backgroundColor: "#F7EEDA", borderWidth: 2, borderColor: color.gold };
    default:
      return { ...base, borderWidth: 1.5, borderColor: "#C9B79C" };
  }
}
function bubbleText(kind: BubbleKind) {
  const c = kind === "both" ? color.white : kind === "pick" ? color.creamSurface : kind === "key" ? "#0B5F53" : kind === "flag" ? "#3D2A12" : kind === "grace" ? pc.goldInk : "#9A8873";
  return { fontFamily: kind === "plain" ? font.bodySemibold : font.bodyBold, fontSize: 9.5, color: c };
}

const tiny = { fontFamily: font.body, fontSize: 10.5, letterSpacing: 0.8, color: color.inkMuted, fontVariant: ["tabular-nums" as const] };
const legendBox: ViewStyle = { backgroundColor: color.cream, borderWidth: 1, borderColor: color.creamMuted, borderRadius: radius.sm, padding: 12 };
const omrPanel: ViewStyle = { borderWidth: 1, borderColor: color.creamMuted, borderRadius: radius.sm, backgroundColor: color.cream, overflow: "hidden" };
const omrHead: ViewStyle = { flexDirection: "row", justifyContent: "space-between", backgroundColor: color.creamMuted, paddingHorizontal: 10, paddingVertical: 7 };
const omrLine: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 36, paddingHorizontal: 10, paddingVertical: 3, borderTopWidth: 1, borderTopColor: "#EFE7D9" };
const qRow: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 54, paddingVertical: 10, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: color.creamMuted };
const qNum = { fontFamily: font.body, fontSize: 12, color: color.inkMuted, minWidth: 24, fontVariant: ["tabular-nums" as const] };
const chapterRow: ViewStyle = { backgroundColor: color.cream, borderWidth: 1, borderColor: color.creamMuted, borderRadius: radius.sm, paddingVertical: 11, paddingHorizontal: 12 };

import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";
import VideoEmbed from "@/components/VideoEmbed";
import type { InteractiveTemplate, LearnCard } from "@/lib/record";
import { color, font, radius } from "@/theme";
import { pc } from "./parts";

/**
 * Learn it — the website's LearnIt.tsx, natively. One card per chapter the
 * student lost most marks in: the trick, an activity, and the video where
 * there is one, stacked in that order (not tabs: a child who has to discover a
 * "Practice" tab mostly does not).
 *
 * Four activity types are playable; the rest are a study card with the answer
 * behind a tap. Everything is tap-driven — no drag-and-drop on a small screen.
 */
const TEMPLATE_LABEL: Record<InteractiveTemplate, string> = {
  "match-pairs": "Match the pairs",
  "sort-bins": "Sort into bins",
  "true-false": "True or false",
  "step-solve": "Solve step by step",
  "timeline-order": "Put in order",
  "fill-blank": "Fill the blank",
  "formula-pick": "Pick the formula",
  "odd-one-out": "Odd one out",
  "label-diagram": "Label the diagram",
  transform: "Transform the sentence",
};

export function LearnIt({ cards, onLayoutCard }: { cards: LearnCard[]; onLayoutCard?: (chapter: string, y: number) => void }) {
  if (cards.length === 0) return null;
  return (
    <View style={{ gap: 16 }}>
      {cards.map((c) => (
        <View key={`${c.section}|${c.chapter}`} onLayout={(e) => onLayoutCard?.(c.chapter, e.nativeEvent.layout.y)}>
          <Card card={c} />
        </View>
      ))}
    </View>
  );
}

function Card({ card }: { card: LearnCard }) {
  return (
    <View style={s.card}>
      <View style={s.head}>
        <Text style={s.section}>{card.section}</Text>
        <Text style={s.chapter}>{card.chapter}</Text>
        <Text style={s.small}>
          {card.correct} of {card.total} on your paper
        </Text>
      </View>

      <View style={s.trick}>
        <Text style={{ color: color.gold, fontSize: 16 }}>★</Text>
        <View style={{ flex: 1 }}>
          <Text style={[s.kicker, { color: pc.goldInk }]}>The trick</Text>
          <Text style={s.body}>{card.trick}</Text>
        </View>
      </View>

      <View style={s.part}>
        <Text style={[s.kicker, { color: color.maroon, marginBottom: 8 }]}>Practice · {TEMPLATE_LABEL[card.template]}</Text>
        <Activity card={card} />
      </View>

      {card.videoId ? (
        <View style={s.part}>
          <Text style={[s.kicker, { color: color.maroon, marginBottom: 8 }]}>Video lesson</Text>
          <VideoEmbed videoId={card.videoId} language={card.videoLanguage} duration={null} start={null} />
        </View>
      ) : (
        <View style={[s.part, { backgroundColor: color.creamSurface }]}>
          <Text style={s.small}>No video for this chapter yet. The trick and the practice above are the whole lesson.</Text>
        </View>
      )}
    </View>
  );
}

function Activity({ card }: { card: LearnCard }) {
  const d = card.data;
  const prompt = String(d.prompt ?? "");
  if (!card.playable) return <StudyCard card={card} prompt={prompt} />;
  switch (card.template) {
    case "match-pairs":
      return <MatchPairs prompt={prompt} data={d} />;
    case "sort-bins":
      return <SortBins prompt={prompt} data={d} />;
    case "true-false":
      return <TrueFalse prompt={prompt} data={d} />;
    case "odd-one-out":
      return <OddOneOut prompt={prompt} data={d} />;
    default:
      return <StudyCard card={card} prompt={prompt} />;
  }
}

/** Deterministic shuffle — a fixed order per chapter, so a reload is not a reset. */
function shuffled<T>(items: T[], seed: string): T[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return items
    .map((v, i) => ({ v, k: Math.abs(Math.sin(h + i) * 10000) % 1 }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.v);
}

/** A tap target in an activity. */
function Pill({ label, onPress, disabled, state }: { label: string; onPress?: () => void; disabled?: boolean; state?: "sel" | "got" | "no" | "alt" }) {
  return (
    <Pressable
      onPress={() => !disabled && onPress?.()}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={[
        s.pill,
        state === "alt" && { borderColor: color.creamMuted, backgroundColor: color.white },
        state === "sel" && { borderColor: color.maroon, backgroundColor: color.maroonWash },
        state === "got" && { borderColor: pc.okLine, backgroundColor: pc.okBg },
        state === "no" && { borderColor: pc.noLine, backgroundColor: pc.noBg },
      ]}
      accessibilityRole="button"
    >
      <Text style={[s.pillText, state === "got" && { color: pc.okInk }]}>{label}</Text>
    </Pressable>
  );
}

/** A short-lived flag that clears itself — the "no" flash on a wrong tap. */
function useFlash<T>() {
  const [value, setValue] = useState<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const flash = (v: T, ms: number, then?: () => void) => {
    setValue(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setValue(null);
      then?.();
    }, ms);
  };
  return [value, flash, setValue] as const;
}

function MatchPairs({ prompt, data }: { prompt: string; data: Record<string, unknown> }) {
  const pairs = useMemo(() => (data.pairs ?? []) as { left: string; right: string }[], [data]);
  const rights = useMemo(() => shuffled(pairs.map((p) => p.right), prompt), [pairs, prompt]);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, string>>({});
  const [wrong, flashWrong, setWrong] = useFlash<string>();

  const choose = (right: string) => {
    if (!picked) return;
    const want = pairs.find((p) => p.left === picked)?.right;
    if (want === right) {
      setDone((d) => ({ ...d, [picked]: right }));
      setPicked(null);
      setWrong(null);
    } else flashWrong(right, 700);
  };
  const finished = Object.keys(done).length === pairs.length;

  return (
    <View style={{ gap: 10 }}>
      <Text style={s.prompt}>{prompt}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1, gap: 6 }}>
          {pairs.map((p) => (
            <Pill
              key={p.left}
              label={done[p.left] ? `${p.left} → ${done[p.left]}` : p.left}
              disabled={!!done[p.left]}
              state={done[p.left] ? "got" : picked === p.left ? "sel" : undefined}
              onPress={() => setPicked(picked === p.left ? null : p.left)}
            />
          ))}
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          {rights.map((r) => {
            const used = Object.values(done).includes(r);
            return <Pill key={r} label={r} disabled={used || !picked} state={used ? "got" : wrong === r ? "no" : "alt"} onPress={() => choose(r)} />;
          })}
        </View>
      </View>
      <Text style={s.state}>{finished ? "All matched — well done." : picked ? "Now tap what it goes with." : "Tap one on the left, then its partner on the right."}</Text>
    </View>
  );
}

function SortBins({ prompt, data }: { prompt: string; data: Record<string, unknown> }) {
  const bins = (data.bins ?? []) as string[];
  const items = useMemo(() => (data.items ?? []) as { label: string; bin: string }[], [data]);
  const order = useMemo(() => shuffled(items, prompt), [items, prompt]);
  const [at, setAt] = useState(0);
  const [right, setRight] = useState(0);
  const [flash, setFlash] = useFlash<"ok" | "no">();
  const current = order[at];

  const put = (bin: string) => {
    if (!current) return;
    const ok = current.bin === bin;
    if (ok) setRight((n) => n + 1);
    setFlash(ok ? "ok" : "no", ok ? 350 : 900, () => setAt((i) => i + 1));
  };

  if (!current) {
    return (
      <View style={{ gap: 10 }}>
        <Text style={[s.state, { fontSize: 15, color: color.ink }]}>
          {right} of {items.length} sorted correctly.
        </Text>
        <Pill
          label="Start again"
          state="alt"
          onPress={() => {
            setAt(0);
            setRight(0);
          }}
        />
      </View>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      <Text style={s.prompt}>{prompt}</Text>
      <View style={[s.sortItem, flash === "ok" && { borderColor: pc.okLine, backgroundColor: pc.okBg }, flash === "no" && { borderColor: pc.noLine, backgroundColor: pc.noBg }]}>
        <Text style={[s.pillText, { textAlign: "center" }]}>{current.label}</Text>
      </View>
      {flash === "no" ? (
        <Text style={[s.state, { color: color.maroon }]}>
          It belongs in <Text style={{ fontFamily: font.bodyBold }}>{current.bin}</Text>.
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {bins.map((b) => (
          <View key={b} style={{ flexGrow: 1 }}>
            <Pill label={b} state="alt" disabled={!!flash} onPress={() => put(b)} />
          </View>
        ))}
      </View>
      <Text style={s.state}>
        {at + 1} of {items.length}
      </Text>
    </View>
  );
}

function TrueFalse({ prompt, data }: { prompt: string; data: Record<string, unknown> }) {
  const items = (data.items ?? []) as { statement: string; is_true: boolean; why?: string }[];
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  return (
    <View style={{ gap: 10 }}>
      <Text style={s.prompt}>{prompt}</Text>
      {items.map((it, i) => {
        const given = answers[i];
        const answered = given !== undefined;
        const right = answered && given === it.is_true;
        return (
          <View key={i} style={[s.tf, answered && (right ? { borderColor: pc.okLine, backgroundColor: pc.okBg } : { borderColor: pc.noLine, backgroundColor: pc.noBg })]}>
            <Text style={s.body}>{it.statement}</Text>
            {!answered ? (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <Pill label="True" state="alt" onPress={() => setAnswers((a) => ({ ...a, [i]: true }))} />
                </View>
                <View style={{ flex: 1 }}>
                  <Pill label="False" state="alt" onPress={() => setAnswers((a) => ({ ...a, [i]: false }))} />
                </View>
              </View>
            ) : (
              <Text style={[s.state, { marginTop: 6, textAlign: "left" }]}>
                <Text style={{ fontFamily: font.bodyBold, color: color.ink }}>{it.is_true ? "True" : "False"}</Text>
                {right ? " — you had it right." : " — you said the other one."}
                {it.why ? ` ${it.why}` : ""}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

function OddOneOut({ prompt, data }: { prompt: string; data: Record<string, unknown> }) {
  const items = (data.items ?? []) as string[];
  const odd = Number(data.odd ?? -1);
  const because = String(data.because ?? "");
  const [pick, setPick] = useState<number | null>(null);
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.prompt}>{prompt}</Text>
      {items.map((it, i) => (
        <Pill key={i} label={it} disabled={pick !== null} state={pick === null ? "alt" : i === odd ? "got" : pick === i ? "no" : "alt"} onPress={() => setPick(i)} />
      ))}
      {pick !== null ? (
        <Text style={[s.state, { textAlign: "left" }]}>
          {pick === odd ? "That is the one. " : `The odd one out is “${items[odd]}”. `}
          {because}
        </Text>
      ) : null}
    </View>
  );
}

/** For the templates not playable yet: the material, with the answer behind a tap. */
function StudyCard({ card, prompt }: { card: LearnCard; prompt: string }) {
  const [show, setShow] = useState(false);
  const d = card.data;
  const body = (() => {
    switch (card.template) {
      case "timeline-order":
        return ((d.items as { label: string; note?: string }[]) ?? []).map((i) => `${i.label}${i.note ? ` — ${i.note}` : ""}`);
      case "fill-blank":
        return [String(d.text ?? "").replace(/\{(\d+)\}/g, (_m, n) => (show ? `${(d.answers as string[])?.[Number(n) - 1] ?? "___"}` : "_____"))];
      case "step-solve":
        return [String(d.problem ?? ""), ...((d.steps as { prompt?: string }[]) ?? []).map((st, i) => `${i + 1}. ${st.prompt ?? ""}`)];
      case "formula-pick":
        return ((d.items as { ask?: string; right?: string }[]) ?? []).map((i) => `${i.ask ?? ""}${show && i.right ? ` — ${i.right}` : ""}`);
      case "transform":
        return ((d.items as { from?: string; to?: string }[]) ?? []).map((i) => `${i.from ?? ""}${show && i.to ? ` → ${i.to}` : ""}`);
      default:
        return [];
    }
  })();

  return (
    <View style={{ gap: 10 }}>
      <Text style={s.prompt}>{prompt}</Text>
      {card.template === "label-diagram" && typeof d.svg === "string" ? (
        <View style={{ backgroundColor: color.white, borderRadius: radius.sm, padding: 8 }}>
          <SvgXml xml={d.svg} width="100%" height={220} />
        </View>
      ) : (
        <View style={{ gap: 6 }}>
          {body.map((line, i) => (
            <Text key={i} style={s.body}>
              {line}
            </Text>
          ))}
        </View>
      )}
      <Pill label={show ? "Hide the answers" : "Show the answers"} state="alt" onPress={() => setShow(!show)} />
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: color.cream, borderWidth: 1, borderColor: color.creamMuted, borderRadius: radius.md, overflow: "hidden" },
  head: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: color.creamMuted },
  section: { fontFamily: font.body, fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", color: color.inkMuted },
  chapter: { fontFamily: font.display, fontSize: 16.5, color: color.maroon, marginTop: 2 },
  small: { fontFamily: font.body, fontSize: 12, lineHeight: 18, color: color.inkMuted },
  trick: { flexDirection: "row", gap: 10, backgroundColor: "#F7EEDA", paddingHorizontal: 14, paddingVertical: 13 },
  kicker: { fontFamily: font.bodyBold, fontSize: 10.5, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 3 },
  body: { fontFamily: font.body, fontSize: 14, lineHeight: 21, color: color.ink },
  part: { borderTopWidth: 1, borderTopColor: color.creamMuted, paddingHorizontal: 14, paddingVertical: 13 },
  prompt: { fontFamily: font.bodySemibold, fontSize: 14, lineHeight: 20, color: color.ink },
  state: { fontFamily: font.body, fontSize: 12.5, lineHeight: 18, color: color.inkMuted, textAlign: "center" },
  pill: { minHeight: 44, justifyContent: "center", paddingVertical: 9, paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1.5, borderColor: color.dash, backgroundColor: color.creamSurface },
  pillText: { fontFamily: font.bodyMedium, fontSize: 13.5, lineHeight: 19, color: color.ink },
  sortItem: { minHeight: 56, justifyContent: "center", borderRadius: radius.md, borderWidth: 1.5, borderColor: color.maroon, backgroundColor: color.white, padding: 12 },
  tf: { borderWidth: 1, borderColor: color.creamMuted, borderRadius: radius.sm, padding: 12, backgroundColor: color.white },
});

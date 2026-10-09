import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { router } from "expo-router";
import type { OfflineStatus, QuestionStatus, ResultModel } from "@/lib/record";
import { color, font, radius } from "@/theme";

/**
 * The result page's pieces — the native twins of the parts at the foot of the
 * website's ResultView.tsx, OfflineSheet.tsx and offline-design.ts. Colours
 * are the portal's own tokens (portal.css), copied as literals as the design
 * gave them.
 */

export const pc = {
  okBg: "#D3EDE8",
  okLine: "#57B3A4",
  okInk: "#0B5F53",
  noBg: "#F6E2E4",
  noLine: "#C98D95",
  noInk: "#7B1E2B",
  skipBg: "#F2E9DA",
  skipLine: "#D0BC9E",
  skipInk: "#5C4D4F",
  tealInk: "#0D5248",
  goldInk: "#8A6A17",
  skyTop: "#0C2A2E",
  skyMid: "#123A3B",
  skyEnd: "#1E7E78",
} as const;

/* ------------------------------------------------------------ statuses --- */

export type SheetState = "correct" | "wrong" | "blank" | "graced" | "flagged";

export const ST: Record<SheetState, { bg: string; stroke: string; fg: string; glyph: string; label: string }> = {
  correct: { bg: pc.okBg, stroke: pc.okLine, fg: pc.okInk, glyph: "✓", label: "Correct" },
  wrong: { bg: pc.noBg, stroke: pc.noLine, fg: pc.noInk, glyph: "✕", label: "Wrong" },
  blank: { bg: pc.skipBg, stroke: pc.skipLine, fg: pc.skipInk, glyph: "–", label: "Not answered" },
  graced: { bg: "#F7EEDA", stroke: color.gold, fg: pc.goldInk, glyph: "★", label: "Grace mark given" },
  flagged: { bg: "#FBF3E2", stroke: color.gold, fg: pc.goldInk, glyph: "?", label: "Could not be read" },
};

/** The design's states are not the scorer's: a double is "could not be read". */
export const AS: Record<OfflineStatus, SheetState> = {
  correct: "correct",
  wrong: "wrong",
  blank: "blank",
  double: "flagged",
  grace: "graced",
};

export const ONLINE_LABEL: Record<QuestionStatus, string> = { correct: "Correct", wrong: "Wrong", blank: "Not answered" };

/** A status disc — glyph in a tinted, outlined circle. */
export function Disc({ st, size }: { st: SheetState; size: number }) {
  const v = ST[st];
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: v.bg, borderWidth: 1.5, borderColor: v.stroke, alignItems: "center", justifyContent: "center" }}
      accessibilityElementsHidden
    >
      <Text style={{ color: v.fg, fontFamily: font.bodyBold, fontSize: size * 0.42, lineHeight: size * 0.6 }}>{v.glyph}</Text>
    </View>
  );
}

/* ----------------------------------------------------------- the header --- */

/** The portal's night-sky header: name, class, roll, school and centre. */
export function ResultHeader({ r }: { r: ResultModel }) {
  const insets = useSafeAreaInsets();
  return (
    <>
      <LinearGradient colors={[pc.skyTop, pc.skyMid, pc.skyEnd]} style={[st.sky, { paddingTop: insets.top + 14 }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={st.brand}>KIDS</Text>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={st.set}>SET 2026</Text>
            <Text style={st.date}>SUN 19 JULY 2026</Text>
          </View>
        </View>
        <View style={st.verified}>
          <Svg width={15} height={15} viewBox="0 0 20 20">
            <Circle cx={10} cy={10} r={9} fill="#0F7A69" />
            <Path d="M5.6 10.4l2.8 2.8 5.9-6.2" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" />
          </Svg>
          <Text style={st.verifiedText}>Verified as {r.name}</Text>
        </View>
        <Text style={st.name} accessibilityRole="header">
          {r.name}
        </Text>
        <Text style={st.meta}>
          Class {r.classLabel} · Roll {r.uid}
          {r.stream ? ` · ${r.stream}` : " · Stream not recorded"}
        </Text>
        <Text style={st.place}>School — {r.school}</Text>
        <Text style={st.place}>Exam centre — {r.centre}</Text>
      </LinearGradient>
      <View style={{ height: 3, backgroundColor: color.gold }} />
    </>
  );
}

/** The bar under the header on a marksheet: "← Both marksheets". */
export function BackBar({ label }: { label: string }) {
  return (
    <View style={st.backBar}>
      <Pressable onPress={() => router.back()} style={st.backBtn} accessibilityRole="button" hitSlop={4}>
        <ArrowLeft size={18} color={color.maroon} />
        <Text style={st.backText}>Both marksheets</Text>
      </Pressable>
      <Text style={st.lbl}>{label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------ the parts --- */

export function Panel({ children, gold, style }: { children: ReactNode; gold?: boolean; style?: ViewStyle }) {
  return <View style={[st.panel, gold && st.panelGold, style]}>{children}</View>;
}

export function H3({ children }: { children: ReactNode }) {
  return <Text style={st.h3}>{children}</Text>;
}

export function Sub({ children }: { children: ReactNode }) {
  return <Text style={st.sub}>{children}</Text>;
}

export function P({ children, muted, small, style }: { children: ReactNode; muted?: boolean; small?: boolean; style?: object }) {
  return <Text style={[st.p, muted && { color: color.inkMuted }, small && { fontSize: 12.5, lineHeight: 19 }, style]}>{children}</Text>;
}

export function Lbl({ children, tone }: { children: ReactNode; tone?: string }) {
  return <Text style={[st.lbl, tone ? { color: tone, fontFamily: font.bodyBold } : null]}>{children}</Text>;
}

export function Note({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={st.note}>
      <Text style={st.noteTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function Badge({ tone, children }: { tone: "teal" | "maroon" | "outline"; children: ReactNode }) {
  return (
    <Text
      style={[
        st.badge,
        tone === "teal" && { backgroundColor: "rgba(30,158,140,0.12)", color: pc.tealInk },
        tone === "maroon" && { backgroundColor: color.maroonTint, color: color.maroon },
        tone === "outline" && { borderWidth: 1, borderColor: color.creamMuted, color: color.inkMuted },
      ]}
    >
      {children}
    </Text>
  );
}

/** The big mark: 38 / 50. */
export function Score({ marks, total, size = 70 }: { marks: number; total: number; size?: number }) {
  return (
    <Text style={[st.score, { fontSize: size, lineHeight: size * 1.05 }]}>
      {marks}
      <Text style={[st.scoreOf, { fontSize: size * 0.36 }]}> / {total}</Text>
    </Text>
  );
}

export function Count({ st: state, n, label }: { st: SheetState; n: number; label: string }) {
  return (
    <View style={st.count}>
      <Disc st={state} size={26} />
      <Text style={st.countN}>{n}</Text>
      <Text style={st.countLabel}>{label}</Text>
    </View>
  );
}

export function Rank({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View style={st.rank}>
      <Text style={st.rankLabel}>{label}</Text>
      <Text style={st.rankValue}>{value}</Text>
      <Text style={st.rankSub}>{sub}</Text>
    </View>
  );
}

export function Field({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[st.field, last && { borderBottomWidth: 0 }]}>
      <Text style={st.fieldLabel}>{label}</Text>
      <Text style={st.fieldValue}>{value}</Text>
    </View>
  );
}

export function Bar({ label, value, pct, fill, track = 100, marker }: { label: string; value: string; pct: number; fill: string; track?: number; marker?: number | null }) {
  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5, gap: 8 }}>
        <Text style={[st.p, { flex: 1 }]}>{label}</Text>
        <Text style={[st.p, { fontFamily: font.bodyBold }]}>{value}</Text>
      </View>
      <View style={{ width: `${track}%`, height: 13, borderRadius: 3, backgroundColor: color.creamMuted }}>
        <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: 13, borderRadius: 3, backgroundColor: fill }} />
        {marker !== undefined && marker !== null ? (
          <View style={{ position: "absolute", top: -3, left: `${Math.max(0, Math.min(100, marker))}%`, width: 2, height: 19, backgroundColor: color.teal }} />
        ) : null}
      </View>
    </View>
  );
}

export function StarRule() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 12 }} accessibilityElementsHidden>
      <View style={{ flex: 1, height: 1, backgroundColor: color.creamMuted }} />
      <Text style={{ color: color.gold, fontSize: 11 }}>★</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: color.creamMuted }} />
    </View>
  );
}

export function Rule() {
  return <View style={{ height: 1, backgroundColor: color.creamMuted, marginVertical: 14 }} />;
}

/** A tappable row inside a card: a coloured note, then the text. */
export function LinkRow({ note, noteColor, text, onPress, aside }: { note: string; noteColor: string; text: string; onPress: () => void; aside?: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.linkRow, pressed && { opacity: 0.85 }]} accessibilityRole="button">
      <View style={{ flex: 1 }}>
        <Text style={[st.linkNote, { color: noteColor }]}>{note}</Text>
        <Text style={st.linkText}>{text}</Text>
      </View>
      {aside ? <Text style={[st.linkNote, { color: color.maroon }]}>{aside}</Text> : null}
    </Pressable>
  );
}

/** Filter chips — "All 50 · Wrong 7 · …". */
export function Chips<T extends string>({ items, value, onChange }: { items: { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <Pressable key={it.id} onPress={() => onChange(it.id)} style={[st.chip, on && st.chipOn]} accessibilityState={{ selected: on }}>
            <Text style={[st.chipText, on && { color: color.cream }]}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * "Keep this private" — in the app's words. The portal's advice (send a
 * screenshot, do not forward the link) does not apply to an account on one
 * phone, so the app never gives it.
 */
export function Privacy() {
  return (
    <Panel>
      <Lbl>Keep this private</Lbl>
      <P style={{ marginTop: 6 }}>
        This is your account, on your phone. Your result opens only for someone signed in as you, and your account works on one phone at a time —
        if you sign in somewhere else, this phone is signed out.
      </P>
    </Panel>
  );
}

/**
 * The written paper, before its results are out. Never "absent": until the
 * sheets are marked nobody knows who sat it.
 */
export function OfflinePending() {
  return (
    <Panel>
      <View style={{ flexDirection: "row" }}>
        <Badge tone="maroon">Not published yet</Badge>
      </View>
      <Text style={[st.h3, { marginTop: 8 }]}>Offline (Written) Exam</Text>
      <Text style={st.sub}>100 questions · OMR sheet · at your centre</Text>
      <Note title="Still being marked">
        <P style={{ marginBottom: 6 }}>
          Your written sheet was collected at the centre and is being assessed by hand. When it is done, your marks will appear on this same page.
        </P>
        <P>There is nothing more for you to do, and no date has been announced yet. Check back here.</P>
      </Note>
    </Panel>
  );
}

export const st = StyleSheet.create({
  sky: { paddingHorizontal: 18, paddingBottom: 18 },
  brand: { fontFamily: font.display, fontSize: 21, color: color.cream, letterSpacing: 0.4 },
  set: { fontFamily: font.display, fontSize: 15, color: color.goldLight },
  date: { fontFamily: font.body, fontSize: 9.5, letterSpacing: 0.8, color: color.cream, opacity: 0.85 },
  verified: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: "#D8EFE9", borderRadius: 999, paddingVertical: 5, paddingLeft: 9, paddingRight: 12, marginTop: 10 },
  verifiedText: { fontFamily: font.bodySemibold, fontSize: 12, color: "#0A5246" },
  name: { fontFamily: font.display, fontSize: 27, lineHeight: 32, color: color.cream, marginTop: 10, marginBottom: 6 },
  meta: { fontFamily: font.body, fontSize: 13, color: "#DCF1EC", fontVariant: ["tabular-nums"] },
  place: { fontFamily: font.body, fontSize: 12, lineHeight: 18, color: "#CDE7E1", marginTop: 2 },
  backBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: color.creamSurface, borderBottomWidth: 1, borderBottomColor: color.creamMuted, paddingHorizontal: 6, paddingVertical: 4 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, paddingHorizontal: 10 },
  backText: { fontFamily: font.bodySemibold, fontSize: 14, color: color.maroon },
  lbl: { fontFamily: font.bodySemibold, fontSize: 10.5, letterSpacing: 1.3, textTransform: "uppercase", color: color.inkMuted },
  panel: { backgroundColor: color.creamSurface, borderWidth: 1, borderColor: color.creamMuted, borderRadius: radius.md, padding: 16 },
  panelGold: { borderTopWidth: 3, borderTopColor: color.gold, shadowColor: color.ink, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  h3: { fontFamily: font.display, fontSize: 17.5, color: color.maroon, marginBottom: 2 },
  sub: { fontFamily: font.body, fontSize: 12, lineHeight: 18, color: color.inkMuted, marginBottom: 12 },
  p: { fontFamily: font.body, fontSize: 13.5, lineHeight: 21, color: color.ink },
  note: { marginTop: 14, backgroundColor: color.creamMuted, borderRadius: radius.sm, padding: 14 },
  noteTitle: { fontFamily: font.display, fontSize: 16, color: color.maroon, marginBottom: 6 },
  badge: { fontFamily: font.bodyBold, fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase", paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, overflow: "hidden" },
  score: { fontFamily: font.display, color: color.maroon, fontVariant: ["tabular-nums"], textAlign: "center" },
  scoreOf: { color: color.gold },
  count: { flex: 1, alignItems: "center", backgroundColor: color.creamSurface, borderWidth: 1, borderColor: color.creamMuted, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 4, gap: 2 },
  countN: { fontFamily: font.display, fontSize: 24, color: color.ink, fontVariant: ["tabular-nums"] },
  countLabel: { fontFamily: font.body, fontSize: 11, color: color.inkMuted, textAlign: "center" },
  rank: { flex: 1, backgroundColor: color.cream, borderWidth: 1, borderColor: color.creamMuted, borderRadius: radius.sm, padding: 12 },
  rankLabel: { fontFamily: font.body, fontSize: 10.5, letterSpacing: 0.6, textTransform: "uppercase", color: color.inkMuted, minHeight: 28 },
  rankValue: { fontFamily: font.display, fontSize: 24, color: color.maroon, fontVariant: ["tabular-nums"] },
  rankSub: { fontFamily: font.body, fontSize: 11, color: color.inkMuted },
  field: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: color.creamMuted },
  fieldLabel: { fontFamily: font.body, fontSize: 12.5, color: color.inkMuted },
  fieldValue: { fontFamily: font.bodySemibold, fontSize: 13.5, color: color.ink, fontVariant: ["tabular-nums"] },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: color.cream, borderWidth: 1, borderColor: color.creamMuted, borderRadius: radius.sm, paddingVertical: 11, paddingHorizontal: 12 },
  linkNote: { fontFamily: font.bodySemibold, fontSize: 11.5, fontVariant: ["tabular-nums"] },
  linkText: { fontFamily: font.body, fontSize: 13.5, lineHeight: 19.5, color: color.ink, marginTop: 3 },
  chip: { minHeight: 40, justifyContent: "center", paddingHorizontal: 13, borderRadius: 999, borderWidth: 1.5, borderColor: color.creamMuted },
  chipOn: { backgroundColor: color.maroon, borderColor: color.maroon },
  chipText: { fontFamily: font.bodySemibold, fontSize: 12.5, color: color.maroon },
});

/** The bottom sheet a question opens in, shared by both marksheets. */
export const sheet = {
  box: { maxHeight: "86%" as const, backgroundColor: color.cream, borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: "hidden" as const },
  head: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: color.creamMuted,
    paddingVertical: 10,
    paddingLeft: 16,
    paddingRight: 12,
  },
  close: { minHeight: 44, minWidth: 44, justifyContent: "center" as const, alignItems: "center" as const, borderRadius: 999, backgroundColor: color.creamMuted, paddingHorizontal: 14 },
  context: { fontFamily: font.body, fontSize: 13.5, lineHeight: 21, color: color.inkMuted, backgroundColor: color.creamSurface, borderRadius: radius.sm, padding: 12 },
  stem: { fontFamily: font.display, fontSize: 18.5, lineHeight: 25, color: color.ink, marginBottom: 4 },
  opt: { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 10, borderWidth: 1, borderColor: color.creamMuted, backgroundColor: color.creamSurface, borderRadius: radius.sm, paddingVertical: 11, paddingHorizontal: 12 },
  letter: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: pc.skipLine, backgroundColor: color.creamMuted, alignItems: "center" as const, justifyContent: "center" as const },
  tag: { fontFamily: font.bodyBold, fontSize: 10.5, letterSpacing: 0.6, textTransform: "uppercase" as const, marginTop: 4 },
  nav: { flex: 1, minHeight: 46, borderRadius: radius.sm, borderWidth: 1.5, borderColor: color.maroon, alignItems: "center" as const, justifyContent: "center" as const },
  navText: { fontFamily: font.bodySemibold, fontSize: 14 },
};

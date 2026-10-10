import type { ReactNode } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import { ArrowLeft, Bell, Check, ChevronRight, Flame, RotateCcw, Sparkle, X } from "lucide-react-native";
import { color, font, radius } from "@/theme";

/**
 * The app's kit — the native twin of the website's src/components/app/kit.tsx
 * and kit.css. Same names, same measurements, so a board reads the same on
 * both.
 */

/** A scrolling screen on the cream ground, with pull-to-refresh. */
export function Screen({
  children,
  refreshing,
  onRefresh,
  pad = true,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  pad?: boolean;
}) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.cream }}
      contentContainerStyle={[pad && { padding: 16, paddingTop: 0 }, { gap: 14, paddingBottom: 28 }]}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={color.maroon} colors={[color.maroon]} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.cream }}>
      <ActivityIndicator color={color.maroon} size="large" />
    </View>
  );
}

/** The quiet line when a refresh failed but older data is still showing. */
export function Offline({ show }: { show: boolean }) {
  if (!show) return null;
  return <Text style={[s.line, { textAlign: "center" }]}>No connection. Pull down to try again.</Text>;
}

/** The maroon header: eyebrow, serif title, chips, and the notice bell. */
export function Hero({
  eyebrow,
  title,
  chips,
  unread,
  children,
}: {
  eyebrow?: string;
  title: string;
  chips?: { label: string; gold?: boolean }[];
  unread?: number;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={[color.maroon, color.maroonDeep]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={[s.hero, { paddingTop: insets.top + 16 }]}
    >
      <Image source={require("@/assets/images/kids-icon.png")} style={s.heroCrest} accessibilityElementsHidden />
      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          {eyebrow ? <Text style={s.heroEyebrow}>{eyebrow}</Text> : null}
          <Text style={s.heroTitle} accessibilityRole="header">
            {title}
          </Text>
          {chips && chips.length ? (
            <View style={s.chips}>
              {chips.map((c) => (
                <Text key={c.label} style={[s.chip, c.gold && s.chipGold]}>
                  {c.label}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
        {unread !== undefined ? <BellButton unread={unread} /> : null}
      </View>
      {children}
    </LinearGradient>
  );
}

export function BellButton({ unread }: { unread: number }) {
  return (
    <Pressable
      onPress={() => router.push("/notices")}
      style={({ pressed }) => [s.bell, pressed && { transform: [{ scale: 0.94 }] }]}
      accessibilityLabel={unread > 0 ? `Notices, ${unread} unread` : "Notices"}
      hitSlop={4}
    >
      <Bell size={24} strokeWidth={1.9} color={color.cream} />
      {unread > 0 ? <Text style={s.bellN}>{unread > 9 ? "9+" : unread}</Text> : null}
    </Pressable>
  );
}

/** A white title bar with a back arrow, for screens pushed over the tabs. */
export function Head({ title, aside, back = true }: { title: string; aside?: ReactNode; back?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.head, { paddingTop: insets.top + 6 }, !back && { paddingLeft: 16 }]}>
      {back ? (
        <Pressable onPress={() => router.back()} style={s.headBack} accessibilityLabel="Back" hitSlop={6}>
          <ArrowLeft size={24} color={color.ink} />
        </Pressable>
      ) : null}
      <Text style={s.headTitle} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
      {aside}
    </View>
  );
}

export function Card({
  children,
  style,
  tone,
}: {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  tone?: "lead" | "live" | "dashed" | "gold" | "wash";
}) {
  return (
    <View
      style={[
        s.card,
        tone === "lead" && s.cardLead,
        tone === "live" && s.cardLive,
        tone === "dashed" && s.cardDashed,
        tone === "gold" && { borderColor: color.goldLight },
        tone === "wash" && { backgroundColor: color.goldWash, borderColor: color.goldLight },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** The maroon card — "Five done". */
export function MaroonCard({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <LinearGradient colors={[color.maroon, color.maroonDeep]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={[s.card, { borderWidth: 0 }, style]}>
      {children}
    </LinearGradient>
  );
}

export function Btn({
  label,
  onPress,
  kind = "solid",
  small,
  disabled,
  busy,
  icon,
}: {
  label: string;
  onPress: () => void;
  kind?: "solid" | "gold" | "outline" | "quiet";
  small?: boolean;
  disabled?: boolean;
  busy?: boolean;
  icon?: ReactNode;
}) {
  const off = Boolean(disabled || busy);
  return (
    // Never Pressable's own `disabled`: on Android's new architecture a
    // Pressable that starts disabled can stay deaf to taps after it is enabled
    // (a "Next" that did nothing on a real phone, 9 Oct 2026). The tap always
    // arrives; a button that is off simply ignores it.
    <Pressable
      onPress={() => {
        if (!off) onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: Boolean(busy) }}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        kind === "gold" && { backgroundColor: color.gold },
        kind === "outline" && s.btnOutline,
        kind === "quiet" && { backgroundColor: "transparent", minHeight: 48 },
        off && kind === "solid" && { backgroundColor: color.creamMuted },
        pressed && !off && { transform: [{ translateY: 1 }], opacity: 0.93 },
      ]}
    >
      {busy ? <ActivityIndicator color={kind === "solid" ? color.cream : color.maroon} /> : icon}
      <Text
        style={[
          s.btnText,
          small && { fontSize: 15 },
          kind === "gold" && { color: color.maroonDeep, fontFamily: font.bodyBold },
          (kind === "outline" || kind === "quiet") && { color: color.maroon },
          off && kind === "solid" && { color: color.inkFaint },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** A whole-row door: icon, title, optional line, optional count, chevron. */
export function Row({
  icon,
  title,
  line,
  count,
  onPress,
}: {
  icon?: ReactNode;
  title: string;
  line?: string;
  count?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [s.row, pressed && { transform: [{ translateY: 1 }] }]}
    >
      {icon ? <View style={s.rowIcon}>{icon}</View> : null}
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        {line ? <Text style={s.rowLine}>{line}</Text> : null}
      </View>
      {count ? <Text style={[s.bellN, { position: "relative", top: 0, right: 0 }]}>{count}</Text> : null}
      <ChevronRight size={18} color={color.inkMuted} />
    </Pressable>
  );
}

export type PipKind = "new" | "again" | "right" | "wrong" | "here" | "todo";

/** Today's five as pips: new, again, here, todo, and the verdicts. */
export function Pips({ kinds, small, onDark }: { kinds: PipKind[]; small?: boolean; onDark?: boolean }) {
  const size = small ? 18 : 22;
  return (
    <View style={[s.pips, small && { justifyContent: "center" }]} accessibilityLabel="Today's questions">
      {kinds.map((k, i) => {
        const fg =
          k === "new" ? color.royalBlue : k === "right" ? color.white : k === "here" ? color.cream : k === "todo" ? color.inkFaint : color.maroon;
        return (
          <View
            key={i}
            style={[
              s.pip,
              small && s.pipSmall,
              k === "new" && { backgroundColor: color.newWash, borderWidth: 1, borderColor: color.newEdge },
              k === "again" && { backgroundColor: color.goldWash, borderWidth: 1, borderColor: color.goldLight },
              k === "right" && { backgroundColor: color.teal },
              k === "wrong" && (onDark ? { backgroundColor: "rgba(232,201,204,0.28)" } : { backgroundColor: color.maroonWash, borderWidth: 1, borderColor: color.maroonTint }),
              k === "here" && { backgroundColor: color.maroon },
              k === "todo" && { backgroundColor: color.creamSurface, borderWidth: 1.5, borderStyle: "dashed", borderColor: color.dash },
            ]}
            accessibilityLabel={`${i + 1}, ${k === "right" ? "right" : k === "wrong" ? "not this time" : k}`}
          >
            {k === "right" ? (
              <Check size={size} color={fg} />
            ) : k === "wrong" ? (
              <X size={size} color={onDark ? color.maroonTint : fg} />
            ) : k === "new" ? (
              <Sparkle size={size - 2} color={fg} />
            ) : k === "again" ? (
              <RotateCcw size={size - 3} color={fg} />
            ) : (
              <Text style={[s.pipN, small && { fontSize: 13 }, { color: fg }]}>{i + 1}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

/** A ring: value of total, teal, turning gold when full. */
export function Ring({ value, total, label }: { value: number; total: number; label?: string }) {
  const size = 72;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  const full = total > 0 && value >= total;
  return (
    <View style={{ width: size, height: size }} accessibilityLabel={label ?? `${value} of ${total}`}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color.creamMuted} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={full ? color.gold : color.teal}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c * pct} ${c}`}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={s.ringN}>{value}</Text>
        <Text style={s.ringOf}>of {total}</Text>
      </View>
    </View>
  );
}

const weekday = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "narrow" }).format(new Date(`${iso}T06:00:00Z`));

export function Streak({
  days,
  best,
  week,
  today,
  note,
  showWeek = true,
}: {
  days: number;
  best: number;
  week: { date: string; done: boolean }[];
  today: string;
  note?: string;
  showWeek?: boolean;
}) {
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={s.flame}>
          <Flame size={19} strokeWidth={1.9} color={color.maroonDeep} />
        </View>
        <Text style={s.streakN}>{days === 0 ? "Start a streak today" : `${days} day${days === 1 ? "" : "s"} in a row`}</Text>
        <Text style={s.meta}>{note ?? (best > days ? `Best ${best}` : "")}</Text>
      </View>
      {showWeek ? (
        <View style={{ flexDirection: "row", gap: 5, marginTop: 12 }}>
          {week.map((d) => {
            const isToday = d.date === today;
            return (
              <View key={d.date} style={{ flex: 1, alignItems: "center" }}>
                <View
                  style={[
                    s.weekCell,
                    d.done && { backgroundColor: color.gold, borderWidth: 0 },
                    isToday && !d.done && { borderWidth: 2, borderStyle: "solid", borderColor: color.maroon, backgroundColor: color.maroonWash },
                  ]}
                >
                  <Text style={{ fontSize: 12, color: color.maroonDeep }}>{d.done ? "★" : ""}</Text>
                </View>
                <Text style={[s.weekDay, isToday && { color: color.maroon, fontFamily: font.bodyBold }]}>{weekday(d.date)}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </Card>
  );
}

export function Empty({ icon, title, line }: { icon?: ReactNode; title: string; line?: string }) {
  return (
    <View style={{ alignItems: "center", gap: 6, paddingVertical: 8 }}>
      {icon ? <View style={s.emptyMark}>{icon}</View> : null}
      <Text style={s.h}>{title}</Text>
      {line ? <Text style={[s.line, { textAlign: "center" }]}>{line}</Text> : null}
    </View>
  );
}

export const s = StyleSheet.create({
  hero: { paddingHorizontal: 18, paddingBottom: 20, overflow: "hidden", marginBottom: 2 },
  heroCrest: { position: "absolute", right: -18, top: -14, width: 112, height: 112, opacity: 0.1 },
  heroEyebrow: { fontFamily: font.body, fontSize: 13, color: color.goldLight },
  heroTitle: { fontFamily: font.display, fontSize: 26, lineHeight: 30, color: color.cream },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 9 },
  chip: {
    fontFamily: font.bodyMedium,
    fontSize: 11,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(253,251,247,0.16)",
    color: color.cream,
  },
  chipGold: { backgroundColor: color.gold, color: color.maroonDeep, fontFamily: font.bodyBold },
  bell: { width: 48, height: 48, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  bellN: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 5,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: color.gold,
    color: color.maroonDeep,
    fontFamily: font.bodyBold,
    fontSize: 11,
    lineHeight: 19,
    textAlign: "center",
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingBottom: 8,
    backgroundColor: color.white,
    borderBottomWidth: 1,
    borderBottomColor: color.creamMuted,
    marginBottom: 6,
  },
  headBack: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  headTitle: { flex: 1, fontFamily: font.display, fontSize: 21, color: color.ink },
  card: { backgroundColor: color.white, borderWidth: 1, borderColor: color.creamMuted, borderRadius: radius.xl, paddingVertical: 16, paddingHorizontal: 18 },
  cardLead: { paddingVertical: 20, shadowColor: color.ink, shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardLive: { borderWidth: 1.5, borderColor: color.maroon, shadowColor: color.ink, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  cardDashed: { borderStyle: "dashed", borderColor: color.dash },
  cardTitle: { fontFamily: font.display, fontSize: 24, lineHeight: 29, color: color.ink },
  meta: { fontFamily: font.body, fontSize: 12, color: color.inkMuted },
  metaMaroon: { fontFamily: font.bodySemibold, fontSize: 13, color: color.maroon },
  h: { fontFamily: font.bodySemibold, fontSize: 16, lineHeight: 21, color: color.ink },
  line: { fontFamily: font.body, fontSize: 13, lineHeight: 19.5, color: color.inkMuted },
  label: { fontFamily: font.bodySemibold, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: color.inkMuted },
  btn: {
    minHeight: 56,
    paddingHorizontal: 20,
    borderRadius: radius.lg,
    backgroundColor: color.maroon,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnSmall: { minHeight: 48, paddingHorizontal: 18, alignSelf: "flex-start" },
  btnOutline: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: color.maroon },
  btnText: { fontFamily: font.bodySemibold, fontSize: 17, color: color.cream },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 56,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: color.white,
    borderWidth: 1,
    borderColor: color.creamMuted,
    borderRadius: radius.lg,
  },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: color.maroonWash, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontFamily: font.bodySemibold, fontSize: 15, color: color.ink },
  rowLine: { fontFamily: font.body, fontSize: 12.5, color: color.inkMuted },
  pips: { flexDirection: "row", gap: 8 },
  pip: { flex: 1, height: 56, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  pipSmall: { flex: 0, width: 34, height: 34, borderRadius: 9 },
  pipN: { fontFamily: font.bodyBold, fontSize: 18 },
  ringN: { fontFamily: font.display, fontSize: 20, lineHeight: 22, color: color.ink, fontVariant: ["tabular-nums"] },
  ringOf: { fontFamily: font.body, fontSize: 10, color: color.inkMuted },
  flame: { width: 34, height: 34, borderRadius: 999, backgroundColor: color.gold, alignItems: "center", justifyContent: "center" },
  streakN: { flex: 1, fontFamily: font.bodySemibold, fontSize: 17, color: color.ink },
  weekCell: { alignSelf: "stretch", height: 34, marginBottom: 4, borderRadius: 9, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderStyle: "dashed", borderColor: color.dash },
  weekDay: { fontFamily: font.body, fontSize: 10, color: color.inkMuted },
  emptyMark: { width: 64, height: 64, borderRadius: 999, backgroundColor: "#E3F3F0", alignItems: "center", justifyContent: "center", marginBottom: 4 },
});

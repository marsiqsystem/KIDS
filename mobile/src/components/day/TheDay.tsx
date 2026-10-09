import { useState } from "react";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ChevronRight, Circle, Users } from "lucide-react-native";
import { Btn, Screen, s as kit } from "@/components/kit";
import { useSession } from "@/lib/session";
import { color, font, radius } from "@/theme";

/**
 * The coaching day — the website's TheDay, DayLate and DayAway (redesign
 * boards 12 and 13), natively. For the 65 on the programme this IS Home.
 *
 * Nothing is decided here. The server's dayFor says which block is open, what
 * each one says, which may be tapped, and which shape the day takes; this only
 * draws it. `href`s arrive as website addresses and are mapped to the app's
 * own screens below.
 */
export type BlockKind = "wake" | "ritual" | "revision" | "daily" | "school" | "class" | "homework" | "winddown";
export type DayBlock = {
  kind: BlockKind;
  label: string;
  subtitle: string | null;
  at: string;
  minutes: number | null;
  status: "done" | "now" | "ahead" | "missed" | "uncounted";
  detail: string | null;
  href: string | null;
  action: string | null;
};
export type Day = {
  programme: { name: string; week: number; weeks: number };
  date: string;
  blocks: DayBlock[];
  done: number;
  countable: number;
  shape: "morning" | "late" | "away";
  teacher: string | null;
  recording: string | null;
};

/** The website's address for a block, as a screen in this app. */
function screenFor(href: string, block?: DayBlock): Href | null {
  if (href === "/app/set") return "/set";
  if (href === "/app/day/sit") return { pathname: "/sit", params: { minutes: String(block?.minutes ?? 10) } };
  const cls = href.match(/^\/app\/class\/(\d+)$/);
  if (cls) return { pathname: "/class/[id]", params: { id: cls[1] } };
  return null;
}

const weekday = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "long" }).format(new Date(`${iso}T06:00:00Z`));

export function TheDay({ day, name, greeting, present, onChanged, refreshing, onRefresh }: { day: Day; name: string; greeting: string; present: number; onChanged: () => void; refreshing: boolean; onRefresh: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Screen pad={false} refreshing={refreshing} onRefresh={onRefresh}>
      <LinearGradient colors={[color.maroon, color.maroonDeep]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={[st.hero, { paddingTop: insets.top + 16 }]}>
        <Image source={require("@/assets/images/kids-icon.png")} style={st.crest} />
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={st.eyebrow}>
              Week {day.programme.week} of {day.programme.weeks} · {weekday(day.date)}
            </Text>
            <Text style={st.title} accessibilityRole="header">
              {greeting}, {name}
            </Text>
          </View>
          <View style={st.count} accessibilityLabel={`${day.done} of ${day.countable} done`}>
            <Text style={st.countN}>
              {day.done}
              <Text style={st.countOf}>/{day.countable}</Text>
            </Text>
            <Text style={st.countWord}>done</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
        {day.blocks.map((b, i) => (
          <View key={b.kind} style={st.row}>
            <Text style={[st.time, b.status === "now" && { color: color.maroon, fontFamily: font.bodyBold }]}>{b.at}</Text>
            <View style={st.rail}>
              <View
                style={[
                  st.dot,
                  b.status === "done" && { backgroundColor: color.teal, borderColor: color.teal },
                  b.status === "now" && { backgroundColor: color.maroon, borderColor: color.maroon },
                  b.status === "uncounted" && { borderStyle: "dashed" },
                ]}
              >
                {b.status === "done" ? <Check size={11} strokeWidth={3} color={color.white} /> : null}
              </View>
              {i < day.blocks.length - 1 ? <View style={st.line} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: 18 }}>
              <Block b={b} onChanged={onChanged} />
            </View>
          </View>
        ))}

        {/* The one line on the day that mentions anybody else. A count of one
            reads as an empty building, so then it is just "The room". */}
        <Pressable onPress={() => router.push("/room")} style={[kit.row, { marginBottom: 8 }]} accessibilityRole="button">
          <View style={kit.rowIcon}>
            <Users size={20} color={color.maroon} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={kit.rowTitle}>{present > 1 ? `${present} of your batch are working` : "The room"}</Text>
            <Text style={kit.rowLine}>See the room</Text>
          </View>
          <ChevronRight size={18} color={color.inkMuted} />
        </Pressable>
      </View>
    </Screen>
  );
}

function Block({ b, onChanged }: { b: DayBlock; onChanged: () => void }) {
  if (b.kind === "school") {
    return (
      <>
        <Text style={st.label}>School</Text>
        <Text style={kit.line}>Nothing to do here</Text>
      </>
    );
  }

  /* The one open card. */
  if (b.status === "now") {
    const to = b.href ? screenFor(b.href, b) : null;
    return (
      <View style={st.card}>
        <Text style={st.cardLabel}>{b.label}</Text>
        {b.subtitle ? <Text style={kit.line}>{b.subtitle}</Text> : null}
        {b.action ? (
          to ? (
            <Btn label={b.action} onPress={() => router.push(to)} />
          ) : (
            // Homework is marked done like revision — a tap, never a hand-in.
            <DayAction kind={b.kind} label={b.kind === "homework" ? "Done" : b.action} onDone={onChanged} />
          )
        ) : null}
      </View>
    );
  }

  return (
    <>
      <Text style={[st.label, (b.status === "missed" || b.status === "uncounted") && { color: color.inkMuted }]}>{b.label}</Text>
      {b.detail ? <Text style={kit.line}>{b.detail}</Text> : b.subtitle ? <Text style={kit.line}>{b.subtitle}</Text> : null}
      {/* A late wake keeps its button: tapping "I'm up" IS starting the day. */}
      {b.status === "missed" && b.action ? (
        <View style={{ marginTop: 8 }}>
          <DayAction kind={b.kind} label={b.action} small onDone={onChanged} />
        </View>
      ) : null}
    </>
  );
}

/** "I'm up", "Done" — a block completed in place, checked on the server. */
export function DayAction({ kind, label, small, onDone }: { kind: BlockKind; label: string; small?: boolean; onDone: () => void }) {
  const { call } = useSession();
  const [busy, setBusy] = useState(false);
  return (
    <Btn
      label={label}
      kind={small ? "outline" : "solid"}
      small={small}
      busy={busy}
      onPress={async () => {
        setBusy(true);
        try {
          await call("/day", { method: "POST", body: { kind } });
        } catch {
          // No signal: nothing marked, and the button is still there to tap.
        } finally {
          setBusy(false);
          onDone();
        }
      }}
    />
  );
}

const WORDS = ["None", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
const spell = (n: number) => (n < WORDS.length ? WORDS[n] : String(n));
/** "Mohammad Iqbal Ansari" → "Mohammad Iqbal". A surname is for a register. */
const firstTwo = (name: string) => name.split(/\s+/).slice(0, 2).join(" ");

/**
 * Past wind-down, and something did not happen. Order is the whole design:
 * what you did, then what you did not, then a way back. Missed blocks are
 * hollow grey circles — no red, no cross, no percentage.
 */
export function DayLate({ day, refreshing, onRefresh }: { day: Day; refreshing: boolean; onRefresh: () => void }) {
  const insets = useSafeAreaInsets();
  const missed = day.blocks.filter((b) => b.status === "missed");
  const kept = day.blocks.filter((b) => b.status === "done");
  const missedClass = missed.some((b) => b.kind === "class");
  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <View style={{ paddingTop: insets.top + 18 }}>
        <Text style={kit.meta}>
          Week {day.programme.week} of {day.programme.weeks} · {weekday(day.date)}
        </Text>
        <Text style={[kit.cardTitle, { fontSize: 28, marginTop: 4 }]}>Today is done</Text>
      </View>

      {kept.length > 0 ? (
        <View style={st.lateCard}>
          <Text style={kit.label}>What you did</Text>
          {kept.map((b) => (
            <View key={b.kind} style={st.lateRow}>
              <View style={st.tick}>
                <Check size={13} strokeWidth={3} color={color.white} />
              </View>
              <Text style={[kit.line, { flex: 1, color: color.ink, fontSize: 14 }]}>
                {b.label}
                {b.detail ? <Text style={{ color: color.inkMuted }}> · {b.detail}</Text> : null}
              </Text>
            </View>
          ))}
          <Text style={[kit.h, { marginTop: 6 }]}>
            {spell(kept.length)} of {day.countable}.
          </Text>
        </View>
      ) : null}

      <View style={[st.lateCard, { backgroundColor: color.creamSurface }]}>
        <Text style={kit.label}>What you did not</Text>
        {missed.map((b) => (
          <View key={b.kind} style={st.lateRow}>
            <Circle size={20} color={color.inkFaint} />
            <Text style={[kit.line, { flex: 1, color: color.ink, fontSize: 14 }]}>{b.label}</Text>
          </View>
        ))}
        {missedClass && day.recording ? <Btn label="Watch the class back" kind="outline" small onPress={() => Linking.openURL(day.recording!)} /> : null}
        <Text style={[kit.line, { marginTop: 6 }]}>That is all. Nothing else was expected today.</Text>
      </View>

      <Text style={[kit.line, { fontSize: 14, color: color.ink }]}>
        Tomorrow starts at <Text style={{ fontFamily: font.bodyBold }}>5:30</Text>.{day.teacher ? ` ${firstTwo(day.teacher)} keeps the class register.` : ""}
      </Text>
      <Btn label="Notices" kind="quiet" onPress={() => router.push("/notices")} />
    </Screen>
  );
}

/**
 * Two days or more without opening it. Welcome back and nothing else — no
 * count of days missed, no catch-up list. One button, facing forward.
 */
export function DayAway({ day }: { day: Day }) {
  const insets = useSafeAreaInsets();
  const classBlock = day.blocks.find((b) => b.kind === "class");
  const classTo = classBlock && classBlock.status !== "uncounted" && classBlock.href ? screenFor(classBlock.href) : null;
  return (
    <LinearGradient colors={["#0C2A2E", "#243B34", "#5C6B34"]} style={{ flex: 1, paddingTop: insets.top, justifyContent: "space-between" }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 }}>
        <Image source={require("@/assets/images/kids-icon.png")} style={{ width: 96, height: 96 }} />
        <Text style={{ fontFamily: font.display, fontSize: 34, color: color.cream }}>Welcome back</Text>
        <Text style={{ fontFamily: font.body, fontSize: 16, color: "#DCF1EC" }}>Your day is still here.</Text>
      </View>
      <View style={{ padding: 20, paddingBottom: insets.bottom + 20 }}>
        {classTo ? (
          <Btn label={`Today’s ${classBlock!.at} class`} kind="gold" onPress={() => router.push(classTo)} />
        ) : (
          <Btn label="Start your five questions" kind="gold" onPress={() => router.push("/set")} />
        )}
      </View>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  hero: { paddingHorizontal: 18, paddingBottom: 20, overflow: "hidden", marginBottom: 2 },
  crest: { position: "absolute", right: -18, top: -14, width: 112, height: 112, opacity: 0.1 },
  eyebrow: { fontFamily: font.body, fontSize: 13, color: color.goldLight },
  title: { fontFamily: font.display, fontSize: 24, lineHeight: 29, color: color.cream, marginTop: 2 },
  count: { alignItems: "center", backgroundColor: "rgba(253,251,247,0.12)", borderRadius: radius.lg, paddingVertical: 8, paddingHorizontal: 12 },
  countN: { fontFamily: font.display, fontSize: 26, color: color.cream, fontVariant: ["tabular-nums"] },
  countOf: { fontFamily: font.body, fontSize: 14, color: color.goldLight },
  countWord: { fontFamily: font.body, fontSize: 11, color: color.goldLight },
  row: { flexDirection: "row", gap: 10 },
  time: { width: 46, fontFamily: font.bodySemibold, fontSize: 13, color: color.inkMuted, paddingTop: 1, fontVariant: ["tabular-nums"] },
  rail: { width: 20, alignItems: "center" },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: color.dash, backgroundColor: color.cream, alignItems: "center", justifyContent: "center" },
  line: { flex: 1, width: 2, backgroundColor: color.creamMuted, marginVertical: 2 },
  label: { fontFamily: font.bodySemibold, fontSize: 15, color: color.ink },
  card: { gap: 8, backgroundColor: color.white, borderWidth: 1.5, borderColor: color.maroon, borderRadius: radius.xl, padding: 16, marginTop: -4 },
  cardLabel: { fontFamily: font.display, fontSize: 20, color: color.ink },
  lateCard: { gap: 8, backgroundColor: color.white, borderWidth: 1, borderColor: color.creamMuted, borderRadius: radius.xl, padding: 16 },
  lateRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  tick: { width: 20, height: 20, borderRadius: 10, backgroundColor: color.teal, alignItems: "center", justifyContent: "center" },
});

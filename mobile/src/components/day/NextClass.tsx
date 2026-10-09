import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ChevronRight, Radio, Video } from "lucide-react-native";
import { color, font, radius } from "@/theme";

/**
 * The next class, on Home — the website's NextClass (board 12, 1B). Nothing at
 * all for a student in no batch, which is nearly everyone. "Join" only when
 * the room is open; before that the card says who opens it.
 */
export type NextClassModel = { id: string; title: string; subject: string | null; startsAt: string; startedAt: string | null; minutes: number };

const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", ...o }).format(new Date(iso));
const time = (iso: string) => fmt(iso, { hour: "numeric", minute: "2-digit", hour12: true });
function when(iso: string): string {
  const day = (d: string) => fmt(d, { year: "numeric", month: "2-digit", day: "2-digit" });
  if (day(iso) === day(new Date().toISOString())) return `today ${time(iso)}`;
  return `${fmt(iso, { weekday: "long" })} ${time(iso)}`;
}

export default function NextClass({ c }: { c: NextClassModel | null | undefined }) {
  if (!c) return null;
  const open = Boolean(c.startedAt);
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/class/[id]", params: { id: c.id } })}
      style={[s.card, open && s.live]}
      accessibilityRole="button"
      accessibilityLabel={open ? `${c.title}. Class is open now. Join` : `${c.title}. Next class`}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {open ? <View style={s.dot} /> : <Video size={14} color={color.goldLight} />}
        <Text style={s.top}>{open ? "Class is open now" : "Next class"}</Text>
      </View>
      <Text style={s.title}>{c.title}</Text>
      <Text style={s.when}>
        {c.subject ? `${c.subject} · ` : ""}
        {open ? `started ${time(c.startedAt!)}` : when(c.startsAt)} · {c.minutes} min
      </Text>
      {open ? (
        <View style={s.join}>
          <Radio size={18} color={color.maroonDeep} />
          <Text style={s.joinText}>Join</Text>
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={s.who}>The room opens when your teacher opens it</Text>
          <ChevronRight size={14} color={color.goldLight} />
        </View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { gap: 6, backgroundColor: color.maroonDeep, borderRadius: radius.xl, padding: 16 },
  live: { borderWidth: 2, borderColor: color.gold },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.gold },
  top: { fontFamily: font.bodySemibold, fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", color: color.goldLight },
  title: { fontFamily: font.display, fontSize: 21, color: color.cream },
  when: { fontFamily: font.body, fontSize: 13, color: "#E8D9CC" },
  join: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 50, borderRadius: radius.lg, backgroundColor: color.gold, marginTop: 6 },
  joinText: { fontFamily: font.bodyBold, fontSize: 17, color: color.maroonDeep },
  who: { fontFamily: font.body, fontSize: 13, color: color.goldLight },
});

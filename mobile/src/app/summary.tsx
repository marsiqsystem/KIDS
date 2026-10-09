import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Btn, Card, Loading, Offline, Pips, Ring, Screen, Streak, s, type PipKind } from "@/components/kit";
import { useScreen } from "@/hooks/useScreen";
import { color, font } from "@/theme";

/**
 * Today's set, scored — the website's /app/set/summary (board 02, 2E). The
 * score is the hero. Counted by the server's setSummary, which the website's
 * page also reads; a question not reached is not counted against anyone.
 */
type Summary = {
  today: string;
  rows: { id: string; chapter: string; hue: string; right: boolean | null; days: number | null }[];
  correct: number;
  streak: { days: number; best: number; week: { date: string; done: boolean }[] };
  supply: { seen: number; total: number };
  newToday: number;
};

export default function SummaryScreen() {
  const insets = useSafeAreaInsets();
  const { data, failed } = useScreen<{ summary: Summary | null }>("/set/summary");

  if (!data) return failed ? <Offline show /> : <Loading />;
  const sum = data.summary;
  if (!sum) {
    return (
      <View style={{ flex: 1, backgroundColor: color.cream, padding: 24, paddingTop: insets.top + 24, gap: 14 }}>
        <Text style={s.line}>No set today.</Text>
        <Btn label="Back to Home" kind="outline" onPress={() => router.dismissTo("/")} />
      </View>
    );
  }

  const pips: PipKind[] = sum.rows.map((r) => (r.right === null ? "todo" : r.right ? "right" : "wrong"));

  return (
    <Screen pad={false}>
      <LinearGradient colors={[color.maroon, color.maroonDeep]} style={[styles.hero, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.score}>
          {sum.correct}
          <Text style={styles.of}> / {sum.rows.length}</Text>
        </Text>
        <Text style={styles.heroLine}>right today</Text>
        <Pips kinds={pips} small onDark />
      </LinearGradient>

      <View style={{ paddingHorizontal: 16, gap: 14 }}>
        <Streak
          days={sum.streak.days}
          best={sum.streak.best}
          week={sum.streak.week}
          today={sum.today}
          note={sum.streak.best > sum.streak.days ? `Best ${sum.streak.best}` : undefined}
          showWeek={false}
        />

        <Card>
          <Text style={s.label}>Coming back</Text>
          <View style={{ marginTop: 8 }}>
            {sum.rows.map((r) => (
              <View key={r.id} style={styles.backRow}>
                <View style={[styles.backDot, { backgroundColor: r.hue }]} />
                <Text style={styles.backName} numberOfLines={1}>
                  {r.chapter}
                </Text>
                {r.right === null ? (
                  <Text style={[styles.tag, { borderWidth: 1, borderColor: color.dash, color: color.inkMuted }]}>Not reached</Text>
                ) : (
                  <Text style={[styles.tag, r.right ? { backgroundColor: color.creamMuted, color: color.inkMuted } : { backgroundColor: color.goldWash, color: color.maroonDeep }]}>
                    {r.days} day{r.days === 1 ? "" : "s"}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </Card>

        {sum.supply.total > 0 ? (
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <Ring value={sum.supply.seen} total={sum.supply.total} label={`Seen ${sum.supply.seen} of ${sum.supply.total}`} />
            <View style={{ flex: 1 }}>
              <Text style={s.h}>
                Seen {sum.supply.seen} of {sum.supply.total}
              </Text>
              {sum.newToday > 0 ? <Text style={s.line}>+{sum.newToday} today</Text> : null}
            </View>
          </Card>
        ) : null}

        <Btn label="Practise a chapter" onPress={() => router.dismissTo("/learn")} />
        <Btn label="Back to Home" kind="quiet" onPress={() => router.dismissTo("/")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingBottom: 24, gap: 6, marginBottom: 2 },
  score: { fontFamily: font.display, fontSize: 64, lineHeight: 70, color: color.cream, fontVariant: ["tabular-nums"] },
  of: { fontSize: 28, color: color.goldLight },
  heroLine: { fontFamily: font.body, fontSize: 15, color: color.goldLight, marginBottom: 10 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  backDot: { width: 10, height: 10, borderRadius: 5 },
  backName: { flex: 1, fontFamily: font.body, fontSize: 14, color: color.ink },
  tag: { fontFamily: font.bodySemibold, fontSize: 11, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, overflow: "hidden" },
});

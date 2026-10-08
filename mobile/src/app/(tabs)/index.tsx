import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { CheckCheck, ChevronRight, Lock } from "lucide-react-native";
import { Btn, Card, Empty, Hero, Loading, MaroonCard, Offline, Pips, Ring, Screen, Streak, s, type PipKind } from "@/components/kit";
import SubjectChooser, { type Offer } from "@/components/SubjectChooser";
import { useScreen } from "@/hooks/useScreen";
import { color, font } from "@/theme";

/**
 * Home. Redesign board 02 — five states, one primary action at a time.
 *
 * Nothing is counted here: the server (src/app/api/m/v1/home) runs the same
 * computation as the website's Home and says which face to draw. This screen
 * only draws it.
 */
type Base = { greeting: string; name: string; cls: string; examLive: boolean; unread?: number };
type Common = Base & {
  unread: number;
  chips: string[];
  streak: { days: number; best: number; week: { date: string; done: boolean }[]; today: string };
  supply: { seen: number; total: number; unseen: number; allSeen: boolean };
  adds: { section: string; n: number }[];
};
type HomeModel =
  | (Base & { face: "coaching"; coaching: { shape: string } })
  | (Base & { face: "choose"; unread: number; noStream: boolean; perDay: number; offer: Offer[] })
  | (Common & { face: "empty" })
  | (Common & {
      face: "today" | "done";
      set: { size: number; answered: number; started: boolean; newCount: number; revision: number; pips: PipKind[]; missed: string[] };
    });

export default function Home() {
  const { data, failed, refreshing, refresh, reload } = useScreen<HomeModel>("/home");
  if (!data) return failed ? <Screen onRefresh={refresh} refreshing={refreshing}><Offline show /></Screen> : <Loading />;

  if (data.face === "coaching") {
    return (
      <Screen pad={false} onRefresh={refresh} refreshing={refreshing}>
        <Hero eyebrow={data.greeting} title={data.name} chips={[{ label: `Class ${data.cls}` }]} />
        <View style={{ paddingHorizontal: 16 }}>
          <Card>
            <Text style={s.h}>Your coaching day</Text>
            <Text style={s.line}>
              The day&rsquo;s programme comes to this app in the next update. Until then, open it on the KIDS website.
            </Text>
          </Card>
        </View>
      </Screen>
    );
  }

  if (data.face === "choose") {
    return (
      <Screen pad={false} onRefresh={refresh} refreshing={refreshing}>
        <Hero eyebrow={data.greeting} title={data.name} chips={[{ label: `Class ${data.cls}` }]} unread={data.unread} />
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <Offline show={failed} />
          {data.noStream ? (
            <Card tone="dashed">
              <Empty title="Your stream is not on file" line="Ask the office to add Arts, Commerce or Science, then your subjects appear here." />
            </Card>
          ) : (
            <>
              <View style={{ alignItems: "center", marginTop: 6 }}>
                <Text style={s.cardTitle}>Pick your subjects</Text>
                <Text style={s.line}>Three is a good number.</Text>
              </View>
              <SubjectChooser offer={data.offer} cta="Start with these" onSaved={reload} />
            </>
          )}
        </View>
      </Screen>
    );
  }

  const { supply, streak } = data;
  const done = data.face === "done";
  const chips = done ? undefined : data.chips.map((label) => ({ label, gold: label.startsWith("★") }));

  return (
    <Screen pad={false} onRefresh={refresh} refreshing={refreshing}>
      <Hero eyebrow={data.greeting} title={data.name} chips={chips} unread={data.unread} />
      <View style={{ paddingHorizontal: 16, gap: 14 }}>
        <Offline show={failed} />

        {data.face === "empty" ? (
          <Card tone="dashed" style={{ alignItems: "center", gap: 10 }}>
            <Empty icon={<CheckCheck size={34} strokeWidth={1.9} color={color.teal} />} title="Nothing to practise today" />
            <Btn label="Add a subject" kind="outline" small onPress={() => router.push("/subjects")} />
          </Card>
        ) : done ? (
          <>
            {/* 1D — done. */}
            <MaroonCard style={{ alignItems: "center", gap: 14, paddingVertical: 22 }}>
              <Image source={require("@/assets/images/kids-icon.png")} style={{ width: 64, height: 64 }} />
              <Text style={styles.doneTitle}>Five done</Text>
              <Pips kinds={data.set.pips} small onDark />
              <Btn label="See how it went" kind="gold" onPress={() => router.push("/set")} />
            </MaroonCard>
            <Streak {...streak} showWeek={false} />
            <Card style={{ alignItems: "center", gap: 4 }}>
              <View style={styles.locked}>
                <View style={styles.lockedFirst}>
                  <Lock size={15} color={color.inkMuted} />
                </View>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={styles.lockedPip} />
                ))}
              </View>
              <Text style={s.h}>Tomorrow&rsquo;s five</Text>
              <MidnightCountdown />
              <Text style={s.line}>Opens at midnight</Text>
            </Card>
            <Pressable onPress={() => router.push("/learn")} style={s.row}>
              <Text style={[s.rowTitle, { flex: 1 }]}>Practise a chapter</Text>
              <ChevronRight size={18} color={color.inkMuted} />
            </Pressable>
          </>
        ) : (
          <>
            {/* 1B / 1C / 1E — today's five. */}
            <Card tone={data.set.started ? "live" : "lead"}>
              <View style={styles.top}>
                <Text style={s.cardTitle}>{data.set.started ? "Carry on" : "Today’s five"}</Text>
                {data.set.started ? (
                  <Text style={s.metaMaroon}>{data.set.size - data.set.answered} left</Text>
                ) : (
                  <Text style={data.set.newCount === 0 ? s.metaMaroon : s.meta}>
                    {data.set.newCount === 0
                      ? `${data.set.size} again`
                      : data.set.revision === 0
                        ? `${data.set.newCount} new`
                        : `${data.set.newCount} new · ${data.set.revision} again`}
                  </Text>
                )}
              </View>
              <Pips kinds={data.set.pips} />
              {!data.set.started && data.set.missed.length > 0 ? (
                <Missed dates={data.set.missed} />
              ) : (
                <View style={{ height: 16 }} />
              )}
              <Btn label={data.set.started ? "Carry on" : "Start"} onPress={() => router.push("/set")} />
            </Card>

            {data.set.started ? (
              <Streak {...streak} note="Finish to keep it" showWeek={false} />
            ) : streak.days > 0 || streak.week.some((d) => d.done) ? (
              <Streak {...streak} />
            ) : null}
          </>
        )}

        {/* The supply meter — always on Home. */}
        {supply.total > 0 && !done ? (
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <Ring value={supply.seen} total={supply.total} label={`Seen ${supply.seen} of ${supply.total}`} />
            <View style={{ flex: 1 }}>
              <Text style={s.h}>{supply.allSeen ? "Every one seen" : "Seen so far"}</Text>
              <Text style={s.line}>{supply.allSeen ? "Now it is all revision." : `${supply.unseen} you have never seen.`}</Text>
            </View>
          </Card>
        ) : null}

        {supply.allSeen && !done ? (
          <Card tone="dashed" style={{ alignItems: "center", gap: 10 }}>
            <Empty icon={<CheckCheck size={34} strokeWidth={1.9} color={color.teal} />} title="Want more new ones?" />
            <Btn label="Add a subject" kind="outline" small onPress={() => router.push("/subjects")} />
            {data.adds.length ? (
              <Text style={s.line}>{data.adds.map((a) => `${a.section} adds +${a.n}`).join(" · ")}</Text>
            ) : null}
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

/** "2 you missed before" — opens to the days they were got wrong. */
function Missed({ dates }: { dates: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginVertical: 12 }}>
      <Pressable onPress={() => setOpen((o) => !o)} style={{ flexDirection: "row", alignItems: "center", alignSelf: "center", minHeight: 40, gap: 4 }}>
        <Text style={[s.metaMaroon, { fontSize: 13.5 }]}>{dates.length} you missed before</Text>
        <ChevronRight size={15} color={color.maroon} style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }} />
      </Pressable>
      {open ? (
        <View style={{ alignItems: "center" }}>
          <Text style={s.line}>Wrong last time, on:</Text>
          {dates.map((d, i) => (
            <Text key={i} style={[s.line, { color: color.ink }]}>
              {d}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Hours and minutes to midnight in Kolkata, when tomorrow's five opens. */
function MidnightCountdown() {
  const [left, setLeft] = useState(() => untilIstMidnight());
  useEffect(() => {
    const t = setInterval(() => setLeft(untilIstMidnight()), 30_000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  return <Text style={styles.countdown}>{`${h}h ${String(m).padStart(2, "0")}m`}</Text>;
}

function untilIstMidnight(now = Date.now()): number {
  const ist = now + 5.5 * 3_600_000;
  const nextMidnight = Math.floor(ist / 86_400_000 + 1) * 86_400_000;
  return nextMidnight - ist;
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 16 },
  doneTitle: { fontFamily: font.display, fontSize: 28, color: color.cream },
  locked: { flexDirection: "row", gap: 6, marginBottom: 8 },
  lockedFirst: { width: 30, height: 30, borderRadius: 8, backgroundColor: color.creamSurface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: color.creamMuted },
  lockedPip: { width: 30, height: 30, borderRadius: 8, borderWidth: 1.5, borderStyle: "dashed", borderColor: color.dash },
  countdown: { fontFamily: font.display, fontSize: 30, color: color.maroon, fontVariant: ["tabular-nums"] },
});

import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Btn, Loading, s } from "@/components/kit";
import QuestionPlayer, { type PlayCard } from "@/components/QuestionPlayer";
import { useSession } from "@/lib/session";
import { color } from "@/theme";

/**
 * Today's five, played — the website's /app/set.
 *
 * No tab bar under a question. Leaving is safe: everything answered is already
 * written down, and opening it again resumes at the first one not answered.
 * Fetched once, not on focus — a refetch mid-set would pull the cards out from
 * under the child's thumb.
 */
type SetModel =
  | { ok: true; state: "play"; cards: PlayCard[]; startAt: number }
  | { ok: true; state: "subjects" | "none" | "done" };

export default function TodaysFive() {
  const { call } = useSession();
  const [data, setData] = useState<SetModel | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    call<SetModel>("/set")
      .then((d) => {
        if (!live) return;
        // Finished already, or nothing to play: go where the website would.
        if (d.state === "done") router.replace("/summary");
        else if (d.state === "subjects") router.replace("/subjects");
        else if (d.state === "none") router.back();
        else setData(d);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [call, attempt]);

  if (failed) {
    return (
      <View style={{ flex: 1, backgroundColor: color.cream, padding: 24, justifyContent: "center", gap: 14 }}>
        <Text style={[s.line, { textAlign: "center" }]}>No connection. Your answers so far are kept.</Text>
        <Btn
          label="Try again"
          onPress={() => {
            setFailed(false);
            setAttempt((a) => a + 1);
          }}
        />
        <Btn label="Back" kind="quiet" onPress={() => router.back()} />
      </View>
    );
  }
  if (!data || data.state !== "play") return <Loading />;

  return (
    <QuestionPlayer
      cards={data.cards}
      startAt={data.startAt}
      answerPath="/set"
      daily
      onDone={() => router.replace("/summary")}
      onLeave={() => router.back()}
    />
  );
}

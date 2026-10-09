import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Btn, Loading, s } from "@/components/kit";
import QuestionPlayer, { type PlayCard } from "@/components/QuestionPlayer";
import { useSession } from "@/lib/session";
import { color } from "@/theme";

/**
 * One chapter's questions, played on demand — the website's
 * /app/learn/[key]/practice. Answers are recorded exactly as the daily set's
 * are (see answerChapter on the server). Fetched once, like today's five.
 */
export default function Practice() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const { call } = useSession();
  const path = `/learn/${encodeURIComponent(key)}/practice`;
  const [cards, setCards] = useState<PlayCard[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    call<{ ok: boolean; cards?: PlayCard[] }>(path)
      .then((d) => {
        if (!live) return;
        if (!d.ok || !d.cards || d.cards.length === 0) router.back();
        else setCards(d.cards);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [call, path, attempt]);

  if (failed) {
    return (
      <View style={{ flex: 1, backgroundColor: color.cream, padding: 24, justifyContent: "center", gap: 14 }}>
        <Text style={[s.line, { textAlign: "center" }]}>No connection.</Text>
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
  if (!cards) return <Loading />;

  return <QuestionPlayer cards={cards} startAt={0} answerPath={path} daily={false} onDone={() => router.back()} onLeave={() => router.back()} />;
}

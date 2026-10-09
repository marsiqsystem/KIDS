import { View } from "react-native";
import { router } from "expo-router";
import { PlayCircle, VideoOff } from "lucide-react-native";
import { Card, Empty, Head, Loading, Offline, Row, Screen } from "@/components/kit";
import { useScreen } from "@/hooks/useScreen";
import { color } from "@/theme";

/**
 * Every recorded class this student may watch again — the website's
 * /app/recordings. One row per class; the class screen plays its parts.
 */
type RecordingsModel = { classes: { id: string; title: string; subject: string | null; startsAt: string; minutes: number }[] };

const day = (iso: string) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));

export default function Recordings() {
  const { data, failed, refresh, refreshing } = useScreen<RecordingsModel>("/recordings");
  return (
    <View style={{ flex: 1, backgroundColor: color.cream }}>
      <Head title="Recordings" />
      {!data ? (
        failed ? <Offline show /> : <Loading />
      ) : (
        <Screen onRefresh={refresh} refreshing={refreshing}>
          {data.classes.length === 0 ? (
            <Card tone="dashed">
              <Empty title="No recordings yet" line="Every live class is recorded. It appears here after the class ends." icon={<VideoOff size={30} color={color.teal} />} />
            </Card>
          ) : (
            data.classes.map((c) => (
              <Row
                key={c.id}
                icon={<PlayCircle size={22} color={color.maroon} />}
                title={c.title}
                line={`${c.subject ? `${c.subject} · ` : ""}${day(c.startsAt)} · ${c.minutes} min`}
                onPress={() => router.push({ pathname: "/class/[id]", params: { id: c.id } })}
              />
            ))
          )}
        </Screen>
      )}
    </View>
  );
}

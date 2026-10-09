import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Btn, Card, Head, Loading, Offline, Screen, s as kit } from "@/components/kit";
import { useScreen } from "@/hooks/useScreen";
import { useSession } from "@/lib/session";
import { color, font } from "@/theme";

/**
 * The room — design 8k, presence without a ladder (the website's /app/room).
 * One square per student on the programme, nobody named, including the one
 * looking. Counts and one button. No timer: the study hour runs on the
 * server's clock and outlives the phone locking.
 */
type RoomModel = { room: { total: number; present: number; doing: { label: string; n: number }[]; sittingFor: number | null } | null };

export default function Room() {
  const { data, failed, reload } = useScreen<RoomModel>("/room");
  const { call } = useSession();
  const [busy, setBusy] = useState(false);

  if (!data) return failed ? <Offline show /> : <Loading />;
  const room = data.room;

  // It never says a number lower than one: they are here; that is one.
  const shown = room ? Math.max(1, room.present) : 1;
  const sitting = room?.sittingFor !== null && room?.sittingFor !== undefined && room.sittingFor > 0;

  const toggle = async () => {
    setBusy(true);
    try {
      await call("/room", { method: "POST", body: { sit: !sitting } });
    } catch {
      // No signal: the button is unchanged, which is the truth.
    }
    setBusy(false);
    reload();
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.cream }}>
      <Head title="The room" />
      {!room ? (
        <Screen>
          <Text style={kit.line}>The room is for students on the coaching programme.</Text>
        </Screen>
      ) : (
        <Screen>
          <View style={{ alignItems: "center", marginTop: 6 }}>
            <Text style={s.big}>{shown}</Text>
            <Text style={kit.line}>of {room.total} are here now</Text>
          </View>
          <View style={s.grid} accessibilityLabel={`${room.present} of ${room.total} here`}>
            {Array.from({ length: room.total }, (_, i) => (
              <View key={i} style={[s.sq, i < shown && s.sqOn]} />
            ))}
          </View>
          <Text style={[kit.line, { textAlign: "center" }]}>One square each. No order, no names — not even yours.</Text>

          {room.doing.length > 0 ? (
            <Card>
              <Text style={kit.label}>What the room is doing</Text>
              {room.doing.map((d) => (
                <View key={d.label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
                  <Text style={kit.h}>{d.label}</Text>
                  <Text style={[kit.h, { fontVariant: ["tabular-nums"] }]}>{d.n}</Text>
                </View>
              ))}
              <Text style={kit.line}>Counted when you looked. Open the room again to see it change.</Text>
            </Card>
          ) : null}

          <Card style={{ gap: 10 }}>
            <Text style={kit.label}>Study hour</Text>
            <Text style={kit.line}>A silent hour with the room. Your square lights up; nothing else.</Text>
            {sitting ? <Text style={[kit.h, { color: color.teal }]}>You are sitting with them · {room.sittingFor} min left</Text> : null}
            <Btn label={sitting ? "Stop" : "Start a study hour"} kind={sitting ? "outline" : "solid"} busy={busy} onPress={toggle} />
          </Card>
        </Screen>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  big: { fontFamily: font.display, fontSize: 56, color: color.maroon, fontVariant: ["tabular-nums"] },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", marginVertical: 8 },
  sq: { width: 22, height: 22, borderRadius: 5, backgroundColor: color.creamMuted },
  sqOn: { backgroundColor: color.teal },
});

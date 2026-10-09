import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Btn } from "@/components/kit";
import { useSession } from "@/lib/session";
import { color, font } from "@/theme";

/**
 * Sit still, ten minutes — the website's SitStill (board 14, 2A).
 *
 * ⚠️ Built against Design's advice and by Umar's ruling of 11 Sep: the ritual is
 * the part of the day that is not about marks. What IS Design's, entirely: no
 * timer animation, no breathing graphic, no audio. The count moves by the
 * minute, not the second — a seconds display is a thing to watch. "I'm done"
 * is there from the start: a screen that traps a child is one they leave by
 * killing the app.
 */
export default function SitStill() {
  const insets = useSafeAreaInsets();
  const { call } = useSession();
  const minutes = Math.max(1, Number(useLocalSearchParams<{ minutes?: string }>().minutes) || 10);
  const [left, setLeft] = useState(minutes);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const started = Date.now();
    const tick = setInterval(() => setLeft(Math.max(0, minutes - Math.floor((Date.now() - started) / 60_000))), 5_000);
    return () => clearInterval(tick);
  }, [minutes]);

  const finish = async () => {
    setBusy(true);
    try {
      await call("/day", { method: "POST", body: { kind: "ritual" } });
    } catch {
      // No signal: the day simply still shows the block open.
    }
    router.back();
  };

  return (
    <LinearGradient colors={["#05090B", "#0C2A2E", "#243B34"]} style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom + 20, paddingHorizontal: 24 }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8 }}>
        <Text style={{ fontFamily: font.bodySemibold, fontSize: 12, letterSpacing: 1.6, textTransform: "uppercase", color: "#9FDCCB" }}>Sit still</Text>
        <Text style={{ fontFamily: font.display, fontSize: 96, color: color.cream, fontVariant: ["tabular-nums"] }}>{left > 0 ? left : minutes}</Text>
        <Text style={{ fontFamily: font.body, fontSize: 16, color: "#BCD0CC" }}>{left > 0 ? (left === 1 ? "minute left" : "minutes left") : "minutes sat"}</Text>
        <Text style={{ fontFamily: font.body, fontSize: 18, color: color.cream, marginTop: 24 }}>{left > 0 ? "Breathe out slowly." : "The day starts now."}</Text>
        <Text style={{ fontFamily: font.body, fontSize: 13, color: "#8FB0AA", marginTop: 6 }}>Nothing here is scored. Stop whenever you want.</Text>
      </View>
      <Btn label={left > 0 ? "I’m done" : "Begin the day"} kind="gold" busy={busy} onPress={finish} />
    </LinearGradient>
  );
}

import { Text, View } from "react-native";
import { Card, Head, s } from "@/components/kit";
import { color } from "@/theme";

/** Today's five, played. Phase 2 — until then this says so. */
export default function TodaysFive() {
  return (
    <View style={{ flex: 1, backgroundColor: color.cream }}>
      <Head title="Today’s five" />
      <View style={{ padding: 16 }}>
        <Card tone="dashed">
          <Text style={s.h}>Coming in the next update</Text>
          <Text style={s.line}>Answering the day’s five questions, with the reason for each answer.</Text>
        </Card>
      </View>
    </View>
  );
}

import { Text, View } from "react-native";
import { Card, Hero, Screen, s } from "@/components/kit";

/**
 * A tab whose native screen is not built yet. Says so, plainly, rather than
 * showing a mock: this build is for testing, and a tester must be able to tell
 * an unfinished screen from a broken one.
 */
export default function NotYet({ title, what }: { title: string; what: string }) {
  return (
    <Screen pad={false}>
      <Hero title={title} />
      <View style={{ paddingHorizontal: 16 }}>
        <Card tone="dashed">
          <Text style={s.h}>Coming in the next update</Text>
          <Text style={s.line}>{what}</Text>
        </Card>
      </View>
    </Screen>
  );
}

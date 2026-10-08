import { View, Text } from "react-native";
import { router } from "expo-router";
import { Card, Empty, Head, Loading, Offline, Screen, s } from "@/components/kit";
import SubjectChooser, { type Offer } from "@/components/SubjectChooser";
import { useScreen } from "@/hooks/useScreen";
import { color } from "@/theme";

/**
 * My subjects — the chooser with today's choice ticked. Dropping a subject
 * keeps its answers: a child who comes back to it finds their history waiting.
 */
type SubjectsModel = { noStream: boolean; perDay: number; offer: Offer[]; chosen: string[] };

export default function Subjects() {
  const { data, failed } = useScreen<SubjectsModel>("/subjects");
  return (
    <View style={{ flex: 1, backgroundColor: color.cream }}>
      <Head title="My subjects" />
      {!data ? (
        failed ? <Offline show /> : <Loading />
      ) : (
        <Screen>
          {data.noStream ? (
            <Card tone="dashed">
              <Empty title="Your stream is not on file" line="Ask the office to add Arts, Commerce or Science, then your subjects appear here." />
            </Card>
          ) : (
            <>
              <Text style={s.line}>
                {data.perDay} new questions a day, spread across what you choose. Dropping a subject keeps your answers.
              </Text>
              <SubjectChooser key={data.chosen.join("|")} offer={data.offer} chosen={data.chosen} cta="Save my subjects" onSaved={() => router.back()} />
            </>
          )}
        </Screen>
      )}
    </View>
  );
}

import { Text, View } from "react-native";
import { Btn, Card, Empty, Hero, Loading, Offline, Screen } from "@/components/kit";
import CheckIn from "@/components/exam/CheckIn";
import { CentreCard, ClosedNote, FourRules, OpensIn, PaperHero, PapersSat, Receipt } from "@/components/exam/Faces";
import LiveExam, { type PaperModel } from "@/components/exam/LiveExam";
import { ist } from "@/lib/clock";
import { useScreen } from "@/hooks/useScreen";
import { color } from "@/theme";

/**
 * The Exam tab — permanent, and most days it is calm. On an exam morning it is
 * the whole flow. Which face shows is decided on the server (GET
 * /api/m/v1/exam, the same examTabFor the website's Exam tab reads), never
 * from this phone's clock.
 */
type Received = { name: string; receipt: string; submitted_at: string }[];
type ExamModel =
  | { face: "none"; received: Received }
  | {
      face: "closed";
      over: boolean;
      handedIn: { paper: string; receipt: string | null; handedInIso: string; answered: number; total: number; centre: string } | null;
      received: Received;
    }
  | { face: "before"; paper: string; startsAt: string; opensAt: string; minutes: number; requiresCheckin: boolean; centre: string; serverNow: string; received: Received }
  | { face: "checkin"; centre: string }
  | ({ face: "paper"; durationMinutes: number; name: string } & PaperModel);

export default function Exam() {
  const { data, failed, refreshing, refresh, reload } = useScreen<ExamModel>("/exam");

  if (!data) return failed ? <Screen onRefresh={refresh} refreshing={refreshing}><Offline show /></Screen> : <Loading />;

  if (data.face === "checkin") return <CheckIn centreName={data.centre} onCheckedIn={reload} />;

  // Keyed by the sitting, so a different paper is a fresh runner.
  if (data.face === "paper") return <LiveExam key={`${data.uid}:${data.paperKey}`} m={data} onFinished={reload} />;

  if (data.face === "before") {
    return (
      <Screen pad={false} onRefresh={refresh} refreshing={refreshing}>
        <PaperHero name={data.paper} startsAt={data.startsAt} minutes={data.minutes} />
        <View style={{ paddingHorizontal: 16, gap: 14 }}>
          <Offline show={failed} />
          <OpensIn at={data.startsAt} serverNowIso={data.serverNow} />
          <CentreCard name={data.centre} />
          <FourRules />
          {data.requiresCheckin ? <Btn label={`Check-in opens ${ist(data.opensAt, { hour: "numeric", minute: "2-digit" })}`} disabled onPress={() => {}} /> : null}
          <PapersSat rows={data.received} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen pad={false} onRefresh={refresh} refreshing={refreshing}>
      <Hero title="Exam" />
      <View style={{ paddingHorizontal: 16, gap: 14 }}>
        <Offline show={failed} />
        {data.face === "none" ? (
          <Card tone="dashed">
            <Empty title="No exam right now" line="Your next paper will show here." />
          </Card>
        ) : (
          <>
            {data.over ? <ClosedNote started={Boolean(data.handedIn)} /> : null}
            {data.handedIn ? <Receipt {...data.handedIn} /> : null}
          </>
        )}
        <PapersSat rows={data.received} />
        {data.face === "none" && data.received.length === 0 ? (
          <Text style={{ textAlign: "center", color: color.inkMuted }}>Pull down to check again.</Text>
        ) : null}
      </View>
    </Screen>
  );
}

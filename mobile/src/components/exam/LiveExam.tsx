import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Image } from "react-native";
import { useNavigation } from "expo-router";
import { usePreventScreenCapture } from "expo-screen-capture";
import AppPaper, { AppClockFace, imageUrl, type Question, type Save } from "@/components/exam/AppPaper";
import { ChooseSubjects, HandingIn, Receipt, StartFace, WaitingRoom } from "@/components/exam/Faces";
import { useAwayWatch } from "@/components/exam/useAwayWatch";
import { istClock, useServerCountdown } from "@/lib/clock";
import { useSession } from "@/lib/session";
import { forget, readJson, writeJson } from "@/lib/store";

/**
 * The real exam — the website's LiveExam (src/components/portal/LiveExam.tsx),
 * natively, against the same endpoints (/api/app/exam/*). It keeps the same
 * four promises, so if this file changes, the FAQ changes or the promise stops:
 *
 *   "Your answers are saved as you go"   -> every tap is written to this phone
 *                                           at once, and to the server every 60 s.
 *   "keeps working with no signal"       -> the paper and the answers live on
 *                                           the phone; a dead spot costs nothing.
 *   "answers still there" on return      -> resume is the same endpoint as start.
 *   "handed in at close even if you
 *    don't press Submit"                 -> the server's clock submits for them,
 *                                           and the server finalises the last
 *                                           draft whatever happens to the phone.
 */
type Stage = "waiting" | "starting" | "choosing" | "live" | "submitting" | "submitted" | "error";
type Offer = { choose: number; serverNow: string; optional: { name: string; count: number }[]; compulsory: { name: string; count: number }[] };
type Cached = { questions: Question[]; answers: Record<string, number>; deadlineAt: string };

const DRAFT_INTERVAL_MS = 60_000;

export type PaperModel = {
  uid: string;
  paperKey: string;
  label: string;
  classLabel: string;
  centreCode: string;
  centre: string;
  questionCount: number;
  closesAt: string;
  startsAt: string;
  serverNow: string;
};

export default function LiveExam({ m, onFinished }: { m: PaperModel; onFinished: () => void }) {
  const { exam } = useSession();
  const [stage, setStage] = useState<Stage>("waiting");
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [deadlineAt, setDeadlineAt] = useState("");
  const [serverNow, setServerNow] = useState(m.serverNow);
  const [save, setSave] = useState<Save>("saved");
  const [resumed, setResumed] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);

  // Per student AND per sitting: answers are stored by question number, so a
  // cache from one paper must never be poured into another.
  const cacheKey = `kids:exam:${m.uid}:${m.paperKey}`;

  // No tab bar under a paper: a child must not be able to wander into Learn in
  // the middle of an exam — leaving for another tab is not leaving the app, so
  // the desk would never hear of it.
  const navigation = useNavigation();
  const sitting = stage === "choosing" || stage === "live" || stage === "submitting";
  useLayoutEffect(() => {
    navigation.setOptions({ tabBarStyle: sitting ? { display: "none" } : undefined });
    return () => navigation.setOptions({ tabBarStyle: undefined });
  }, [navigation, sitting]);

  const sendAway = useCallback(async (periods: unknown[]) => (await exam("away", { away: periods })).status === 200, [exam]);
  useAwayWatch({ enabled: stage === "live", send: sendAway, storageKey: `${cacheKey}:away` });

  // The countdown to the start. When it reaches zero the waiting room becomes
  // the Start button on its own, derived from the clock rather than stored.
  const toStart = useServerCountdown(m.startsAt, m.serverNow);
  const beforeStart = stage === "waiting" && toStart.total > 0;

  const readCache = useCallback(() => readJson<Cached>(cacheKey), [cacheKey]);

  /* --------------------------------------------------------------- start --- */

  const start = useCallback(async () => {
    setStage("starting");
    setError("");
    // Offline at the start but holding a cached paper from a moment ago? Sit it.
    const cached = readCache();
    try {
      const { status, data } = await exam<{
        state: string;
        questions: Question[];
        answers: Record<string, number>;
        deadlineAt: string;
        serverNow: string;
        resumed: boolean;
        choose: number;
        optional: Offer["optional"];
        compulsory: Offer["compulsory"];
      }>("start");
      if (status !== 200 || !data.ok) {
        setError(data.message ?? "Something went wrong opening your paper.");
        setStage("error");
        return;
      }
      if (data.state === "waiting") return setStage("waiting");
      if (data.state === "choose") {
        setOffer({ choose: data.choose, optional: data.optional, compulsory: data.compulsory, serverNow: data.serverNow });
        setDeadlineAt(data.deadlineAt);
        setStage("choosing");
        return;
      }
      // Already handed in, or the window shut: the tab redraws from the server.
      if (data.state === "submitted" || data.state === "over") {
        onFinished();
        return;
      }
      // The phone is the source of truth for answers it has not managed to send
      // yet, so local overlays the server's copy. On a borrowed phone local is
      // empty and the server's copy simply wins.
      const merged = { ...(data.answers ?? {}), ...(cached?.answers ?? {}) };
      setQuestions(data.questions);
      setAnswers(merged);
      setDeadlineAt(data.deadlineAt);
      setServerNow(data.serverNow);
      setResumed(Boolean(data.resumed) || Object.keys(merged).length > 0);
      writeJson(cacheKey, { questions: data.questions, answers: merged, deadlineAt: data.deadlineAt });
      setStage("live");
    } catch {
      if (cached && new Date(cached.deadlineAt) > new Date()) {
        // No signal, but we have the paper. Carry on — this is the whole point.
        setQuestions(cached.questions);
        setAnswers(cached.answers);
        setDeadlineAt(cached.deadlineAt);
        setResumed(true);
        setSave("offline");
        setStage("live");
        return;
      }
      setError("We could not reach the exam. Check your signal and try again.");
      setStage("error");
    }
  }, [exam, readCache, cacheKey, onFinished]);

  /*
   * Fetch every diagram the moment the paper arrives. A hall's Wi-Fi is at its
   * best in the first minute; the images are served "immutable", so once here
   * they come from the phone's own cache for the rest of the paper.
   */
  useEffect(() => {
    for (const q of questions) {
      for (const id of [q.image, ...(q.optionImages ?? [])]) {
        if (id) void Image.prefetch(imageUrl(id)).catch(() => {});
      }
    }
  }, [questions]);

  /* ---------------------------------------------------------------- sync --- */

  // Held in a ref so the sync interval is never rebuilt as answers change.
  const latest = useRef({ answers, deadlineAt, questions });
  useEffect(() => {
    latest.current = { answers, deadlineAt, questions };
  }, [answers, deadlineAt, questions]);

  const push = useCallback(
    async (path: "sync" | "submit") => {
      const { status, data } = await exam<{ receipt?: string | null }>(path, { answers: latest.current.answers });
      if (status === 409 || status === 403) {
        // Not a signal problem, so it must not be shown as one: the paper was
        // moved to another phone, or this one can no longer save. Say so and stop.
        throw Object.assign(new Error("refused"), { refused: data.message ?? "This phone can no longer save your paper." });
      }
      if (status !== 200) throw new Error(String(status));
      return data;
    },
    [exam],
  );

  useEffect(() => {
    if (stage !== "live") return;
    const id = setInterval(async () => {
      setSave("saving");
      try {
        await push("sync");
        setSave("saved");
      } catch (e) {
        const refused = (e as { refused?: string }).refused;
        if (refused) {
          setError(refused);
          setStage("error");
          return;
        }
        // Not an error the child needs to see. Their answers are on their phone.
        setSave("offline");
      }
    }, DRAFT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [stage, push]);

  /* -------------------------------------------------------------- submit --- */

  const submit = useCallback(async () => {
    setStage("submitting");
    try {
      const data = await push("submit");
      setReceipt(data.receipt ?? null);
      setSubmittedAt(new Date().toISOString());
      setStage("submitted");
      forget(cacheKey);
    } catch (e) {
      const refused = (e as { refused?: string }).refused;
      if (refused) {
        setError(refused);
        setStage("error");
        return;
      }
      // Keep the paper on screen and let them try again. The last synced draft
      // is safe, and the server finalises it at the deadline regardless.
      setSave("offline");
      setStage("live");
    }
  }, [push, cacheKey]);

  const expire = useRef(submit);
  useEffect(() => {
    expire.current = submit;
  }, [submit]);

  /* -------------------------------------------------------------- answer --- */

  const choose = (question: number, option: number) => {
    setAnswers((prev) => {
      const next = { ...prev, [String(question)]: option };
      // Written to the phone BEFORE the network: the phone is the thing that
      // will still be here in a dead spot.
      writeJson(cacheKey, { questions: latest.current.questions, answers: next, deadlineAt: latest.current.deadlineAt });
      return next;
    });
  };

  /** Send the choice, then open the paper. The server fixes it in the same write. */
  const chooseSubjects = async (subjects: string[]) => {
    setError("");
    try {
      const { status, data } = await exam("subjects", { subjects });
      if (status !== 200) {
        setError(data.message ?? "That did not go through. Try again.");
        return;
      }
      await start();
    } catch {
      setError("We could not reach the exam. Check your signal and try again.");
    }
  };

  /* -------------------------------------------------------------- render --- */

  if (beforeStart) return <WaitingRoom name={m.label} startsAtIso={m.startsAt} serverNowIso={m.serverNow} centre={m.centre || m.centreCode} />;

  if (stage === "choosing" && offer) {
    return (
      <>
        <NoCapture />
        <ChooseSubjects
          paperLine={m.classLabel ? `${m.label} · Class ${m.classLabel}` : m.label}
          choose={offer.choose}
          optional={offer.optional}
          compulsory={offer.compulsory}
          error={error}
          onConfirm={chooseSubjects}
          closes={istClock(m.closesAt)}
          deadlineIso={deadlineAt || m.closesAt}
          serverNowIso={offer.serverNow}
        />
      </>
    );
  }

  if (stage === "waiting" || stage === "starting" || stage === "error") {
    return (
      <StartFace
        name={m.label}
        busy={stage === "starting"}
        resuming={Boolean(readCache()) && stage !== "error"}
        error={stage === "error" ? error : ""}
        onStart={start}
        questionCount={m.questionCount}
        closes={istClock(m.closesAt)}
      />
    );
  }

  if (stage === "submitted") {
    return (
      <Receipt
        paper={m.label}
        receipt={receipt}
        handedInIso={submittedAt ?? deadlineAt}
        answered={questions.filter((_, i) => String(i) in answers).length}
        total={questions.length}
        centre={m.centre}
      />
    );
  }

  const list = questions.map((_, i) => answers[String(i)] ?? null);
  return (
    <>
      <NoCapture />
      <AppPaper
        questions={questions}
        answers={list}
        onChoose={choose}
        onSubmit={submit}
        deadlineIso={deadlineAt}
        serverNowIso={serverNow}
        save={save}
        resumed={resumed}
        storageKey={`${cacheKey}:app`}
        clock={<DeadlineClock deadlineIso={deadlineAt} serverNowIso={serverNow} onExpire={() => expire.current()} />}
      />
      <HandingIn visible={stage === "submitting"} />
    </>
  );
}

/**
 * While a paper is on screen the phone refuses screenshots and screen
 * recording (FLAG_SECURE on Android, which also blanks the recent-apps
 * preview). Mounted only around the paper itself: practice is not an exam.
 */
function NoCapture() {
  usePreventScreenCapture("exam");
  return null;
}

/** Counts down against the SERVER's clock and hands in at zero. */
function DeadlineClock({ deadlineIso, serverNowIso, onExpire }: { deadlineIso: string; serverNowIso: string; onExpire: () => void }) {
  const left = useServerCountdown(deadlineIso, serverNowIso);
  const fired = useRef(false);
  useEffect(() => {
    if (left.total <= 0 && !fired.current) {
      fired.current = true;
      onExpire();
    }
  }, [left.total, onExpire]);
  return <AppClockFace seconds={Math.floor(left.total / 1000)} />;
}

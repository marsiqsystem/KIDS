import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useSession } from "@/lib/session";

/**
 * My Record's data — GET /api/m/v1/record, which hands the phone the same
 * resultViewProps the website's <ResultView> draws. Shapes copied from
 * src/lib/exam/results.ts, offline-results.ts, offline-review.ts,
 * later-results.ts and src/lib/app/record.ts on the website.
 *
 * Fetched by the Record tab and kept here, so the two marksheet screens open
 * on what the tab already has instead of pulling a hundred explained questions
 * over 3G a second time.
 */

export type QuestionStatus = "correct" | "wrong" | "blank";

export type MarkedQuestion = {
  n: number;
  q: string;
  context?: string;
  options: string[];
  answer: number;
  picked: number | null;
  status: QuestionStatus;
  classPct: number;
};

export type OnlineMarksheet = {
  marks: number;
  total: number;
  percent: number;
  correct: number;
  wrong: number;
  blank: number;
  answered: number;
  submittedAt: string | null;
  minutesTaken: number | null;
  minutesLeft: number | null;
  timedOut: boolean;
  isFullMarks: boolean;
  ranked: boolean;
  ranks: {
    classRank: number;
    percentile: number | null;
    centreRank: number;
    schoolRank: number;
    classSat: number;
    centreSat: number;
    schoolSat: number;
  } | null;
  classAvg: number;
  classHigh: number;
  questions: MarkedQuestion[];
  shone: MarkedQuestion[];
  revise: MarkedQuestion[];
  cohort: { enrolled: number; sat: number; absent: number; average: number; fullMarks: number };
};

export type OfflineStatus = "correct" | "wrong" | "blank" | "double" | "grace";

export type OfflineSection = {
  name: string;
  first: number;
  last: number;
  total: number;
  marks: number;
  percent: number;
  classAvg: number | null;
};

export type OfflineMarksheet = {
  marks: number;
  total: number;
  percent: number;
  correct: number;
  wrong: number;
  blank: number;
  grace: number;
  doubles: number;
  isFullMarks: boolean;
  classRank: number | null;
  percentile: number | null;
  classSat: number;
  classAvg: number;
  ranked: boolean;
  sections: OfflineSection[];
};

export type ReviewedQuestion = {
  n: number;
  marked: string | null;
  second: string | null;
  key: string | null;
  status: OfflineStatus;
  section: string;
  classPct: number | null;
  stem: string;
  context: string | null;
  options: string[];
  answerIndex: number | null;
  pickedIndex: number | null;
  chapter: string;
  whyCorrect: string | null;
  whyWrong: string | null;
  whyOthers: { index: number; text: string }[];
};

export type InteractiveTemplate =
  | "match-pairs"
  | "sort-bins"
  | "true-false"
  | "step-solve"
  | "timeline-order"
  | "fill-blank"
  | "formula-pick"
  | "odd-one-out"
  | "label-diagram"
  | "transform";

export type LearnCard = {
  chapter: string;
  section: string;
  correct: number;
  total: number;
  trick: string;
  videoId: string | null;
  videoLanguage: string | null;
  template: InteractiveTemplate;
  data: Record<string, unknown>;
  playable: boolean;
};

export type ResultModel = {
  name: string;
  uid: string;
  classLabel: string;
  stream: string | null;
  school: string;
  centre: string;
  publishedOn: string;
  online: OnlineMarksheet | null;
  offline: OfflineMarksheet | null;
  offlinePublished: boolean;
  offlineQuestions: ReviewedQuestion[];
  offlineLearn: LearnCard[];
  marksheetHref: string;
};

export type LaterResult = {
  paper_name: string;
  kind: "live" | "mock";
  cohort: string;
  marks: number;
  question_count: number;
  correct: number;
  wrong: number;
  blank: number;
  cohort_rank: number | null;
  cohort_sat: number;
  cohort_avg: number | null;
  cohort_high: number | null;
  ranked: boolean;
  receipt: string | null;
  timed_out: boolean;
};

export type AwardResult = {
  series_name: string;
  phase1_percent: number | null;
  phase2_percent: number | null;
  phases: number;
  award_percent: number;
  list: "all" | "both" | "one";
  cohort: string;
  rank: number | null;
  ranked: boolean;
  cohort_size: number;
};

export type Practice = {
  answered: number;
  right: number;
  accuracy: number | null;
  weeks: { week: string; label: string; seen: number; right: number; pct: number }[];
};

export type RecordModel = { result: ResultModel; practice: Practice; later: LaterResult[]; award: AwardResult | null };

// Keyed to the session token: a sign-out and a different child signing in on
// the same phone must never be shown the first child's record, even briefly.
let cached: { token: string; model: RecordModel } | null = null;

/**
 * The record: the cached copy at once, refreshed when the screen comes into
 * view. `fresh: false` (the marksheet screens) skips the refresh when a copy
 * is already here.
 */
export function useRecord({ fresh = true }: { fresh?: boolean } = {}) {
  const { call, token } = useSession();
  const mine = cached && cached.token === token ? cached.model : null;
  const [data, setData] = useState<RecordModel | null>(mine);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const model = await call<RecordModel>("/record");
      cached = token ? { token, model } : null;
      setData(model);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [call, token]);

  useFocusEffect(
    useCallback(() => {
      if (fresh || !mine) load();
    }, [fresh, mine, load]),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return { data, failed, refreshing, refresh };
}

export const num = (n: number) => n.toLocaleString("en-IN");

/**
 * The five practice questions.
 *
 * Deliberately easy and deliberately NOT from the real paper — the point of the
 * practice test is that the student has seen the *screen* before, not the
 * questions. Nothing here is recorded or scored server-side.
 *
 * There is no `answer` field, and that is deliberate: the real paper will not
 * tell a student how they did the moment they submit, so neither does this one.
 * Practice is here to make the interface familiar, not to mark them.
 */
import type { Question } from "./question";

export const PRACTICE_QUESTIONS: Question[] = [
  {
    q: "Which of these is the odd one out?",
    options: ["Rose", "Lotus", "Mango", "Jasmine"],
  },
  {
    q: "Which number completes the pattern?  2, 6, 12, 20, __",
    options: ["28", "30", "32", "36"],
  },
  {
    context:
      "A train leaves Howrah at 9:00 AM and reaches Bandel at 10:00 AM, a distance of 40 km.",
    q: "What was its average speed?",
    options: ["20 km/h", "40 km/h", "60 km/h", "80 km/h"],
  },
  {
    q: "Which of these is the largest?",
    options: ["0.7", "0.09", "0.65", "0.5"],
  },
  {
    q: "The capital of West Bengal is __",
    options: ["Patna", "Kolkata", "Ranchi", "Cuttack"],
  },
];

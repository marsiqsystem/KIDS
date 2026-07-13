/**
 * The five practice questions.
 *
 * Deliberately easy and deliberately NOT from the real paper — the point of the
 * practice test is that the student has seen the *screen* before, not the
 * questions. Nothing here is recorded or scored server-side.
 */
export type PracticeQuestion = {
  q: string;
  options: string[];
  answer: number;
};

export const PRACTICE_QUESTIONS: PracticeQuestion[] = [
  {
    q: "Which number completes the pattern?  2, 6, 12, 20, __",
    options: ["28", "30", "32", "36"],
    answer: 1,
  },
  {
    q: "What is the capital of India?",
    options: ["Mumbai", "New Delhi", "Kolkata", "Chennai"],
    answer: 1,
  },
  {
    q: "Which planet is known as the Red Planet?",
    options: ["Venus", "Jupiter", "Mars", "Saturn"],
    answer: 2,
  },
  {
    q: "Choose the word closest in meaning to 'happy'.",
    options: ["Tired", "Angry", "Joyful", "Sad"],
    answer: 2,
  },
  {
    q: "What is 25% of 200?",
    options: ["25", "40", "50", "75"],
    answer: 2,
  },
];

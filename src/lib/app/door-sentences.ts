import { firstName } from "@/lib/exam/portal-auth";
import type { SignIn, Claim } from "@/lib/app/accounts";

/**
 * What the front door says when it says no — one copy, for the website's
 * server actions (src/app/app/actions.ts) and the native app's endpoints
 * (src/app/api/m/v1/session, /door/*). Two copies of these sentences would be
 * two front doors that drift apart, and design 4a is built on exactly how each
 * refusal reads.
 *
 * Each refusal names the field to redden, the sentence, and — when there is
 * one — the way out, by WHICH screen rather than by address: the website turns
 * `to` into a link (doorHref), the app into one of its own screens.
 */
export type DoorWayOut = { label: string; to: "claim" | "reset" | "ask" | "signin" };
export type DoorRefusal<F extends string> = { field: F; message: string; next?: DoorWayOut };

/** The website's address for a way out. */
export function doorHref(next: DoorWayOut, uid: string): string {
  switch (next.to) {
    case "claim":
      return `/app/claim?id=${uid}`;
    case "ask":
      return `/app/claim/ask?id=${uid}`;
    case "signin":
      return `/app/sign-in?id=${uid}`;
    default:
      return `/app/reset?id=${uid}`;
  }
}

// Names nobody. A stranger typing nine digits must not learn whether they
// guessed a real child, and a student on the wrong number needs to be told how
// the number is built, not who owns it.
const UNKNOWN_ID: DoorRefusal<"uid"> = {
  field: "uid",
  message: "No student with that number. Check the 9 digits on your KIDS card.",
  next: { label: "Ask the office", to: "reset" },
};

export function signInRefusal(result: Exclude<SignIn, { ok: true }>): DoorRefusal<"uid" | "password"> {
  switch (result.reason) {
    case "unknown_id":
      return UNKNOWN_ID;
    case "unclaimed":
      return {
        field: "password",
        message: `${firstName(result.student.name)}, this account has no password yet. Claim it first.`,
        next: { label: "Claim your account", to: "claim" },
      };
    case "locked":
      return {
        field: "password",
        // Resting, not locked out: the consequence is the app's, not the child's.
        message: `Three wrong tries. The app rests for ${result.minutes} ${result.minutes === 1 ? "minute" : "minutes"} — or ask the office.`,
        next: { label: "Show the office my details", to: "reset" },
      };
    case "bad_password":
      return {
        field: "password",
        // Names the student back to them, deliberately: on a shared handset this
        // is the fastest way to see you are typing into your sister's account.
        message:
          `That password is not right for ${firstName(result.student.name)}. ` +
          (result.triesLeft > 0
            ? `${result.triesLeft} ${result.triesLeft === 1 ? "try" : "tries"} left before the app rests for 15 minutes.`
            : `The app now rests for 15 minutes.`),
        next: { label: "Forgot password", to: "reset" },
      };
    default:
      return { field: "uid", message: "Check your User ID and password." };
  }
}

export function claimRefusal(result: Exclude<Claim, { ok: true }>): DoorRefusal<"uid" | "dob"> {
  switch (result.reason) {
    case "unknown_id":
      return UNKNOWN_ID;
    case "already_claimed":
      return {
        field: "uid",
        message: "This account is already open. Sign in with your password.",
        next: { label: "Sign in", to: "signin" },
      };
    case "no_dob":
      // Children with no date of birth on the register are not asked to guess
      // one; they are sent to the office, as if they had forgotten a password.
      return {
        field: "dob",
        message: "We have no date of birth for you. Ask the KIDS office — this app opens by itself when they approve.",
        next: { label: "Ask KIDS to open my account", to: "ask" },
      };
    case "wrong_dob":
      // Says nothing about which part was wrong: this is the one field standing
      // between a guessed ID and a child's account.
      return {
        field: "dob",
        message: "That date of birth does not match. Use the date on your school records.",
        next: { label: "Ask KIDS to open my account", to: "ask" },
      };
    case "too_many_dob":
      // The same way out as a child with no date of birth on file.
      return {
        field: "dob",
        message: "Too many wrong dates of birth for this account today. Ask the KIDS office to open it — this app opens by itself when they approve.",
        next: { label: "Ask KIDS to open my account", to: "ask" },
      };
    default:
      return { field: "uid", message: "Check your User ID and date of birth." };
  }
}

export function askRefusal(reason: "unknown_id" | "name" | "father" | "no_device"): DoorRefusal<"uid" | "name" | "father"> {
  switch (reason) {
    case "unknown_id":
      return { field: "uid", message: "No student with that number. Check the 9 digits on your KIDS card." };
    case "name":
      return { field: "name", message: "Type your full name, as it is written at school." };
    case "father":
      return { field: "father", message: "Type your father's or guardian's full name." };
    default:
      return {
        field: "uid",
        message: "This phone could not be recognised, so the office has nowhere to send the approval. Call the office instead.",
      };
  }
}

export function registerRefusal(reason: "incomplete" | "unknown_school"): DoorRefusal<"name" | "school"> {
  return reason === "unknown_school"
    ? { field: "school", message: "We do not know that school. Choose one from the list." }
    : { field: "name", message: "Something is missing. Check every box and try again." };
}

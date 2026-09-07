"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signIn, claimAccount, logAppEvent } from "@/lib/app/accounts";
import { passwordProblem } from "@/lib/app/passwords";
import { createSession, destroySession, sessionUid } from "@/lib/app/session";
import { bindDevice, readDeviceId } from "@/lib/app/devices";
import { firstName } from "@/lib/exam/portal-auth";

/**
 * Bind the account to the phone it was just opened on, then issue the session
 * for that phone. Phase 0.
 *
 * Done here, in the two actions that hand out a session, rather than anywhere
 * a page might reach: binding is an event, and the event is signing in. The
 * device id arrives as a hidden field from DeviceField; a missing one yields an
 * unbound session and never a refusal.
 */
async function startSession(uid: string, formData: FormData): Promise<void> {
  const deviceId = readDeviceId(formData.get("deviceId"));
  const userAgent = (await headers()).get("user-agent");
  await bindDevice(uid, deviceId, userAgent);
  await createSession(uid, deviceId);
}

/**
 * The front door's server actions.
 *
 * Every one of these runs on the server and returns a sentence, not a code.
 * Design 4a is built around the two refusals reading differently, so the shape
 * returned carries which field to redden as well as what to say.
 */

export type FormState = {
  /** Which control is wrong, so the form can redden it. */
  field?: "uid" | "password" | "dob";
  message?: string;
  /** A second line offering the way out — "Reset my password", and so on. */
  action?: { label: string; href: string };
  /** Kept so a failed submission does not empty the field the student just filled. */
  uid?: string;
};

const UNKNOWN_ID = (uid: string): FormState => ({
  field: "uid",
  // Names nobody. A stranger typing nine digits must not learn whether they
  // guessed a real child, and a student on the wrong number needs to be told
  // how the number is built, not who owns it.
  message:
    `There is no student with the ID ${uid}. Check the number on your admit card — ` +
    `the last four digits are your own, the first five belong to your centre and school.`,
  action: { label: "My school can look up my ID", href: `/app/reset?id=${uid}` },
  uid,
});

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const uid = String(formData.get("uid") ?? "").replace(/\D/g, "");
  const password = String(formData.get("password") ?? "");

  if (uid.length !== 9) {
    return { field: "uid", message: "Your User ID is the nine digits printed on your admit card.", uid };
  }
  if (!password) {
    return { field: "password", message: "Type your password.", uid };
  }

  const result = await signIn(uid, password);

  if (result.ok) {
    await startSession(uid, formData);
    // An office-issued password is a one-time key, never a standing password.
    // schema.sql promises the student "is made to choose a new one before
    // anything else happens"; this is the line that makes that true. Without
    // it, must_change was written and never read, and a password a teacher
    // knows would quietly become the child's permanent one.
    if (result.mustChange) redirect("/app/profile/password?must=1");
  } else {
    switch (result.reason) {
      case "unknown_id":
        return UNKNOWN_ID(result.uid);

      case "unclaimed":
        return {
          field: "password",
          message:
            `We know ${uid} · ${result.student.name}, but no password has been set on this ` +
            `account yet. Claim it and choose one — it takes a minute.`,
          action: { label: "I sat SET 2026 — claim my account", href: `/app/claim?id=${uid}` },
          uid,
        };

      case "locked":
        return {
          field: "password",
          message:
            `Too many wrong passwords. This account is locked for ${result.minutes} ` +
            `${result.minutes === 1 ? "minute" : "minutes"}. Nothing has happened to your record.`,
          action: { label: "Reset my password", href: `/app/reset?id=${uid}` },
          uid,
        };

      case "bad_password":
        return {
          field: "password",
          // Names the student back to them, deliberately: on a shared handset
          // this is the fastest way to see you are typing into your sister's
          // account. The unknown-ID message above never names anyone.
          message:
            `We know ${uid} · ${result.student.name}, but that password is wrong. ` +
            (result.triesLeft > 0
              ? `${result.triesLeft} more ${result.triesLeft === 1 ? "try" : "tries"} before the account locks for fifteen minutes.`
              : `The account is now locked for fifteen minutes.`),
          action: { label: "Reset my password", href: `/app/reset?id=${uid}` },
          uid,
        };

      default:
        return { field: "uid", message: "Check your User ID and password.", uid };
    }
  }

  // Outside the switch, and outside any try: redirect() works by throwing.
  redirect("/app");
}

export async function claimAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const uid = String(formData.get("uid") ?? "").replace(/\D/g, "");
  const day = String(formData.get("dobDay") ?? "").trim();
  const month = String(formData.get("dobMonth") ?? "").trim();
  const year = String(formData.get("dobYear") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (uid.length !== 9) {
    return { field: "uid", message: "Your User ID is the nine digits printed on your admit card.", uid };
  }
  if (!day || !month || !year) {
    return { field: "dob", message: "Type your date of birth as it is printed on your admit card.", uid };
  }

  const problem = passwordProblem(password, uid);
  if (problem) return { field: "password", message: problem, uid };

  const result = await claimAccount(uid, `${day}-${month}-${year}`, password);

  if (!result.ok) {
    switch (result.reason) {
      case "unknown_id":
        return UNKNOWN_ID(result.uid);

      case "already_claimed":
        return {
          field: "uid",
          message: `${uid} · ${result.student.name} already has a password. Sign in with it.`,
          action: { label: "Reset my password", href: `/app/reset?id=${uid}` },
          uid,
        };

      case "no_dob":
        // 1,061 children on the register have no date of birth. They are not
        // asked to guess at one; they are sent to a teacher, exactly as if they
        // had forgotten a password.
        return {
          field: "dob",
          message:
            `We do not hold a date of birth for ${uid} · ${firstName(result.student.name)}, ` +
            `so we cannot check it. Your school or the KIDS office can set your password by hand.`,
          action: { label: "How to get it set", href: `/app/reset?id=${uid}` },
          uid,
        };

      case "wrong_dob":
        // Names nobody and says nothing about which part was wrong: this is the
        // one field standing between a guessed ID and a child's account.
        return {
          field: "dob",
          message:
            "That date of birth does not match the one on the register. Type it exactly as it is " +
            "printed on your admit card.",
          action: { label: "It is wrong on my card", href: `/app/reset?id=${uid}` },
          uid,
        };

      default:
        return { field: "uid", message: "Check your User ID and date of birth.", uid };
    }
  }

  await startSession(uid, formData);
  redirect("/app");
}

export async function signOutAction(): Promise<void> {
  const uid = await sessionUid();
  if (uid) await logAppEvent(uid, "signout");
  await destroySession();
  // Not straight to the password box. Design 7a: the screen after sign-out says
  // the phone is clear and offers the next child the door — on a shared handset
  // that sentence is the whole point of having signed out.
  redirect("/app/sign-in?left=1");
}

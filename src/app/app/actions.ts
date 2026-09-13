"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signIn, claimAccount, logAppEvent, openApprovedAccount } from "@/lib/app/accounts";
import { applyToRegister, applicationForDevice, type PendingApplication } from "@/lib/app/registrations";
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

/* ------------------------------------------------------- registration --- */

/**
 * "I am new to KIDS."
 *
 * Registration lives inside the app rather than on a web form, and that is a
 * product decision with a reason: a family who registers on a website has
 * credentials to keep and a second sign-in to get through when the app finally
 * arrives. Here they install once, apply, and the same installation is handed
 * its account the moment the office approves it.
 *
 * Nothing here creates a student. It creates an APPLICATION -- no UID, invisible
 * to the exam and to every published total -- and a named office account turns
 * it into a student later. See src/lib/admin/registrations.ts.
 */
export type RegisterState = {
  field?: "name" | "dob" | "class" | "school";
  message?: string;
  ok?: boolean;
};

export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const name = String(formData.get("name") ?? "").trim();
  const day = String(formData.get("dobDay") ?? "").trim().padStart(2, "0");
  const month = String(formData.get("dobMonth") ?? "").trim().padStart(2, "0");
  const year = String(formData.get("dobYear") ?? "").trim();
  const cls = String(formData.get("class") ?? "").trim().toUpperCase();
  const stream = String(formData.get("stream") ?? "").trim();
  const school = String(formData.get("school") ?? "").trim();
  const phone = String(formData.get("guardianPhone") ?? "").trim();
  const deviceId = readDeviceId(formData.get("deviceId"));

  if (name.length < 2) {
    return { field: "name", message: "Type your full name, as it is written at school." };
  }
  if (!/^\d{2}$/.test(day) || !/^\d{2}$/.test(month) || !/^\d{4}$/.test(year)) {
    return { field: "dob", message: "Type your date of birth as day, month and year." };
  }
  if (!["IX", "X", "XI", "XII"].includes(cls)) {
    return { field: "class", message: "Choose the class you are in this year." };
  }
  // The school arrives as "CTR-13|SC-04" — the pair that identifies a school.
  // `school_code` alone is a per-centre index and names twenty-one different
  // schools, so it is never sent or stored on its own.
  const [centreCode, schoolCode] = school.split("|");
  if (!centreCode || !schoolCode) {
    return { field: "school", message: "Choose your school from the list." };
  }

  const result = await applyToRegister({
    name,
    dob: `${day}-${month}-${year}`,
    class: cls,
    stream: cls === "XI" || cls === "XII" ? stream || null : null,
    centre_code: centreCode,
    school_code: schoolCode,
    guardian_phone: phone || null,
    device_id: deviceId,
  });

  if (!result.ok) {
    switch (result.reason) {
      case "incomplete":
        return { field: "name", message: "Something is missing. Check every box and try again." };
      case "unknown_school":
        return { field: "school", message: "We do not know that school. Choose one from the list." };
      case "already_pending":
        // Not an error worth a red box: they tapped twice, or came back later.
        return { ok: true };
    }
  }

  return { ok: true };
}

/**
 * What this phone applied for, if anything.
 *
 * Called from the client on mount rather than read during the render, because
 * the installation id lives in localStorage and a server component cannot see
 * it. One indexed lookup.
 */
export async function registrationStatusAction(
  deviceId: string,
): Promise<PendingApplication | null> {
  const id = readDeviceId(deviceId);
  if (!id) return null;
  return applicationForDevice(id);
}

/**
 * Approved — open the account, on this phone, without a sign-in.
 *
 * The office has already checked who this child is; that is what approval
 * means, and it is a stronger check than the date of birth the claim screen
 * asks for. So nothing is verified again here. The student chooses a password
 * and is in.
 *
 * They are asked for one at all -- rather than simply being let through --
 * because an account with no password can never be recovered onto another
 * handset, and a lost phone would otherwise cost a child their registration.
 */
export async function finishRegistrationAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const deviceId = readDeviceId(formData.get("deviceId"));
  const password = String(formData.get("password") ?? "");

  const application = deviceId ? await applicationForDevice(deviceId) : null;
  if (!application || application.status !== "approved" || !application.uid) {
    return {
      field: "password",
      message: "This application is not approved yet. Nothing to open.",
    };
  }

  const uid = application.uid;
  const problem = passwordProblem(password, uid);
  if (problem) return { field: "password", message: problem, uid };

  const opened = await openApprovedAccount(uid, password);
  if (!opened) {
    return {
      field: "password",
      message:
        `${uid} already has a password. Sign in with it, or reset it if you do not remember.`,
      action: { label: "Sign in", href: `/app/sign-in?id=${uid}` },
      uid,
    };
  }

  await startSession(uid, formData);
  redirect("/app");
}

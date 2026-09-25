"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signIn, claimAccount, logAppEvent, findAccount } from "@/lib/app/accounts";
import { applyToRegister, applicationForDevice, type PendingApplication } from "@/lib/app/registrations";
import { requestCorrection, FIELD_LABEL, type CorrectionField } from "@/lib/app/corrections";
import { requireStudent } from "@/lib/app/gate";
import { passwordProblem } from "@/lib/app/passwords";
import { createSession, destroySession, sessionUid } from "@/lib/app/session";
import { bindDevice, readDeviceId } from "@/lib/app/devices";
import { askToOpen, doorStatus, takeHandoff, type DoorStatus } from "@/lib/app/handoff";
import { tenDigits } from "@/lib/admin/claim-match";
import { findStudent } from "@/lib/exam/db";
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
  // Redesign board 03: one sentence that says what to do next.
  message: "No student with that number. Check the 9 digits on your KIDS card.",
  action: { label: "Ask the office", href: `/app/reset?id=${uid}` },
  uid,
});

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const uid = String(formData.get("uid") ?? "").replace(/\D/g, "");
  const password = String(formData.get("password") ?? "");

  if (uid.length !== 9) {
    return { field: "uid", message: "Type the 9 digits on your KIDS card.", uid };
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
          message: `${firstName(result.student.name)}, this account has no password yet. Claim it first.`,
          action: { label: "Claim your account", href: `/app/claim?id=${uid}` },
          uid,
        };

      case "locked":
        return {
          field: "password",
          // Resting, not locked out: the consequence is the app's, not the child's.
          message: `Three wrong tries. The app rests for ${result.minutes} ${result.minutes === 1 ? "minute" : "minutes"} — or ask the office.`,
          action: { label: "Show the office my details", href: `/app/reset?id=${uid}` },
          uid,
        };

      case "bad_password":
        return {
          field: "password",
          // Names the student back to them, deliberately: on a shared handset
          // this is the fastest way to see you are typing into your sister's
          // account. The unknown-ID message above never names anyone.
          message:
            `That password is not right for ${firstName(result.student.name)}. ` +
            (result.triesLeft > 0
              ? `${result.triesLeft} ${result.triesLeft === 1 ? "try" : "tries"} left before the app rests for 15 minutes.`
              : `The app now rests for 15 minutes.`),
          action: { label: "Forgot password", href: `/app/reset?id=${uid}` },
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
    return { field: "uid", message: "Type the 9 digits on your KIDS card.", uid };
  }
  if (!day || !month || !year) {
    return { field: "dob", message: "Type your date of birth as day, month and year.", uid };
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
          message: "This account is already open. Sign in with your password.",
          action: { label: "Sign in", href: `/app/sign-in?id=${uid}` },
          uid,
        };

      case "no_dob":
        // 1,061 children on the register have no date of birth. They are not
        // asked to guess at one; they are sent to a teacher, exactly as if they
        // had forgotten a password.
        return {
          field: "dob",
          message: "We have no date of birth for you. Ask the KIDS office — this app opens by itself when they approve.",
          action: { label: "Ask KIDS to open my account", href: `/app/claim/ask?id=${uid}` },
          uid,
        };

      case "wrong_dob":
        // Names nobody and says nothing about which part was wrong: this is the
        // one field standing between a guessed ID and a child's account.
        return {
          field: "dob",
          message: "That date of birth does not match. Use the date on your school records.",
          action: { label: "Ask KIDS to open my account", href: `/app/claim/ask?id=${uid}` },
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
 * its account the moment the office approves it (openApprovedAction, below).
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
 * Step one of the claim screen: is this a child we can check by date of birth?
 *
 * Tells the screen only what sign-in already tells anybody who types a UID --
 * unknown, already open, or open to claim -- plus whether a date of birth is on
 * file. It never says whether a typed date is right: that is checked with the
 * password, in claimAction, so this cannot be used to guess a birthday.
 *
 * `no_dob` sends the child to the details step (father, phone), which goes to
 * the office as an "open my account" request instead of failing at the end.
 */
export async function claimCheckAction(rawUid: string): Promise<"unknown" | "claimed" | "no_dob" | "ok"> {
  const uid = String(rawUid ?? "").replace(/\D/g, "");
  if (uid.length !== 9) return "unknown";
  const student = await findStudent(uid);
  if (!student) return "unknown";
  if (await findAccount(uid)) return "claimed";
  return student.dob ? "ok" : "no_dob";
}

/* ---------------------------------------------------- office handoff --- */

/**
 * What this phone is waiting on. See src/lib/app/handoff.ts.
 *
 * Takes the device id as an argument, like registrationStatusAction, because it
 * lives in localStorage and only the client can read it.
 */
export async function doorStatusAction(deviceId: string): Promise<DoorStatus> {
  const id = readDeviceId(deviceId);
  if (!id) return { state: "none" };
  return doorStatus(id);
}

/**
 * Approved -- sign this phone in, with nothing typed.
 *
 * Returns only when there was nothing to open; on success it redirects, and the
 * first screen asks the child to choose their own password (the account was
 * opened with one nobody knows).
 */
export async function openApprovedAction(deviceId: string): Promise<{ opened: false }> {
  const id = readDeviceId(deviceId);
  const handed = id ? await takeHandoff(id) : null;
  if (!handed) return { opened: false };

  const userAgent = (await headers()).get("user-agent");
  await bindDevice(handed.uid, id, userAgent);
  await createSession(handed.uid, id);
  redirect("/app/profile/password?must=1&opened=1");
}

export type AskState = { field?: "uid" | "name" | "father" | "phone"; message?: string; ok?: boolean };

/** "Ask KIDS to open my account." Filed from the phone that will use it. */
export async function askOfficeAction(_prev: AskState, formData: FormData): Promise<AskState> {
  const uid = String(formData.get("uid") ?? "").replace(/\D/g, "");
  const name = String(formData.get("name") ?? "");
  const father = String(formData.get("father") ?? "");
  const phone = tenDigits(String(formData.get("guardianPhone") ?? ""));
  // Only from the claim screen's hidden field, and only in the register's shape.
  const dob = String(formData.get("dob") ?? "").trim();

  if (uid.length !== 9) return { field: "uid", message: "Type the 9 digits on your KIDS card." };
  if (!phone) return { field: "phone", message: "Type your family's 10-digit mobile number." };

  const result = await askToOpen({
    uid,
    typedName: name,
    fatherName: father,
    guardianPhone: phone,
    typedDob: /^\d{2}-\d{2}-\d{4}$/.test(dob) ? dob : null,
    deviceId: readDeviceId(formData.get("deviceId")),
  });

  if (!result.ok) {
    switch (result.reason) {
      case "unknown_id":
        return { field: "uid", message: "No student with that number. Check the 9 digits on your KIDS card." };
      case "name":
        return { field: "name", message: "Type your full name, as it is written at school." };
      case "father":
        return { field: "father", message: "Type your father's or guardian's full name." };
      case "no_device":
        return {
          field: "uid",
          message: "This phone could not be recognised, so the office has nowhere to send the approval. Call the office instead.",
        };
    }
  }
  return { ok: true };
}

/* -------------------------------------------------------- corrections --- */

export type CorrectionState = { ok?: boolean; message?: string; filed?: number };

/**
 * "My details are wrong."
 *
 * The form arrives with every field filled in from the register, and only the
 * fields the student actually changed are filed -- each as its own request, so
 * the office can accept a corrected spelling and still query a class change.
 * Nothing on the register changes until the office approves.
 */
export async function requestCorrectionsAction(
  _prev: CorrectionState,
  formData: FormData,
): Promise<CorrectionState> {
  const student = await requireStudent();
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;

  const day = String(formData.get("dobDay") ?? "").trim().padStart(2, "0");
  const month = String(formData.get("dobMonth") ?? "").trim().padStart(2, "0");
  const year = String(formData.get("dobYear") ?? "").trim();
  const dob = day !== "00" && month !== "00" && year ? `${day}-${month}-${year}` : "";

  const asked: { field: CorrectionField; value: string }[] = [
    { field: "name", value: String(formData.get("name") ?? "") },
    { field: "dob", value: dob },
    { field: "class", value: String(formData.get("class") ?? "") },
    { field: "stream", value: String(formData.get("stream") ?? "") },
    { field: "school", value: String(formData.get("school") ?? "") },
  ];

  let filed = 0;
  const refused: string[] = [];
  for (const a of asked) {
    if (!a.value.trim()) continue;
    const r = await requestCorrection({ uid: student.uid, field: a.field, newValue: a.value, note });
    if (r.ok) filed += 1;
    else if (r.reason === "already_open") refused.push(`${FIELD_LABEL[a.field]} is already waiting for the office`);
    else if (r.reason === "invalid") refused.push(`${FIELD_LABEL[a.field]} does not look right`);
    else if (r.reason === "unknown_school") refused.push("that school is not on our list");
    // "same" is not a refusal: it is a field they did not change.
  }

  if (filed === 0 && refused.length === 0) {
    return { message: "Nothing was changed. Edit the detail that is wrong, then send it." };
  }
  if (filed === 0) return { message: `Not sent: ${refused.join("; ")}.` };
  return {
    ok: true,
    filed,
    message:
      `Sent to the KIDS office. ${filed === 1 ? "It" : "They"} will check it and change your record if it is right.` +
      (refused.length ? ` Not sent: ${refused.join("; ")}.` : ""),
  };
}

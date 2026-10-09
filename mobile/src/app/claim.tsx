import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Btn } from "@/components/kit";
import { DobFields, DoorBar, Field, Refusal, grouped, st } from "@/components/doorKit";
import { api } from "@/lib/api";
import { deviceId, useSession } from "@/lib/session";
import { color } from "@/theme";

/**
 * Claim your account — for a student already on the register (board 03, 2A),
 * the website's ClaimForm, natively. The date of birth on the register is the
 * proof; the student chooses a password, and the account opens on THIS phone.
 *
 * First the number alone (/door/claim-check), which says only what sign-in
 * already says: unknown, already open, no date of birth on file, or claimable.
 * A child with no date of birth on the register is not asked to guess one —
 * they are sent to ask the office.
 */
type Way = { label: string; to: "claim" | "reset" | "ask" | "signin" };
type Refused = { field: string; message: string; next?: Way };

export default function Claim() {
  const { adopt } = useSession();
  const initial = String(useLocalSearchParams<{ id?: string }>().id ?? "").replace(/\D/g, "").slice(0, 9);
  const [uid, setUid] = useState(initial);
  const [checked, setChecked] = useState(false);
  const [d, setD] = useState("");
  const [m, setM] = useState("");
  const [y, setY] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<Refused | null>(null);
  const digits = uid.replace(/\D/g, "").slice(0, 9);

  const way = (next: Way) => {
    if (next.to === "ask") router.replace({ pathname: "/ask", params: { id: digits, day: d, month: m, year: y } });
    else if (next.to === "signin" || next.to === "claim") router.back();
    else router.replace({ pathname: "/ask", params: { id: digits } });
  };

  async function check() {
    setBusy(true);
    setRefusal(null);
    try {
      const r = await api<{ state: "unknown" | "claimed" | "no_dob" | "ok" }>("/door/claim-check", { method: "POST", body: { uid: digits } });
      if (r.state === "ok") setChecked(true);
      else if (r.state === "no_dob") router.replace({ pathname: "/ask", params: { id: digits } });
      else if (r.state === "claimed")
        setRefusal({ field: "uid", message: "This account is already open. Sign in with your password.", next: { label: "Sign in", to: "signin" } });
      else setRefusal({ field: "uid", message: "No student with that number. Check the 9 digits on your KIDS card.", next: { label: "Ask the office", to: "reset" } });
    } catch {
      setRefusal({ field: "uid", message: "No connection. Check the internet and try again." });
    }
    setBusy(false);
  }

  async function claim() {
    if (password !== again) {
      setRefusal({ field: "password", message: "The two passwords are not the same. Type them again." });
      return;
    }
    setBusy(true);
    setRefusal(null);
    try {
      const r = await api<{ ok: true; token: string } | ({ ok: false } & Refused)>("/door/claim", {
        method: "POST",
        body: { uid: digits, day: d, month: m, year: y, password, deviceId: await deviceId() },
      });
      if (r.ok) {
        // The layout swaps the door for the app by itself.
        await adopt(r.token, false);
        return;
      }
      setRefusal(r);
    } catch {
      setRefusal({ field: "uid", message: "No connection. Check the internet and try again." });
    }
    setBusy(false);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.cream }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <DoorBar title="Claim your account" />
      <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="handled">
        <Field
          label="User ID"
          value={grouped(digits)}
          onChangeText={(v) => {
            setUid(v);
            setChecked(false);
          }}
          keyboardType="number-pad"
          placeholder="000 000 000"
          maxLength={11}
          hint="The 9-digit number on your KIDS card."
          bad={refusal?.field === "uid"}
          editable={!busy}
        />
        {checked ? (
          <>
            <DobFields day={d} month={m} year={y} onDay={setD} onMonth={setM} onYear={setY} bad={refusal?.field === "dob"} />
            <Field label="Choose a password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="At least 6 characters" bad={refusal?.field === "password"} />
            <Field label="Type it again" value={again} onChangeText={setAgain} secureTextEntry autoCapitalize="none" autoCorrect={false} bad={refusal?.field === "password"} />
          </>
        ) : null}
        {refusal ? <Refusal message={refusal.message} next={refusal.next} onNext={refusal.next ? () => way(refusal.next!) : undefined} /> : null}
        <View style={{ marginTop: 4 }}>
          {checked ? (
            <Btn label={busy ? "Opening" : "Open my account"} busy={busy} disabled={!d || !m || y.length !== 4 || !password || !again} onPress={claim} />
          ) : (
            <Btn label={busy ? "Checking" : "Continue"} busy={busy} disabled={digits.length !== 9} onPress={check} />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

import { useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { CircleX, Hourglass, KeyRound, Mail } from "lucide-react-native";
import { Btn, Row } from "@/components/kit";
import { DoorBar, Field, Notice, Refusal, grouped, st } from "@/components/doorKit";
import { api } from "@/lib/api";
import { useDoorWatch } from "@/lib/door";
import { deviceId } from "@/lib/session";
import { color } from "@/theme";

/**
 * Ask KIDS to open my account — for a child on the register who cannot claim
 * (no date of birth on file, a wrong one) or has forgotten their password.
 * The website's AskOfficeScreen and reset page, natively.
 *
 * The request is filed from THIS phone (/door/ask). The office approves in the
 * Claims tab, and this phone signs itself in (useDoorWatch → /door/open), then
 * asks the child for a password of their own. Nothing is typed, read out,
 * printed or sent in between.
 */
const OFFICE_EMAIL = "kids.kol.org2003@gmail.com";

export default function Ask() {
  const params = useLocalSearchParams<{ id?: string; day?: string; month?: string; year?: string }>();
  const { door, opening, again } = useDoorWatch();
  const [uid, setUid] = useState(String(params.id ?? "").replace(/\D/g, "").slice(0, 9));
  const [name, setName] = useState("");
  const [father, setFather] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<{ field: string; message: string } | null>(null);
  const digits = uid.replace(/\D/g, "").slice(0, 9);

  async function send() {
    setBusy(true);
    setRefusal(null);
    try {
      const r = await api<{ ok: boolean; field?: string; message?: string }>("/door/ask", {
        method: "POST",
        body: { uid: digits, name, father, guardianPhone: phone, day: params.day, month: params.month, year: params.year, deviceId: await deviceId() },
      });
      if (r.ok) again();
      else setRefusal({ field: r.field ?? "uid", message: r.message ?? "That did not go through. Try again." });
    } catch {
      setRefusal({ field: "uid", message: "No connection. Check the internet and try again." });
    }
    setBusy(false);
  }

  const waiting = door?.state === "waiting";
  const refused = door?.state === "refused" ? door : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.cream }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <DoorBar title="Ask KIDS to open my account" />
      <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="handled">
        {opening || door?.state === "ready" ? (
          <Notice icon={<KeyRound size={20} color={color.teal} />} title="Approved by KIDS" tone="teal">
            Opening your account…
          </Notice>
        ) : waiting ? (
          <>
            <Notice icon={<Hourglass size={20} color={color.maroon} />} title="Your request is with the KIDS office">
              When they approve it, this app opens your account by itself. You can close the app — it opens next time you do.
            </Notice>
            <Text style={st.lead}>User ID {grouped(door.uid)} · asked as {door.typedName}</Text>
          </>
        ) : (
          <>
            {refused ? (
              <Notice icon={<CircleX size={20} color={color.maroon} />} title="The office did not approve your request" tone="maroon">
                {refused.reason ? `They wrote: “${refused.reason}”` : "Check your details and ask again, or write to the office."}
              </Notice>
            ) : (
              <Text style={st.lead}>The KIDS office checks who you are and opens your account on this phone. Fill in what your school knows you by.</Text>
            )}
            <Field label="User ID" value={grouped(digits)} onChangeText={setUid} keyboardType="number-pad" placeholder="000 000 000" maxLength={11} hint="The 9-digit number on your KIDS card." bad={refusal?.field === "uid"} />
            <Field label="Your full name" value={name} onChangeText={setName} autoCapitalize="words" placeholder="As written at school" bad={refusal?.field === "name"} />
            <Field label="Father's or guardian's name" value={father} onChangeText={setFather} autoCapitalize="words" bad={refusal?.field === "father"} />
            <Field label="Family mobile number" value={phone} onChangeText={(v) => setPhone(v.replace(/[^\d+ ]/g, ""))} keyboardType="phone-pad" placeholder="10 digits" bad={refusal?.field === "phone"} />
            {refusal ? <Refusal message={refusal.message} /> : null}
            <Btn label={busy ? "Sending" : "Send to the KIDS office"} busy={busy} disabled={digits.length !== 9 || !name || !father || !phone} onPress={send} />
          </>
        )}
        <View style={{ marginTop: 8 }}>
          <Row icon={<Mail size={20} color={color.maroon} />} title={OFFICE_EMAIL} line="Or write to the office" onPress={() => Linking.openURL(`mailto:${OFFICE_EMAIL}`)} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

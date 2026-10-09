import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Btn, Card, Head, Loading, Offline, Screen, s } from "@/components/kit";
import { useScreen } from "@/hooks/useScreen";
import { useSession } from "@/lib/session";
import { color, font, radius } from "@/theme";

/**
 * Delete my account — required by both app stores. What goes and what stays is
 * said BEFORE the button (Umar's ruling, 9 Oct 2026); the server does the same
 * deleteAppAccount the website does. On success the phone forgets its token
 * and the front door says the account is gone.
 */
export default function DeleteAccount() {
  const { call, deleted } = useSession();
  const { data, failed } = useScreen<{ needsPassword: boolean }>("/account/delete");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<{ field: "password" | "confirm"; message: string } | null>(null);

  async function go() {
    setBusy(true);
    setRefusal(null);
    try {
      const r = await call<{ ok: boolean; field?: "password" | "confirm"; message?: string }>("/account/delete", {
        method: "POST",
        body: { password, confirm },
      });
      if (r.ok) {
        await deleted();
        return;
      }
      setRefusal({ field: r.field ?? "confirm", message: r.message ?? "That did not work. Nothing has been deleted." });
    } catch {
      setRefusal({ field: "confirm", message: "No connection. Nothing has been deleted — try again." });
    }
    setBusy(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.cream }}>
      <Head title="Delete my account" />
      {!data ? (
        failed ? <Offline show /> : <Loading />
      ) : (
        <Screen>
          <Card style={{ gap: 6 }}>
            <Text style={s.label}>Deleted at once</Text>
            <Text style={s.line}>• Your app account and password, and every phone signed in to it</Text>
            <Text style={s.line}>• Your practice: answers, streak and chosen subjects</Text>
            <Text style={s.line}>• What you have read, and your coaching day’s ticks</Text>
          </Card>
          <Card style={{ gap: 6 }}>
            <Text style={s.label}>Kept by KIDS</Text>
            <Text style={s.line}>
              Your name on the register and your exam results. They are the institute’s record of the papers you sat, and deleting the app does not
              remove them.
            </Text>
            <Text style={s.line}>To use the app again later, claim your account afresh. You start with nothing practised.</Text>
          </Card>

          {data.needsPassword ? (
            <View style={{ gap: 8 }}>
              <Text style={s.label}>Your password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={[st.input, refusal?.field === "password" && { borderColor: color.danger }]}
                accessibilityLabel="Your password"
              />
            </View>
          ) : null}
          <View style={{ gap: 8 }}>
            <Text style={s.label}>Type DELETE</Text>
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              autoCapitalize="characters"
              autoCorrect={false}
              style={[st.input, refusal?.field === "confirm" && { borderColor: color.danger }]}
              accessibilityLabel="Type DELETE"
            />
          </View>
          {refusal ? <Text style={[s.line, { color: color.danger }]}>{refusal.message}</Text> : null}
          <Btn label={busy ? "Deleting" : "Delete my account"} busy={busy} onPress={go} />
        </Screen>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  input: {
    minHeight: 54,
    borderWidth: 1.5,
    borderColor: color.creamMuted,
    borderRadius: radius.lg,
    backgroundColor: color.white,
    paddingHorizontal: 14,
    fontFamily: font.body,
    fontSize: 17,
    color: color.ink,
  },
});

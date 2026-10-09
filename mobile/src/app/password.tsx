import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Eye, EyeOff, ShieldCheck } from "lucide-react-native";
import { Btn, Card, Head, Screen, s } from "@/components/kit";
import { useScreen } from "@/hooks/useScreen";
import { useSession } from "@/lib/session";
import { color, font, radius } from "@/theme";

/**
 * Change my password. The checks and the sentences are the server's
 * (src/app/api/m/v1/password), the same as the website's.
 *
 * "Password you use now" is not asked when the office has just issued a
 * one-time password: that was a key, and this screen is where it is replaced.
 */
export default function Password() {
  const { call, mustChange: mustNow, passwordChosen } = useSession();
  const { data } = useScreen<{ mustChange: boolean }>("/profile");
  const mustChange = mustNow || Boolean(data?.mustChange);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<{ field: "current" | "next"; message: string } | null>(null);
  const [done, setDone] = useState(false);

  async function save() {
    setBusy(true);
    setRefusal(null);
    try {
      const r = await call<{ ok: boolean; field?: "current" | "next"; message?: string }>("/password", {
        method: "POST",
        body: { current, next, again },
      });
      if (r.ok) setDone(true);
      else setRefusal({ field: r.field ?? "next", message: r.message ?? "That did not work. Try again." });
    } catch {
      setRefusal({ field: "next", message: "No connection. Nothing has changed — try again." });
    } finally {
      setBusy(false);
    }
  }

  const field = (label: string, value: string, set: (v: string) => void, bad: boolean) => (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={set}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.input, bad && { borderColor: color.danger }]}
        accessibilityLabel={label}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.cream }}>
      {/* On a one-time password there is nowhere to go back to: this IS the app until it is replaced. */}
      <Head title={mustNow ? "Choose your password" : "Change my password"} back={!mustNow} />
      <Screen>
        {done ? (
          <Card style={{ alignItems: "center", gap: 10 }}>
            <ShieldCheck size={34} color={color.teal} />
            <Text style={s.h}>Password changed.</Text>
            <Text style={[s.line, { textAlign: "center" }]}>Use the new one next time you sign in.</Text>
            <Btn label={mustNow ? "Open the app" : "Done"} onPress={() => (mustNow ? passwordChosen() : router.back())} />
          </Card>
        ) : (
          <>
            {mustNow ? (
              <Text style={s.line}>KIDS opened your account with a password nobody knows. Choose your own now, so you can sign in again if you change phones.</Text>
            ) : null}
            {!mustChange ? field("Password you use now", current, setCurrent, refusal?.field === "current") : null}
            {field("New password", next, setNext, refusal?.field === "next")}
            {field("New password again", again, setAgain, refusal?.field === "next")}
            <Pressable onPress={() => setShow((v) => !v)} style={styles.show} hitSlop={6}>
              {show ? <EyeOff size={18} color={color.maroon} /> : <Eye size={18} color={color.maroon} />}
              <Text style={s.metaMaroon}>{show ? "Hide" : "Show"}</Text>
            </Pressable>
            {refusal ? (
              <View style={styles.alert}>
                <Text style={styles.alertText}>{refusal.message}</Text>
              </View>
            ) : null}
            <Btn label="Change my password" onPress={save} busy={busy} disabled={!next || !again || (!mustChange && !current)} />
          </>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: color.creamMuted,
    backgroundColor: color.white,
    fontFamily: font.body,
    fontSize: 17,
    color: color.ink,
  },
  show: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", minHeight: 40 },
  alert: { padding: 14, borderRadius: radius.lg, backgroundColor: color.maroonWash },
  alertText: { fontFamily: font.body, fontSize: 14.5, lineHeight: 21, color: color.ink },
});

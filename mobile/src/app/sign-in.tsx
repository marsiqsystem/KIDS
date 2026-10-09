import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { ChevronRight, Eye, EyeOff, Hourglass, IdCard, KeyRound, Smartphone, Trash2, UserPlus } from "lucide-react-native";
import DoorHero from "@/components/DoorHero";
import { useDoorWatch } from "@/lib/door";
import { useSession, type SignInResult } from "@/lib/session";
import { color, font, radius } from "@/theme";

/**
 * Sign in. Redesign board 03, 1B and 1C — the website's SignInForm, natively.
 *
 * The sentences come from the server (src/app/api/m/v1/session), the same
 * ones the website shows, so the two front doors never disagree.
 *
 * Claim, Register and Forgot password are the app's own screens (claim, register,
 * ask). The app lands here with no session, so this is also where the office's
 * approval arrives: useDoorWatch signs the phone in before anybody types.
 */
export default function SignIn() {
  const { signIn, endedBecause } = useSession();
  const [uid, setUid] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<Extract<SignInResult, { ok: false }> | null>(null);

  const digits = uid.replace(/\D/g, "").slice(0, 9);
  const grouped = digits.replace(/(\d{3})(?=\d)/g, "$1 ");
  const { door, opening } = useDoorWatch();
  const withId = digits.length === 9 ? { id: digits } : {};

  async function submit() {
    setBusy(true);
    setRefusal(null);
    try {
      const r = await signIn(digits, password);
      if (!r.ok) setRefusal(r);
      // On success the layout swaps this screen for the app by itself.
    } catch {
      setRefusal({ ok: false, field: "uid", message: "No connection. Check the internet and try again." });
    } finally {
      setBusy(false);
    }
  }

  const goNext = () => {
    if (!refusal?.next) return;
    router.push({ pathname: refusal.next.to === "claim" ? "/claim" : "/ask", params: withId });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
        <DoorHero title="Welcome back" line="A mission of excellence in education" />

        {endedBecause === "moved" ? (
          <View style={styles.notice}>
            <Smartphone size={20} color={color.maroon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>Your account is on another phone</Text>
              <Text style={styles.noticeText}>Signing in here moves it back. Not you? Change your password after.</Text>
            </View>
          </View>
        ) : endedBecause === "deleted" ? (
          <View style={styles.notice}>
            <Trash2 size={20} color={color.maroon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>Your app account is deleted</Text>
              <Text style={styles.noticeText}>Your exam record stays with KIDS. To use the app again, claim your account afresh.</Text>
            </View>
          </View>
        ) : null}

        {/* What this phone is waiting on: an approval opens it by itself. */}
        {opening || door?.state === "ready" ? (
          <View style={[styles.notice, { backgroundColor: "#E3F3F0", borderColor: "#B7DED5" }]}>
            <KeyRound size={20} color={color.teal} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>Approved by KIDS</Text>
              <Text style={styles.noticeText}>Opening your account…</Text>
            </View>
          </View>
        ) : door?.state === "waiting" || door?.state === "refused" ? (
          <Pressable onPress={() => router.push({ pathname: "/ask", params: { id: door.uid } })} style={styles.notice} accessibilityRole="button">
            <Hourglass size={20} color={color.maroon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>{door.state === "waiting" ? "Your request is with the KIDS office" : "The office did not approve your request"}</Text>
              <Text style={styles.noticeText}>{door.state === "waiting" ? "When they approve it, this app opens your account by itself." : "See what they wrote."}</Text>
            </View>
          </Pressable>
        ) : null}

        <View style={styles.body}>
          <View style={styles.field}>
            <Text style={styles.label}>User ID</Text>
            <TextInput
              value={grouped}
              onChangeText={setUid}
              keyboardType="number-pad"
              placeholder="000 000 000"
              placeholderTextColor={color.inkFaint}
              maxLength={11}
              autoFocus
              style={[styles.input, styles.uid, refusal?.field === "uid" && styles.invalid]}
              accessibilityLabel="User ID"
            />
            <Text style={styles.hint}>The 9-digit number on your KIDS card.</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!show}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={submit}
                style={[styles.input, { paddingRight: 52 }, refusal?.field === "password" && styles.invalid]}
                accessibilityLabel="Password"
              />
              <Pressable
                onPress={() => setShow((s) => !s)}
                style={styles.eye}
                accessibilityLabel={show ? "Hide password" : "Show password"}
                hitSlop={8}
              >
                {show ? <EyeOff size={22} color={color.inkMuted} /> : <Eye size={22} color={color.inkMuted} />}
              </Pressable>
            </View>
          </View>

          {refusal ? (
            <View style={styles.alert} accessibilityLiveRegion="polite">
              <Text style={styles.alertText}>{refusal.message}</Text>
              {refusal.next ? (
                <Pressable onPress={goNext} hitSlop={6}>
                  <Text style={styles.alertAction}>{refusal.next.label}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={busy || digits.length !== 9 || !password}
            style={({ pressed }) => [
              styles.btn,
              (busy || digits.length !== 9 || !password) && styles.btnOff,
              pressed && { opacity: 0.9 },
            ]}
            accessibilityRole="button"
          >
            {busy ? <ActivityIndicator color={color.cream} /> : null}
            <Text style={[styles.btnText, (digits.length !== 9 || !password) && !busy && { color: color.inkFaint }]}>
              {busy ? "Signing in…" : "Sign in"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push({ pathname: "/ask", params: withId })}
            style={[styles.forgot, refusal && styles.forgotWeight]}
          >
            <Text style={styles.forgotText}>Forgot password</Text>
          </Pressable>

          <View style={styles.first}>
            <View style={styles.rule}>
              <View style={styles.ruleLine} />
              <Text style={styles.ruleText}>FIRST TIME</Text>
              <View style={styles.ruleLine} />
            </View>
            <Row
              main
              icon={<IdCard size={22} color={color.maroon} />}
              title="Claim your account"
              line="You already have a KIDS number."
              onPress={() => router.push({ pathname: "/claim", params: withId })}
            />
            <Row
              icon={<UserPlus size={22} color={color.inkMuted} />}
              title="Register"
              line="New to KIDS."
              onPress={() => router.push("/register")}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Row({
  icon,
  title,
  line,
  main,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  line: string;
  main?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, main && styles.rowMain, pressed && { transform: [{ translateY: 1 }] }]}
      accessibilityRole="button"
    >
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowLine}>{line}</Text>
      </View>
      <ChevronRight size={18} color={color.inkMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: "row",
    gap: 12,
    margin: 16,
    marginBottom: 0,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: "#FBF3E2",
    borderWidth: 1,
    borderColor: color.goldLight,
  },
  noticeTitle: { fontFamily: font.bodySemibold, fontSize: 15, color: color.ink },
  noticeText: { marginTop: 2, fontFamily: font.body, fontSize: 13.5, lineHeight: 19, color: color.inkMuted },
  body: { flex: 1, paddingHorizontal: 18, paddingTop: 22, paddingBottom: 28, gap: 16 },
  field: { gap: 8 },
  label: { fontFamily: font.bodySemibold, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: color.inkMuted },
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
  uid: { fontFamily: font.bodySemibold, fontSize: 22, letterSpacing: 2, fontVariant: ["tabular-nums"] },
  invalid: { borderColor: color.danger },
  hint: { fontFamily: font.body, fontSize: 12, color: color.inkMuted },
  eye: { position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center" },
  alert: { padding: 14, borderRadius: radius.lg, backgroundColor: color.maroonWash, gap: 6 },
  alertText: { fontFamily: font.body, fontSize: 14.5, lineHeight: 21, color: color.ink },
  alertAction: { fontFamily: font.bodySemibold, fontSize: 14.5, color: color.maroon },
  btn: {
    minHeight: 56,
    borderRadius: radius.lg,
    backgroundColor: color.maroon,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  btnOff: { backgroundColor: color.creamMuted },
  btnText: { fontFamily: font.bodySemibold, fontSize: 17, color: color.cream },
  forgot: { alignSelf: "center", minHeight: 44, justifyContent: "center", paddingHorizontal: 18, marginTop: -6, borderRadius: 999 },
  forgotWeight: { backgroundColor: color.maroonWash },
  forgotText: { fontFamily: font.bodySemibold, fontSize: 14, color: color.maroon },
  first: { marginTop: "auto", gap: 10 },
  rule: { flexDirection: "row", alignItems: "center", gap: 12 },
  ruleLine: { flex: 1, height: 1, backgroundColor: color.creamMuted },
  ruleText: { fontFamily: font.bodyBold, fontSize: 11, letterSpacing: 1.5, color: color.inkMuted },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 56,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: color.white,
    borderWidth: 1,
    borderColor: color.creamMuted,
    borderRadius: radius.lg,
  },
  rowMain: { borderWidth: 1.5, borderColor: color.maroonTint },
  rowTitle: { fontFamily: font.bodySemibold, fontSize: 15, color: color.ink },
  rowLine: { fontFamily: font.body, fontSize: 12.5, color: color.inkMuted },
});

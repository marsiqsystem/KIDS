import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { color, font, radius } from "@/theme";

/**
 * The front door's pieces — board 03's field, date of birth, refusal and
 * notice, as sign-in draws them, shared by Claim, Ask and Register.
 */

/** The white bar over a door screen: back, and the title. */
export function DoorBar({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[st.bar, { paddingTop: insets.top + 6 }]}>
      <Pressable onPress={() => router.back()} style={st.back} accessibilityLabel="Back" hitSlop={6}>
        <ArrowLeft size={24} color={color.ink} />
      </Pressable>
      <Text style={st.barTitle} accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

export function Field({ label, hint, bad, ...input }: { label: string; hint?: string; bad?: boolean } & TextInputProps) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={st.label}>{label}</Text>
      <TextInput placeholderTextColor={color.inkFaint} style={[st.input, bad && st.bad]} accessibilityLabel={label} {...input} />
      {hint ? <Text style={st.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Day, month, year — three boxes, as on the website; never a calendar a child scrolls back fifteen years. */
export function DobFields({
  day,
  month,
  year,
  onDay,
  onMonth,
  onYear,
  bad,
}: {
  day: string;
  month: string;
  year: string;
  onDay: (v: string) => void;
  onMonth: (v: string) => void;
  onYear: (v: string) => void;
  bad?: boolean;
}) {
  const only = (n: number, set: (v: string) => void) => (v: string) => set(v.replace(/\D/g, "").slice(0, n));
  return (
    <View style={{ gap: 8 }}>
      <Text style={st.label}>Date of birth</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput value={day} onChangeText={only(2, onDay)} placeholder="DD" keyboardType="number-pad" maxLength={2} style={[st.input, { flex: 1 }, bad && st.bad]} accessibilityLabel="Day" placeholderTextColor={color.inkFaint} />
        <TextInput value={month} onChangeText={only(2, onMonth)} placeholder="MM" keyboardType="number-pad" maxLength={2} style={[st.input, { flex: 1 }, bad && st.bad]} accessibilityLabel="Month" placeholderTextColor={color.inkFaint} />
        <TextInput value={year} onChangeText={only(4, onYear)} placeholder="YYYY" keyboardType="number-pad" maxLength={4} style={[st.input, { flex: 1.6 }, bad && st.bad]} accessibilityLabel="Year" placeholderTextColor={color.inkFaint} />
      </View>
    </View>
  );
}

/** A refusal, in the server's own words, with its way out. */
export function Refusal({ message, next, onNext }: { message: string; next?: { label: string }; onNext?: () => void }) {
  return (
    <View style={st.alert} accessibilityLiveRegion="polite">
      <Text style={st.alertText}>{message}</Text>
      {next && onNext ? (
        <Pressable onPress={onNext} hitSlop={6}>
          <Text style={st.alertAction}>{next.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Notice({ icon, title, children, tone = "gold" }: { icon: ReactNode; title: string; children?: ReactNode; tone?: "gold" | "teal" | "maroon" }) {
  return (
    <View style={[st.notice, tone === "teal" && { backgroundColor: "#E3F3F0", borderColor: "#B7DED5" }, tone === "maroon" && { backgroundColor: color.maroonWash, borderColor: color.maroonTint }]}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={st.noticeTitle}>{title}</Text>
        {children ? <Text style={st.noticeText}>{children}</Text> : null}
      </View>
    </View>
  );
}

export const grouped = (digits: string) => digits.replace(/(\d{3})(?=\d)/g, "$1 ");

export const st = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingBottom: 8, backgroundColor: color.white, borderBottomWidth: 1, borderBottomColor: color.creamMuted },
  back: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  barTitle: { flex: 1, fontFamily: font.display, fontSize: 21, color: color.ink },
  body: { padding: 18, gap: 16, paddingBottom: 32 },
  label: { fontFamily: font.bodySemibold, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: color.inkMuted },
  input: { minHeight: 56, paddingHorizontal: 16, borderRadius: radius.lg, borderWidth: 1.5, borderColor: color.creamMuted, backgroundColor: color.white, fontFamily: font.body, fontSize: 17, color: color.ink },
  bad: { borderColor: color.danger },
  hint: { fontFamily: font.body, fontSize: 13, color: color.inkMuted },
  alert: { padding: 14, borderRadius: radius.lg, backgroundColor: color.maroonWash, gap: 8 },
  alertText: { fontFamily: font.body, fontSize: 14.5, lineHeight: 21, color: color.ink },
  alertAction: { fontFamily: font.bodySemibold, fontSize: 14.5, color: color.maroon },
  notice: { flexDirection: "row", gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: "#FBF3E2", borderWidth: 1, borderColor: color.goldLight },
  noticeTitle: { fontFamily: font.bodySemibold, fontSize: 15, color: color.ink },
  noticeText: { marginTop: 2, fontFamily: font.body, fontSize: 13.5, lineHeight: 19, color: color.inkMuted },
  lead: { fontFamily: font.body, fontSize: 15, lineHeight: 22, color: color.ink },
});

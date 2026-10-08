import { Pressable, StyleSheet, Text, View } from "react-native";
import { LogOut } from "lucide-react-native";
import DoorHero from "@/components/DoorHero";
import { useSession } from "@/lib/session";
import { color, font, radius } from "@/theme";

/**
 * Home — a placeholder for Phase 0 (8 Oct 2026). It proves the round trip:
 * the token from sign-in, sent back to /api/m/v1/me, answered with the
 * student the server knows. The real Home (board 02, "the day") replaces it
 * in the next slice.
 */
export default function Home() {
  const { student, signOut } = useSession();
  return (
    <View style={{ flex: 1 }}>
      <DoorHero title={student ? `Hello, ${student.firstName}` : "Hello"} line="Signed in on this phone" />
      <View style={styles.body}>
        {student ? (
          <View style={styles.card}>
            <Text style={styles.label}>User ID</Text>
            <Text style={styles.uid}>{student.uid.replace(/(\d{3})(?=\d)/g, "$1 ")}</Text>
            <Text style={styles.line}>
              Class {student.class}
              {student.stream ? ` · ${student.stream}` : ""}
            </Text>
            <Text style={styles.line}>{student.school}</Text>
          </View>
        ) : (
          <Text style={styles.line}>No connection. Your details appear when the phone is back online.</Text>
        )}
        <Pressable onPress={signOut} style={styles.out} accessibilityRole="button">
          <LogOut size={20} color={color.maroon} />
          <Text style={styles.outText}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 18, gap: 16 },
  card: { padding: 18, borderRadius: radius.lg, backgroundColor: color.white, borderWidth: 1, borderColor: color.creamMuted, gap: 4 },
  label: { fontFamily: font.bodySemibold, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: color.inkMuted },
  uid: { fontFamily: font.bodySemibold, fontSize: 22, letterSpacing: 2, color: color.ink, fontVariant: ["tabular-nums"] },
  line: { fontFamily: font.body, fontSize: 15, lineHeight: 22, color: color.inkMuted },
  out: {
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: color.maroon,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  outText: { fontFamily: font.bodySemibold, fontSize: 16, color: color.maroon },
});

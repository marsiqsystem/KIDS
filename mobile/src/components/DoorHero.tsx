import { Image, StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, font } from "@/theme";

/**
 * The maroon hero at the top of the front door. Redesign board 03 —
 * the same hero as the website's DoorHero (src/components/app/door.tsx):
 * the KIDS mark, a ghost of it in the corner, a serif title, a gold line.
 */
export default function DoorHero({ title, line }: { title: string; line?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={[color.maroon, color.maroonDeep]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={[styles.hero, { paddingTop: insets.top + 34 }]}
    >
      <Image source={require("@/assets/images/kids-icon.png")} style={styles.ghost} accessibilityElementsHidden />
      <Image source={require("@/assets/images/kids-icon.png")} style={styles.mark} accessibilityLabel="KIDS" />
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {line ? <Text style={styles.line}>{line}</Text> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: { overflow: "hidden", paddingHorizontal: 20, paddingBottom: 30, alignItems: "center" },
  ghost: { position: "absolute", left: -30, bottom: -34, width: 150, height: 150, opacity: 0.08 },
  mark: { width: 64, height: 64, marginBottom: 14 },
  title: { fontFamily: font.display, fontSize: 28, lineHeight: 34, color: color.cream, textAlign: "center" },
  line: { marginTop: 7, fontFamily: font.body, fontSize: 13, letterSpacing: 0.5, color: color.goldLight, textAlign: "center" },
});

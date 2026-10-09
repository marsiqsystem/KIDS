import { useEffect, useState, type ReactNode } from "react";
import { Image, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Application from "expo-application";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { Btn } from "@/components/kit";
import { api } from "@/lib/api";
import { color, font, radius } from "@/theme";

/**
 * The version check — GET /api/m/v1/version against this phone's build
 * (android.versionCode / ios.buildNumber in app.json, read back natively).
 *
 * Below the minimum: one screen, the store button, nothing else — a screen
 * that half-works against a changed server is worse than "update first".
 * Below the latest: a card at the foot the child may close.
 * No answer (no signal, or the server down): the app runs as it is. A version
 * check must never be the reason a child cannot open their notices.
 */
type Version = { latest: number; minimum: number; notes: string; store: { android: string; ios: string } };

export default function UpdateGate({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [v, setV] = useState<Version | null>(null);
  const [closed, setClosed] = useState(false);
  const build = Number(Application.nativeBuildVersion);

  useEffect(() => {
    api<Version>("/version")
      .then(setV)
      .catch(() => {});
  }, []);

  if (!v || !Number.isFinite(build)) return <>{children}</>;
  const store = Platform.OS === "ios" ? v.store.ios : v.store.android;

  if (build < v.minimum) {
    return (
      <View style={[st.full, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
        <View style={{ alignItems: "center", gap: 12, flex: 1, justifyContent: "center" }}>
          <Image source={require("@/assets/images/kids-icon.png")} style={{ width: 88, height: 88 }} />
          <Text style={st.title}>Update the app</Text>
          <Text style={st.line}>This version of the KIDS app no longer works. The new one is waiting in the store — your account and everything in it are kept.</Text>
        </View>
        <Btn label="Update" kind="gold" onPress={() => Linking.openURL(store)} />
      </View>
    );
  }

  return (
    <>
      {children}
      {build < v.latest && !closed ? (
        <View style={[st.card, { bottom: insets.bottom + 76 }]} accessibilityRole="alert">
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={st.cardTitle}>An update is ready</Text>
            <Text style={st.cardLine}>{v.notes}</Text>
          </View>
          <Pressable onPress={() => Linking.openURL(store)} style={st.cardBtn} accessibilityRole="button">
            <Text style={st.cardBtnText}>Update</Text>
          </Pressable>
          <Pressable onPress={() => setClosed(true)} hitSlop={8} accessibilityLabel="Not now">
            <X size={18} color={color.cream} />
          </Pressable>
        </View>
      ) : null}
    </>
  );
}

const st = StyleSheet.create({
  full: { flex: 1, backgroundColor: color.maroonDeep, paddingHorizontal: 24 },
  title: { fontFamily: font.display, fontSize: 28, color: color.cream },
  line: { fontFamily: font.body, fontSize: 15, lineHeight: 22, color: color.goldLight, textAlign: "center" },
  card: { position: "absolute", left: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: color.maroonDeep, borderRadius: radius.lg, padding: 12 },
  cardTitle: { fontFamily: font.bodySemibold, fontSize: 14, color: color.cream },
  cardLine: { fontFamily: font.body, fontSize: 12, color: color.goldLight },
  cardBtn: { backgroundColor: color.gold, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8 },
  cardBtnText: { fontFamily: font.bodyBold, fontSize: 13, color: color.maroonDeep },
});

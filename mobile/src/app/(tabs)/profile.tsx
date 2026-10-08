import { Linking, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { Bell, BookOpen, Flame, KeyRound, LogOut, Mail, PencilLine, ShieldCheck, Smartphone } from "lucide-react-native";
import { Btn, Card, Loading, Offline, Row, Screen, s } from "@/components/kit";
import { useScreen } from "@/hooks/useScreen";
import { useSession } from "@/lib/session";
import { API_URL } from "@/lib/api";
import { color, font } from "@/theme";

/**
 * Profile. Redesign board 07, 3A — identity, not settings.
 *
 * Everything under "On file" is the register read back; nothing here edits it.
 * The one door to change it is "My details are wrong", which files a request
 * the office decides (the website's screen, for now).
 */
type ProfileModel = {
  name: string;
  uid: string;
  onFile: { cls: string; school: string; centre: string; medium: string };
  unread: number;
  subjects: { chosen: number; questions: number };
  phones: { label: string; lastSeen: string; current: boolean }[];
  office: { email: string; reg: string };
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export default function Profile() {
  const { data, failed, refreshing, refresh } = useScreen<ProfileModel>("/profile");
  const { signOut } = useSession();
  const insets = useSafeAreaInsets();
  if (!data) return failed ? <Screen onRefresh={refresh} refreshing={refreshing}><Offline show /></Screen> : <Loading />;

  return (
    <Screen pad={false} onRefresh={refresh} refreshing={refreshing}>
      <LinearGradient colors={[color.maroon, color.maroonDeep]} style={[styles.hero, { paddingTop: insets.top + 18 }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(data.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} accessibilityRole="header">
            {data.name}
          </Text>
          <Text style={styles.uid}>{data.uid.replace(/(\d{3})(?=\d)/g, "$1 ")}</Text>
        </View>
      </LinearGradient>

      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        <Offline show={failed} />
        <Card>
          <Text style={[s.label, { marginBottom: 8 }]}>On file</Text>
          {(
            [
              ["Class", data.onFile.cls],
              ["School", data.onFile.school],
              ["Centre", data.onFile.centre],
              ["Medium", data.onFile.medium],
            ] as const
          ).map(([k, v]) => (
            <View key={k} style={styles.fact}>
              <Text style={styles.factK}>{k}</Text>
              <Text style={styles.factV}>{v}</Text>
            </View>
          ))}
        </Card>

        <Row icon={<Bell size={20} color={color.maroon} />} title="Notices" count={data.unread} onPress={() => router.push("/notices")} />
        <Row
          icon={<BookOpen size={20} color={color.maroon} />}
          title="My subjects"
          line={data.subjects.chosen ? `${data.subjects.chosen} chosen · ${data.subjects.questions} questions` : "None chosen yet"}
          onPress={() => router.push("/subjects")}
        />
        <Row icon={<KeyRound size={20} color={color.maroon} />} title="Change my password" onPress={() => router.push("/password")} />
        <Row
          icon={<PencilLine size={20} color={color.maroon} />}
          title="My details are wrong"
          onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/app/profile/details`)}
        />

        {/* Only once there is a second phone to show. */}
        {data.phones.length > 1 ? (
          <Card>
            <Text style={[s.label, { marginBottom: 8 }]}>My phones</Text>
            {data.phones.map((p, i) => (
              <View key={i} style={styles.phone}>
                <Smartphone size={18} color={color.inkMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>{p.label}</Text>
                  <Text style={s.rowLine}>
                    Last {new Date(p.lastSeen).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </Text>
                </View>
                {p.current ? <Text style={styles.thisPhone}>This phone</Text> : null}
              </View>
            ))}
            <Text style={s.line}>Not yours? Change your password now.</Text>
          </Card>
        ) : null}

        <Card style={{ gap: 12 }}>
          <View style={styles.keeps}>
            {(
              [
                [Flame, "Streak kept"],
                [ShieldCheck, "Record kept"],
                [Smartphone, "Phone freed"],
              ] as const
            ).map(([Icon, label]) => (
              <View key={label} style={styles.keep}>
                <Icon size={20} color={color.teal} />
                <Text style={s.line}>{label}</Text>
              </View>
            ))}
          </View>
          <Btn label="Sign out" kind="outline" icon={<LogOut size={18} color={color.maroon} />} onPress={signOut} />
          <Text style={[s.line, { textAlign: "center" }]}>Signing out frees this phone for another student.</Text>
        </Card>

        <Text style={[s.label, { marginTop: 4 }]}>Contact KIDS</Text>
        <Row icon={<Mail size={20} color={color.maroon} />} title={data.office.email} onPress={() => Linking.openURL(`mailto:${data.office.email}`)} />
        <Text style={[s.line, { textAlign: "center", fontSize: 11.5 }]}>
          {data.office.reg} · app {Constants.expoConfig?.version}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingBottom: 22, marginBottom: 2 },
  avatar: { width: 60, height: 60, borderRadius: 999, backgroundColor: color.gold, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: font.bodyBold, fontSize: 22, color: color.maroonDeep },
  name: { fontFamily: font.display, fontSize: 22, lineHeight: 27, color: color.cream },
  uid: { marginTop: 2, fontFamily: font.bodySemibold, fontSize: 15, letterSpacing: 1.5, color: color.goldLight, fontVariant: ["tabular-nums"] },
  fact: { flexDirection: "row", gap: 12, paddingVertical: 7, borderTopWidth: 1, borderTopColor: color.creamMuted },
  factK: { width: 72, fontFamily: font.body, fontSize: 13, color: color.inkMuted },
  factV: { flex: 1, fontFamily: font.bodyMedium, fontSize: 14, color: color.ink },
  phone: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  thisPhone: { fontFamily: font.bodySemibold, fontSize: 11, color: color.teal },
  keeps: { flexDirection: "row", justifyContent: "space-around" },
  keep: { alignItems: "center", gap: 4 },
});

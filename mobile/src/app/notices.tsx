import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Award, BellOff, CalendarClock, FilePenLine, FileText, Megaphone, Sparkle } from "lucide-react-native";
import { Btn, Card, Empty, Head, Loading, Offline, Screen, s } from "@/components/kit";
import { useScreen } from "@/hooks/useScreen";
import { useSession } from "@/lib/session";
import { color, font, radius } from "@/theme";

/**
 * Notices from KIDS. Redesign board 07, 3C.
 *
 * Five kinds only, each with its own icon and colour. Unread is a gold dot and
 * a border; a read notice drops to the cream surface but stays. Opening this
 * screen marks nothing read — the student marks each one, or all at once.
 */
type Kind = "results" | "paper-soon" | "paper-open" | "daily" | "post";
type Notice = {
  key: string;
  kind: Kind;
  title: string;
  body: string;
  when: string;
  read: boolean;
  action: { label: string; to: "record" | "exam" | "set" } | null;
  files: { id: string; name: string; bytes: number; photo: boolean; url: string }[];
};

const KIND: Record<Kind, { Icon: typeof Award; tone: string; wash: string; from: string }> = {
  results: { Icon: Award, tone: color.gold, wash: color.goldWash, from: "From the KIDS office" },
  "paper-soon": { Icon: CalendarClock, tone: color.maroon, wash: color.maroonWash, from: "From the KIDS office" },
  "paper-open": { Icon: FilePenLine, tone: color.maroon, wash: color.maroonWash, from: "From the KIDS office" },
  daily: { Icon: Sparkle, tone: color.royalBlue, wash: color.newWash, from: "Your daily set" },
  post: { Icon: Megaphone, tone: color.teal, wash: "#E3F3F0", from: "From KIDS" },
};

const SCREEN = { record: "/record", exam: "/exam", set: "/set" } as const;

const size = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export default function Notices() {
  const { data, failed, refreshing, refresh, reload } = useScreen<{ notices: Notice[] }>("/notices");
  const { call } = useSession();
  const [busy, setBusy] = useState(false);

  async function markRead(keys: string[]) {
    setBusy(true);
    try {
      await call("/notices", { method: "POST", body: { read: keys } });
      await reload();
    } catch {
      // The dot simply stays; the next visit tries again.
    } finally {
      setBusy(false);
    }
  }

  const unread = data?.notices.filter((n) => !n.read) ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: color.cream }}>
      <Head
        title="Notices"
        aside={
          unread.length ? (
            <Pressable onPress={() => markRead(unread.map((n) => n.key))} disabled={busy} hitSlop={8} style={{ paddingHorizontal: 10 }}>
              <Text style={s.metaMaroon}>Mark all read</Text>
            </Pressable>
          ) : null
        }
      />
      {!data ? (
        failed ? <Offline show /> : <Loading />
      ) : (
        <Screen onRefresh={refresh} refreshing={refreshing}>
          <Offline show={failed} />
          {data.notices.length === 0 ? (
            <Card tone="dashed">
              <Empty icon={<BellOff size={30} color={color.teal} />} title="Nothing from KIDS" line="Results and papers show here." />
            </Card>
          ) : (
            data.notices.map((n) => {
              const k = KIND[n.kind];
              return (
                <View key={n.key} style={[styles.nt, n.read ? styles.ntRead : styles.ntUnread]}>
                  <View style={[styles.icon, { backgroundColor: k.wash }]}>
                    <k.Icon size={20} color={k.tone} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      {!n.read ? <View style={styles.dot} accessibilityLabel="Unread" /> : null}
                      <Text style={[s.h, { flex: 1 }]}>{n.title}</Text>
                    </View>
                    <Text style={styles.body}>{n.body}</Text>
                    {n.files.map((f) =>
                      f.photo ? (
                        <Pressable key={f.id} onPress={() => WebBrowser.openBrowserAsync(f.url)}>
                          <Image source={{ uri: f.url }} style={styles.photo} accessibilityLabel={f.name} />
                        </Pressable>
                      ) : (
                        <Pressable key={f.id} onPress={() => WebBrowser.openBrowserAsync(f.url)} style={styles.file}>
                          <FileText size={18} color={color.maroon} />
                          <Text style={[s.rowTitle, { flex: 1 }]} numberOfLines={1}>
                            {f.name}
                          </Text>
                          <Text style={s.meta}>{size(f.bytes)}</Text>
                        </Pressable>
                      ),
                    )}
                    <Text style={styles.from}>
                      {k.from} · {n.when}
                    </Text>
                    {n.action || !n.read ? (
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                        {n.action ? <Btn small label={n.action.label} onPress={() => router.push(SCREEN[n.action!.to])} /> : null}
                        {!n.read ? <Btn small kind="quiet" label="Mark read" onPress={() => markRead([n.key])} disabled={busy} /> : null}
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </Screen>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  nt: { flexDirection: "row", gap: 12, padding: 14, borderRadius: radius.xl, borderWidth: 1 },
  ntUnread: { backgroundColor: color.white, borderColor: color.goldLight },
  ntRead: { backgroundColor: color.creamSurface, borderColor: color.creamMuted },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: 999, backgroundColor: color.gold },
  body: { fontFamily: font.body, fontSize: 14, lineHeight: 21, color: color.ink },
  from: { fontFamily: font.body, fontSize: 12, color: color.inkMuted },
  photo: { width: "100%", aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: color.creamMuted },
  file: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: radius.md, borderWidth: 1, borderColor: color.creamMuted, backgroundColor: color.white },
});

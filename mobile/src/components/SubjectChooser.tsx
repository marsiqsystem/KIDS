import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { Btn, s as kit } from "@/components/kit";
import { useSession } from "@/lib/session";
import { color, font, radius } from "@/theme";

export type Offer = {
  section: string;
  short: string;
  initials: string;
  hue: string;
  questions: number;
  chapters: number;
  videos: number;
};

/**
 * Choose subjects. Board 04's tiles: each one says what it buys — questions,
 * chapters, videos — because that is what the choice actually is. The counts
 * are the server's, from the same bank the daily set is built from.
 */
export default function SubjectChooser({
  offer,
  chosen = [],
  cta,
  onSaved,
}: {
  offer: Offer[];
  chosen?: string[];
  cta: string;
  onSaved: () => void;
}) {
  const { call } = useSession();
  const [picked, setPicked] = useState<string[]>(chosen);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const toggle = (section: string) =>
    setPicked((p) => (p.includes(section) ? p.filter((x) => x !== section) : [...p, section]));

  async function save() {
    setBusy(true);
    setNote(null);
    try {
      const res = await call<{ ok: boolean; message?: string }>("/subjects", { method: "POST", body: { sections: picked } });
      if (res.ok) onSaved();
      else setNote(res.message ?? "That did not save. Try again.");
    } catch {
      setNote("No connection. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 10 }}>
      {offer.map((o) => {
        const on = picked.includes(o.section);
        return (
          <Pressable
            key={o.section}
            onPress={() => toggle(o.section)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            style={[styles.tile, on && { borderColor: o.hue, borderWidth: 2 }]}
          >
            <View style={[styles.badge, { backgroundColor: o.hue }]}>
              <Text style={styles.badgeText}>{o.initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={kit.rowTitle}>{o.section}</Text>
              <Text style={kit.rowLine}>
                {o.questions} questions · {o.chapters} chapters{o.videos ? ` · ${o.videos} videos` : ""}
              </Text>
            </View>
            <View style={[styles.box, on && { backgroundColor: o.hue, borderColor: o.hue }]}>
              {on ? <Check size={16} color={color.white} strokeWidth={3} /> : null}
            </View>
          </Pressable>
        );
      })}
      {note ? <Text style={[kit.line, { color: color.danger }]}>{note}</Text> : null}
      <Btn label={picked.length ? cta : "Choose at least one"} onPress={save} busy={busy} disabled={!picked.length} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.creamMuted,
    backgroundColor: color.white,
  },
  badge: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  badgeText: { fontFamily: font.bodyBold, fontSize: 14, color: color.white },
  box: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: color.dash, alignItems: "center", justifyContent: "center" },
});

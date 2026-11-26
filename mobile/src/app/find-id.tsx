import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Check, Search } from "lucide-react-native";
import { Btn } from "@/components/kit";
import { DobFields, DoorBar, Field, Refusal, grouped, st } from "@/components/doorKit";
import { api } from "@/lib/api";
import { findSchools } from "@/lib/school-search";
import { deviceId } from "@/lib/session";
import { color, font, radius } from "@/theme";

/**
 * Find my User ID (26 Nov 2026) — for a student who sat a KIDS exam and has
 * lost their KIDS card. In two weeks 288 different wrong User IDs were typed
 * and most of those children registered again, making a second UID.
 *
 * Name, date of birth and school → the User ID and the one way on: claim it,
 * sign in, or ask the office (no date of birth on the register). The server
 * (/door/find-id) does the finding, logs every search and caps them per phone.
 */
type School = { centre_code: string; school_code: string; school_name: string; centre_name: string };
type Way = { label: string; to: "claim" | "reset" | "ask" | "signin" };
type Found = { uid: string; class: string; school_name: string; centre_name: string; next: Way };

export default function FindId() {
  const [name, setName] = useState("");
  const [d, setD] = useState("");
  const [m, setM] = useState("");
  const [y, setY] = useState("");
  const [schools, setSchools] = useState<School[] | null>(null);
  const [query, setQuery] = useState("");
  const [school, setSchool] = useState<School | null>(null);
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<{ field: string; message: string } | null>(null);
  const [found, setFound] = useState<Found[] | null>(null);

  useEffect(() => {
    api<{ schools: School[] }>("/door/schools")
      .then((r) => setSchools(r.schools))
      .catch(() => setSchools([]));
  }, []);

  const shown = useMemo(() => (query.trim() ? findSchools(schools ?? [], query) : []), [schools, query]);
  const ready = name.trim().length >= 2 && d && m && y.length === 4 && school;

  async function find() {
    if (!school) return;
    setBusy(true);
    setRefusal(null);
    try {
      const r = await api<{ ok: true; found: Found[] } | { ok: false; field: string; message: string }>("/door/find-id", {
        method: "POST",
        body: { name, day: d, month: m, year: y, school: `${school.centre_code}|${school.school_code}`, deviceId: await deviceId() },
        retry: true,
      });
      if (r.ok) setFound(r.found);
      else setRefusal({ field: r.field, message: r.message });
    } catch {
      setRefusal({ field: "name", message: "No connection. Check the internet and try again." });
    }
    setBusy(false);
  }

  const go = (f: Found) => {
    const params = { id: f.uid };
    if (f.next.to === "signin") router.replace({ pathname: "/sign-in", params });
    else if (f.next.to === "claim") router.replace({ pathname: "/claim", params });
    else router.replace({ pathname: "/ask", params });
  };

  if (found) {
    return (
      <View style={{ flex: 1, backgroundColor: color.cream }}>
        <DoorBar title="Find my User ID" />
        <ScrollView contentContainerStyle={st.body}>
          <Text style={st.lead}>{found.length === 1 ? "Your User ID" : "Is it one of these?"}</Text>
          {found.map((f) => (
            <View key={f.uid} style={s.card}>
              <Text style={s.uid}>{grouped(f.uid)}</Text>
              <Text style={st.hint}>
                Class {f.class} · {f.school_name} · {f.centre_name}
              </Text>
              <Btn label={f.next.label} onPress={() => go(f)} />
            </View>
          ))}
          <Text style={st.hint}>Write your User ID down — you need it every time you sign in.</Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.cream }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <DoorBar title="Find my User ID" />
      <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="handled">
        <Text style={st.hint}>For students who sat a KIDS exam and have lost their KIDS card. Type your name as it was on your admit card.</Text>
        <Field label="Your name" value={name} onChangeText={setName} autoCapitalize="words" placeholder="Student's own name, not the school" bad={refusal?.field === "name"} />
        <DobFields day={d} month={m} year={y} onDay={setD} onMonth={setM} onYear={setY} bad={refusal?.field === "dob"} />
        <Text style={st.label}>School</Text>
        {school ? (
          <View style={[s.school, s.schoolOn]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.schoolName, { color: color.maroon }]}>{school.school_name}</Text>
              <Text style={st.hint}>{school.centre_name}</Text>
            </View>
            <Check size={18} color={color.maroon} />
          </View>
        ) : null}
        <View style={s.search}>
          <Search size={20} color={color.inkMuted} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search your school" placeholderTextColor={color.inkFaint} style={s.searchInput} accessibilityLabel="Search your school" />
        </View>
        {schools === null ? <Text style={st.hint}>Loading the schools…</Text> : null}
        {shown.map((sc) => (
          <Pressable
            key={`${sc.centre_code}|${sc.school_code}`}
            onPress={() => {
              setSchool(sc);
              setQuery("");
            }}
            style={s.school}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.schoolName}>{sc.school_name}</Text>
              <Text style={st.hint}>{sc.centre_name}</Text>
            </View>
          </Pressable>
        ))}
        {refusal ? <Refusal message={refusal.message} /> : null}
        {refusal?.field === "name" ? <Btn label="Never sat a KIDS exam? Register" kind="outline" onPress={() => router.replace("/register")} /> : null}
        <Btn label={busy ? "Finding" : "Find my User ID"} busy={busy} disabled={!ready} onPress={find} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  card: { gap: 8, padding: 16, backgroundColor: color.white, borderRadius: radius.lg, borderWidth: 1, borderColor: color.creamMuted },
  uid: { fontFamily: font.bodyBold, fontSize: 30, color: color.maroon, letterSpacing: 1 },
  search: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 52, paddingHorizontal: 14, backgroundColor: color.white, borderWidth: 1, borderColor: color.creamMuted, borderRadius: radius.lg },
  searchInput: { flex: 1, fontFamily: font.body, fontSize: 16, color: color.ink, paddingVertical: 10 },
  school: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: color.white, borderWidth: 1, borderColor: color.creamMuted, borderRadius: radius.lg },
  schoolOn: { borderColor: color.maroon, borderWidth: 1.5, backgroundColor: color.maroonWash },
  schoolName: { fontFamily: font.body, fontSize: 14.5, color: color.ink },
});

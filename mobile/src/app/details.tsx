import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Check, CircleCheck, Search } from "lucide-react-native";
import { Btn, Card, Head, Loading, Offline, Screen, s } from "@/components/kit";
import { DobFields, Field, Refusal, st } from "@/components/doorKit";
import { useScreen } from "@/hooks/useScreen";
import { api, useKeepAlive } from "@/lib/api";
import { useSession } from "@/lib/session";
import { color, font, radius } from "@/theme";

/**
 * "My details are wrong" — the website's /app/profile/details, natively.
 *
 * Until 7 Nov 2026 the Profile row opened that page in Chrome. The website
 * asked the child to sign in again, landed them on its own Home rather than
 * this form, and -- a browser being a second phone -- moved the account off the
 * app: "Your account is on another phone". Here the app asks with its own
 * session (/api/m/v1/details), and nothing moves.
 *
 * Every box starts with what the register says; only what the child changes is
 * sent, each field as its own request for the office. Nothing on the register
 * changes until a person at KIDS approves it.
 */
type School = { centre_code: string; school_code: string; school_name: string; centre_name: string };
type Details = {
  ok: true;
  current: { name: string; dob: string; class: string; stream: string; school: string; schoolName: string };
  asked: { id: string; label: string; status: "pending" | "approved" | "rejected"; reason: string | null }[];
};
const CLASSES = ["IX", "X", "XI", "XII"];
const STREAMS = ["Arts", "Commerce", "Science"];

export default function DetailsScreen() {
  useKeepAlive();
  const { data, failed, reload } = useScreen<Details>("/details");
  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: color.cream }}>
        <Head title="Ask to change" />
        {failed ? <Offline show /> : <Loading />}
      </View>
    );
  }
  // Mounted once the register has arrived, so every box starts from it -- and a
  // later refetch (after sending) never wipes what the child is typing.
  return <DetailsForm current={data.current} asked={data.asked} reload={reload} />;
}

function DetailsForm({ current, asked, reload }: { current: Details["current"]; asked: Details["asked"]; reload: () => void }) {
  const { call } = useSession();
  const [dd = "", mm = "", yy = ""] = current.dob.split("-");
  const [name, setName] = useState(current.name);
  const [d, setD] = useState(dd);
  const [m, setM] = useState(mm);
  const [y, setY] = useState(yy);
  const [cls, setCls] = useState(current.class);
  const [stream, setStream] = useState(current.stream);
  const [school, setSchool] = useState(current.school);
  const [schoolName, setSchoolName] = useState(current.schoolName);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const [schools, setSchools] = useState<School[] | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!picking || schools) return;
    api<{ schools: School[] }>("/door/schools")
      .then((r) => setSchools(r.schools))
      .catch(() => setSchools([]));
  }, [picking, schools]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const all = schools ?? [];
    return (needle ? all.filter((x) => x.school_name.toLowerCase().includes(needle)) : all).slice(0, 40);
  }, [schools, query]);

  const senior = cls === "XI" || cls === "XII";

  async function send() {
    setBusy(true);
    setAnswer(null);
    try {
      const r = await call<{ ok: boolean; message: string }>("/details", {
        method: "POST",
        body: { name, day: d, month: m, year: y, class: cls, stream: senior ? stream : "", school, note },
      });
      setAnswer(r);
      if (r.ok) {
        setNote("");
        reload();
      }
    } catch {
      setAnswer({ ok: false, message: "No connection. Nothing was sent — try again." });
    }
    setBusy(false);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.cream }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Head title="Ask to change" />
      <Screen>
        <Text style={s.line}>Change only what is wrong, then send it. A person at KIDS checks every change first.</Text>

        <Field label="Your full name" value={name} onChangeText={setName} autoCapitalize="words" hint="As written at school." />
        <DobFields day={d} month={m} year={y} onDay={setD} onMonth={setM} onYear={setY} />

        <Text style={st.label}>Class this year</Text>
        <Chips items={CLASSES} value={cls} onChange={setCls} format={(c) => `Class ${c}`} />
        {senior ? (
          <>
            <Text style={st.label}>Stream</Text>
            <Chips items={STREAMS} value={stream} onChange={setStream} />
          </>
        ) : null}

        <Text style={st.label}>School</Text>
        {picking ? (
          <>
            <View style={x.search}>
              <Search size={20} color={color.inkMuted} />
              <TextInput value={query} onChangeText={setQuery} placeholder="Search your school" placeholderTextColor={color.inkFaint} style={x.searchInput} accessibilityLabel="Search your school" />
            </View>
            {schools === null ? <Text style={st.hint}>Loading the schools…</Text> : null}
            {shown.map((sc) => {
              const key = `${sc.centre_code}|${sc.school_code}`;
              const on = key === school;
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    setSchool(key);
                    setSchoolName(sc.school_name);
                    setPicking(false);
                    setQuery("");
                  }}
                  style={[x.school, on && x.schoolOn]}
                  accessibilityState={{ selected: on }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[x.schoolName, on && { color: color.maroon }]}>{sc.school_name}</Text>
                    <Text style={st.hint}>{sc.centre_name}</Text>
                  </View>
                  {on ? <Check size={18} color={color.maroon} /> : null}
                </Pressable>
              );
            })}
          </>
        ) : (
          <Pressable onPress={() => setPicking(true)} style={x.school} accessibilityRole="button" accessibilityLabel={`School: ${schoolName}. Tap to change.`}>
            <Text style={[x.schoolName, { flex: 1 }]}>{schoolName}</Text>
            <Text style={s.metaMaroon}>Change</Text>
          </Pressable>
        )}

        <Field label="Anything the office should know (optional)" value={note} onChangeText={setNote} multiline maxLength={300} style={[st.input, { minHeight: 80, textAlignVertical: "top", paddingTop: 14 }]} />

        {answer ? (
          answer.ok ? (
            <Card style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
              <CircleCheck size={22} color={color.teal} />
              <Text style={[s.line, { flex: 1 }]}>{answer.message}</Text>
            </Card>
          ) : (
            <Refusal message={answer.message} />
          )
        ) : null}

        <Btn label={busy ? "Sending" : "Send to the KIDS office"} busy={busy} onPress={send} />

        {asked.length > 0 ? (
          <Card>
            <Text style={[s.label, { marginBottom: 8 }]}>Your requests</Text>
            {asked.map((c) => (
              <View key={c.id} style={x.asked}>
                <View style={{ flex: 1 }}>
                  <Text style={x.askedWhat}>{c.label}</Text>
                  {c.reason ? <Text style={st.hint}>“{c.reason}”</Text> : null}
                </View>
                <Text style={[x.chip, c.status === "approved" ? x.chipTeal : c.status === "rejected" ? x.chipGrey : x.chipLine]}>
                  {c.status === "pending" ? "With the KIDS office" : c.status === "approved" ? "Approved" : "Not accepted"}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}

        <Text style={st.hint}>A mark looks wrong? Marks are not changed here — call or email the office.</Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Chips({ items, value, onChange, format }: { items: string[]; value: string; onChange: (v: string) => void; format?: (v: string) => string }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {items.map((it) => {
        const on = it === value;
        return (
          <Pressable key={it} onPress={() => onChange(it)} style={[x.chipBtn, on && x.chipBtnOn]} accessibilityState={{ selected: on }}>
            <Text style={[x.chipBtnText, on && { color: color.cream }]}>{format ? format(it) : it}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const x = StyleSheet.create({
  chipBtn: { minHeight: 44, justifyContent: "center", paddingHorizontal: 16, borderRadius: 999, borderWidth: 1.5, borderColor: color.creamMuted, backgroundColor: color.white },
  chipBtnOn: { backgroundColor: color.maroon, borderColor: color.maroon },
  chipBtnText: { fontFamily: font.bodySemibold, fontSize: 14, color: color.ink },
  search: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 52, paddingHorizontal: 14, backgroundColor: color.white, borderWidth: 1, borderColor: color.creamMuted, borderRadius: radius.lg },
  searchInput: { flex: 1, fontFamily: font.body, fontSize: 16, color: color.ink, paddingVertical: 10 },
  school: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: color.white, borderWidth: 1, borderColor: color.creamMuted, borderRadius: radius.lg },
  schoolOn: { borderColor: color.maroon, borderWidth: 1.5, backgroundColor: color.maroonWash },
  schoolName: { fontFamily: font.body, fontSize: 14.5, color: color.ink },
  asked: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: color.creamMuted },
  askedWhat: { fontFamily: font.bodySemibold, fontSize: 14.5, color: color.ink },
  chip: { fontFamily: font.bodySemibold, fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: "hidden" },
  chipLine: { borderWidth: 1, borderColor: color.goldLight, color: color.ink },
  chipTeal: { backgroundColor: "#E3F3F0", color: color.teal },
  chipGrey: { backgroundColor: color.creamMuted, color: color.inkMuted },
});

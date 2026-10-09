import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Check, CircleX, Hourglass, KeyRound, Search } from "lucide-react-native";
import { Btn } from "@/components/kit";
import { DobFields, DoorBar, Field, Notice, Refusal, grouped, st } from "@/components/doorKit";
import { api } from "@/lib/api";
import { useDoorWatch } from "@/lib/door";
import { deviceId } from "@/lib/session";
import { color, font, radius } from "@/theme";

/**
 * "New to KIDS — register." Board 03, 2C–2E — the website's RegisterScreen,
 * natively. One screen with four faces, because to the family it is one
 * thing: where is my registration up to.
 *
 *   form      who you are → your school → send
 *   pending   with the office; this app opens by itself when they approve
 *   approved  the new User ID, and the app signs itself in (useDoorWatch)
 *   rejected  the office's reason word for word, and the way on
 *
 * It creates an APPLICATION, not a student. The school is chosen from the
 * register's own list, never typed, so registration cannot introduce a new
 * spelling. The password is chosen after approval: a password typed before
 * anyone has checked the application would be a secret for a child who may not
 * exist.
 */
type School = { centre_code: string; school_code: string; school_name: string; centre_name: string };
const CLASSES = ["IX", "X", "XI", "XII"];
const STREAMS = ["Arts", "Commerce", "Science"];

export default function Register() {
  const { application, door, opening, again } = useDoorWatch();
  const [fresh, setFresh] = useState(false);

  if (opening || door?.state === "ready") {
    return (
      <Shell>
        <Notice icon={<KeyRound size={20} color={color.teal} />} title="You are on the KIDS register" tone="teal">
          {application?.uid ? `Your User ID is ${grouped(application.uid)} — write it down. ` : ""}Opening your account…
        </Notice>
      </Shell>
    );
  }
  if (application?.status === "pending" && !fresh) {
    return (
      <Shell>
        <Notice icon={<Hourglass size={20} color={color.maroon} />} title="Sent to the KIDS office">
          When they approve it, this app opens your account by itself. You can close the app — it opens next time you do.
        </Notice>
        <Text style={st.lead}>
          {application.name} · Class {application.class} · {application.school_name}
        </Text>
      </Shell>
    );
  }
  if (application?.status === "rejected" && !fresh) {
    return (
      <Shell>
        <Notice icon={<CircleX size={20} color={color.maroon} />} title="The office did not approve this registration" tone="maroon">
          {application.reason ? `They wrote: “${application.reason}”` : "Check the details and send it again."}
        </Notice>
        <Btn label="Register again" kind="outline" onPress={() => setFresh(true)} />
      </Shell>
    );
  }
  return (
    <Form
      onSent={() => {
        setFresh(false);
        again();
      }}
    />
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: color.cream }}>
      <DoorBar title="Register" />
      <ScrollView contentContainerStyle={st.body}>{children}</ScrollView>
    </View>
  );
}

const STEPS = ["Who you are", "Your school", "Send"];

function Form({ onSent }: { onSent: () => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [d, setD] = useState("");
  const [m, setM] = useState("");
  const [y, setY] = useState("");
  const [cls, setCls] = useState("");
  const [stream, setStream] = useState("");
  const [schools, setSchools] = useState<School[] | null>(null);
  const [query, setQuery] = useState("");
  const [school, setSchool] = useState<School | null>(null);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<{ field: string; message: string } | null>(null);

  useEffect(() => {
    api<{ schools: School[] }>("/door/schools")
      .then((r) => setSchools(r.schools))
      .catch(() => setSchools([]));
  }, []);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const all = schools ?? [];
    return (needle ? all.filter((s) => s.school_name.toLowerCase().includes(needle)) : all).slice(0, 40);
  }, [schools, query]);

  const senior = cls === "XI" || cls === "XII";
  const whoDone = name.trim().length >= 2 && d && m && y.length === 4 && cls && (!senior || stream);

  async function send() {
    if (!school) return;
    setBusy(true);
    setRefusal(null);
    try {
      const r = await api<{ ok: boolean; field?: string; message?: string }>("/door/register", {
        method: "POST",
        body: {
          name,
          day: d,
          month: m,
          year: y,
          class: cls,
          stream: senior ? stream : "",
          school: `${school.centre_code}|${school.school_code}`,
          guardianPhone: phone,
          deviceId: await deviceId(),
        },
      });
      if (r.ok) onSent();
      else {
        setRefusal({ field: r.field ?? "name", message: r.message ?? "That did not go through. Try again." });
        setStep(r.field === "school" ? 1 : 0);
      }
    } catch {
      setRefusal({ field: "name", message: "No connection. Check the internet and try again." });
    }
    setBusy(false);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.cream }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <DoorBar title="Register" />
      <View style={s.steps}>
        {STEPS.map((label, i) => (
          <View key={label} style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <View style={[s.stepDot, i < step && { backgroundColor: color.teal, borderColor: color.teal }, i === step && { borderColor: color.maroon, backgroundColor: color.maroon }]}>
              {i < step ? <Check size={12} color={color.white} /> : <Text style={[s.stepN, i === step && { color: color.cream }]}>{i + 1}</Text>}
            </View>
            <Text style={[s.stepLabel, i === step && { color: color.maroon }]}>{label}</Text>
          </View>
        ))}
      </View>
      <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          <>
            <Field label="Your full name" value={name} onChangeText={setName} autoCapitalize="words" placeholder="As written at school" bad={refusal?.field === "name"} />
            <DobFields day={d} month={m} year={y} onDay={setD} onMonth={setM} onYear={setY} bad={refusal?.field === "dob"} />
            <Text style={st.label}>Class this year</Text>
            <Chips items={CLASSES} value={cls} onChange={setCls} format={(c) => `Class ${c}`} />
            {senior ? (
              <>
                <Text style={st.label}>Stream</Text>
                <Chips items={STREAMS} value={stream} onChange={setStream} />
              </>
            ) : null}
            {refusal ? <Refusal message={refusal.message} /> : null}
            <Btn label="Next" disabled={!whoDone} onPress={() => setStep(1)} />
          </>
        ) : step === 1 ? (
          <>
            <Text style={st.lead}>Choose your school from the list. If it is not there, ask your teacher to contact KIDS.</Text>
            <View style={s.search}>
              <Search size={20} color={color.inkMuted} />
              <TextInput value={query} onChangeText={setQuery} placeholder="Search your school" placeholderTextColor={color.inkFaint} style={s.searchInput} accessibilityLabel="Search your school" />
            </View>
            {schools === null ? <Text style={st.hint}>Loading the schools…</Text> : null}
            {shown.map((sc) => {
              const on = school?.centre_code === sc.centre_code && school?.school_code === sc.school_code;
              return (
                <Pressable key={`${sc.centre_code}|${sc.school_code}`} onPress={() => setSchool(sc)} style={[s.school, on && s.schoolOn]} accessibilityState={{ selected: on }}>
                  {/* With its centre: some schools sit at more than one. */}
                  <View style={{ flex: 1 }}>
                    <Text style={[s.schoolName, on && { color: color.maroon }]}>{sc.school_name}</Text>
                    <Text style={st.hint}>{sc.centre_name}</Text>
                  </View>
                  {on ? <Check size={18} color={color.maroon} /> : null}
                </Pressable>
              );
            })}
            {refusal?.field === "school" ? <Refusal message={refusal.message} /> : null}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Btn label="Back" kind="outline" onPress={() => setStep(0)} />
              </View>
              <View style={{ flex: 1.4 }}>
                <Btn label="Next" disabled={!school} onPress={() => setStep(2)} />
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={s.review}>
              <Text style={st.label}>You are sending</Text>
              <Text style={st.lead}>{name}</Text>
              <Text style={st.hint}>
                Born {d}-{m}-{y} · Class {cls}
                {senior ? ` · ${stream}` : ""}
              </Text>
              <Text style={st.hint}>
                {school?.school_name} · {school?.centre_name}
              </Text>
            </View>
            <Field label="Family mobile number (optional)" value={phone} onChangeText={(v) => setPhone(v.replace(/[^\d+ ]/g, ""))} keyboardType="phone-pad" placeholder="10 digits" hint="So the office can call if something does not match." />
            {refusal ? <Refusal message={refusal.message} /> : null}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Btn label="Back" kind="outline" onPress={() => setStep(1)} />
              </View>
              <View style={{ flex: 1.4 }}>
                <Btn label={busy ? "Sending" : "Send to KIDS"} busy={busy} onPress={send} />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Chips({ items, value, onChange, format }: { items: string[]; value: string; onChange: (v: string) => void; format?: (v: string) => string }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {items.map((it) => {
        const on = it === value;
        return (
          <Pressable key={it} onPress={() => onChange(it)} style={[s.chip, on && s.chipOn]} accessibilityState={{ selected: on }}>
            <Text style={[s.chipText, on && { color: color.cream }]}>{format ? format(it) : it}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  steps: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 12, backgroundColor: color.white, borderBottomWidth: 1, borderBottomColor: color.creamMuted },
  stepDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: color.dash, alignItems: "center", justifyContent: "center" },
  stepN: { fontFamily: font.bodyBold, fontSize: 12, color: color.inkMuted },
  stepLabel: { fontFamily: font.bodyMedium, fontSize: 11.5, color: color.inkMuted },
  chip: { minHeight: 44, justifyContent: "center", paddingHorizontal: 16, borderRadius: 999, borderWidth: 1.5, borderColor: color.creamMuted, backgroundColor: color.white },
  chipOn: { backgroundColor: color.maroon, borderColor: color.maroon },
  chipText: { fontFamily: font.bodySemibold, fontSize: 14, color: color.ink },
  search: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 52, paddingHorizontal: 14, backgroundColor: color.white, borderWidth: 1, borderColor: color.creamMuted, borderRadius: radius.lg },
  searchInput: { flex: 1, fontFamily: font.body, fontSize: 16, color: color.ink, paddingVertical: 10 },
  school: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: color.white, borderWidth: 1, borderColor: color.creamMuted, borderRadius: radius.lg },
  schoolOn: { borderColor: color.maroon, borderWidth: 1.5, backgroundColor: color.maroonWash },
  schoolName: { fontFamily: font.body, fontSize: 14.5, color: color.ink },
  review: { gap: 4, padding: 14, backgroundColor: color.white, borderRadius: radius.lg, borderWidth: 1, borderColor: color.creamMuted },
});

import { useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, Check, DoorClosed, MapPin, TimerOff, WifiOff } from "lucide-react-native";
import { Btn, s as kit } from "@/components/kit";
import { useSession } from "@/lib/session";
import { color, font, radius } from "@/theme";

/**
 * Check in: point the phone at the invigilator's screen — the website's
 * CheckIn (redesign board 04, state 3), natively. The only dark screen in the
 * app, because it is a camera.
 *
 * The camera opens only when the child taps the viewfinder, never on arrival:
 * a permission prompt that appears by itself on exam morning is one a nervous
 * child denies. The six boxes under it do exactly the same job for a camera
 * that will not focus or was refused, and they are always on screen.
 *
 * The codes rotate every thirty seconds and a scan is good for about a minute,
 * so nothing here is cached or retried later: a failed check-in is re-scanned.
 */
type Outcome =
  | { kind: "in"; elsewhere: boolean }
  | { kind: "expired" }
  | { kind: "early" }
  | { kind: "closed" }
  | { kind: "offline" };

export default function CheckIn({ centreName, onCheckedIn }: { centreName: string; onCheckedIn: () => void }) {
  const insets = useSafeAreaInsets();
  const { exam } = useSession();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [denied, setDenied] = useState(false);
  const [code, setCode] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [sending, setSending] = useState(false);
  const busy = useRef(false);
  const boxes = useRef<TextInput>(null);

  async function send(input: string) {
    if (busy.current) return;
    busy.current = true;
    setSending(true);
    setOutcome(null);
    try {
      const { data } = await exam<{ elsewhere?: boolean }>("checkin", { input });
      if (data.ok) {
        setScanning(false);
        setOutcome({ kind: "in", elsewhere: Boolean(data.elsewhere) });
        // The tab redraws as the waiting room; give the tick a moment to land.
        setTimeout(onCheckedIn, 1400);
      } else if (data.reason === "over") setOutcome({ kind: "closed" });
      else if (data.reason === "too_early") setOutcome({ kind: "early" });
      else {
        setCode("");
        setOutcome({ kind: "expired" });
      }
    } catch {
      setOutcome({ kind: "offline" });
    } finally {
      busy.current = false;
      setSending(false);
    }
  }

  async function openCamera() {
    setOutcome(null);
    const p = permission?.granted ? permission : await requestPermission();
    if (p.granted) setScanning(true);
    else {
      // Refused: straight to typing, and the camera does not ask again here.
      setDenied(true);
      boxes.current?.focus();
    }
  }

  const onScan = (r: BarcodeScanningResult) => {
    if (busy.current || outcome) return;
    if (r.data?.startsWith("KIDSIN1.")) send(r.data);
  };

  const digits = code.replace(/\D/g, "").slice(0, 6);

  return (
    <View style={[s.frame, { paddingTop: insets.top + 8 }]}>
      <Text style={s.title}>Scan the desk code</Text>

      {!denied ? (
        <View style={{ alignItems: "center", gap: 12 }}>
          <Pressable onPress={scanning ? () => setScanning(false) : openCamera} style={s.view} accessibilityRole="button" accessibilityLabel={scanning ? "Stop the camera" : "Open the camera"}>
            {scanning ? (
              <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={sending || outcome ? undefined : onScan} />
            ) : (
              <View style={{ alignItems: "center", gap: 8 }}>
                <Camera size={30} color={color.goldLight} />
                <Text style={s.tap}>Tap to scan</Text>
              </View>
            )}
            <View style={[s.corner, { top: 10, left: 10, borderTopWidth: 3, borderLeftWidth: 3 }]} />
            <View style={[s.corner, { top: 10, right: 10, borderTopWidth: 3, borderRightWidth: 3 }]} />
            <View style={[s.corner, { bottom: 10, left: 10, borderBottomWidth: 3, borderLeftWidth: 3 }]} />
            <View style={[s.corner, { bottom: 10, right: 10, borderBottomWidth: 3, borderRightWidth: 3 }]} />
          </Pressable>
          <Text style={s.hint}>Point your camera at the QR code on the invigilator’s desk.</Text>
        </View>
      ) : null}

      <View style={{ gap: 12, marginTop: 20 }}>
        <Text style={s.or}>{denied ? "Type the code" : "Or type it"}</Text>
        <Pressable onPress={() => boxes.current?.focus()} style={{ flexDirection: "row", gap: 8, justifyContent: "center" }} accessibilityLabel="The six digits under the code">
          {Array.from({ length: 6 }, (_, i) => (
            <View key={i} style={[s.box, i === digits.length && s.boxLive]}>
              <Text style={s.boxN}>{digits[i] ?? ""}</Text>
            </View>
          ))}
        </Pressable>
        {/* The real input, out of sight under the boxes: one field, the phone's
            own number pad and its SMS-code autofill. */}
        <TextInput
          ref={boxes}
          value={digits}
          onChangeText={(v) => {
            const next = v.replace(/\D/g, "").slice(0, 6);
            setCode(next);
            if (next.length === 6) send(next);
          }}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={6}
          style={s.hidden}
          accessibilityLabel="The six digits under the code"
        />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {sending ? <ActivityIndicator color={color.goldLight} size="small" /> : null}
          <Text style={s.hint}>{sending ? "Checking…" : "The number under the QR changes every 30 seconds."}</Text>
        </View>
        {denied ? (
          <Text style={[s.hint, { color: color.cream }]}>
            Checking in at <Text style={{ fontFamily: font.bodyBold }}>{centreName}</Text>
          </Text>
        ) : null}
      </View>

      <Modal visible={outcome !== null} transparent animationType="slide" onRequestClose={() => setOutcome(null)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={() => outcome?.kind !== "in" && setOutcome(null)} />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 18 }]}>
          {outcome?.kind === "in" ? (
            <View style={{ alignItems: "center", gap: 8 }}>
              <View style={s.tick}>
                <Check size={30} color={color.white} />
              </View>
              <Text style={s.sheetTitle}>Checked in</Text>
              <Text style={[kit.line, { textAlign: "center" }]}>{outcome.elsewhere ? "You are at a different centre. That is allowed — the office is told." : centreName}</Text>
              <Text style={[kit.line, { textAlign: "center" }]}>Wait for the invigilator to start the paper.</Text>
            </View>
          ) : outcome ? (
            <View style={{ gap: 14 }}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={s.outIcon}>
                  {outcome.kind === "expired" ? (
                    <TimerOff size={20} color={color.maroon} />
                  ) : outcome.kind === "closed" ? (
                    <DoorClosed size={20} color={color.maroon} />
                  ) : outcome.kind === "early" ? (
                    <MapPin size={20} color={color.maroon} />
                  ) : (
                    <WifiOff size={20} color={color.maroon} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={kit.h}>
                    {outcome.kind === "expired"
                      ? "That code did not work"
                      : outcome.kind === "closed"
                        ? "This paper has closed"
                        : outcome.kind === "early"
                          ? "Check-in has not opened"
                          : "No connection"}
                  </Text>
                  <Text style={kit.line}>
                    {outcome.kind === "expired"
                      ? "The desk shows a new one every 30 seconds. Scan again."
                      : outcome.kind === "closed"
                        ? "Speak to your invigilator."
                        : outcome.kind === "early"
                          ? "The code works once your invigilator starts the desk."
                          : "Check-in needs signal for a moment. Try again."}
                  </Text>
                </View>
              </View>
              <Btn label="Try again" onPress={() => setOutcome(null)} />
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  frame: { flex: 1, backgroundColor: "#170A0D", paddingHorizontal: 20 },
  title: { fontFamily: font.display, fontSize: 24, color: color.cream, textAlign: "center", marginVertical: 14 },
  view: { width: "100%", aspectRatio: 1, maxWidth: 340, borderRadius: radius.xl, overflow: "hidden", backgroundColor: "#2A1418", alignItems: "center", justifyContent: "center" },
  corner: { position: "absolute", width: 34, height: 34, borderColor: color.gold },
  tap: { fontFamily: font.bodySemibold, fontSize: 15, color: color.goldLight },
  hint: { fontFamily: font.body, fontSize: 13, lineHeight: 19, color: "#C9B8B0", textAlign: "center" },
  or: { fontFamily: font.bodySemibold, fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", color: color.goldLight, textAlign: "center" },
  box: { width: 46, height: 58, borderRadius: radius.md, borderWidth: 1.5, borderColor: "#5A3A3F", backgroundColor: "#2A1418", alignItems: "center", justifyContent: "center" },
  boxLive: { borderColor: color.gold },
  boxN: { fontFamily: font.bodyBold, fontSize: 26, color: color.cream, fontVariant: ["tabular-nums"] },
  hidden: { position: "absolute", opacity: 0, height: 1, width: 1 },
  sheet: { backgroundColor: color.cream, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22 },
  sheetTitle: { fontFamily: font.display, fontSize: 24, color: color.ink },
  tick: { width: 60, height: 60, borderRadius: 30, backgroundColor: color.teal, alignItems: "center", justifyContent: "center" },
  outIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: color.maroonWash, alignItems: "center", justifyContent: "center" },
});

import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { CalendarX, Hourglass, Unlink, Users, Wrench, X } from "lucide-react-native";
import { Btn, Card, Head, Loading, Offline, Screen, s as kit } from "@/components/kit";
import { useScreen } from "@/hooks/useScreen";
import { color, font, radius } from "@/theme";

/**
 * A class — the website's /app/class/[id], decided on the server by the same
 * canStudentJoin (GET /api/m/v1/class/[id]).
 *
 * The live room is the WEBSITE's room: the same Jitsi external API, the same
 * settings JitsiRoom.tsx gives a student, run inside this app's own WebView
 * with the phone's camera and microphone granted to it (ruled 9 Oct 2026 —
 * over the Jitsi native SDK, which would have brought 26 native packages and
 * version clashes with this app). The token is minted on the server for this
 * child and this room and is handed straight to the room; it is never in an
 * address that could be forwarded.
 */
type ClassModel =
  | { state: "refused"; why: "not-found" | "cancelled" | "not-started" | "not-in-batch" }
  | { state: "recorded"; title: string; subject: string | null; startsAt: string; parts: { id: string; url: string }[] }
  | { state: "unconfigured"; title: string }
  | { state: "live"; title: string; subject: string | null; domain: string; room: string; jwt: string; name: string };

export default function ClassScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Fetched on focus like any screen: a token is good for the session, and a
  // fresh one on returning is what the website's page does too.
  const { data, failed, refresh, refreshing } = useScreen<ClassModel>(`/class/${encodeURIComponent(id)}`);

  if (!data) return failed ? <Offline show /> : <Loading />;

  if (data.state === "live") return <LiveRoom m={data} />;
  if (data.state === "recorded") return <Recorded m={data} />;
  if (data.state === "unconfigured") {
    return (
      <Waiting title={data.title} icon={<Wrench size={22} color={color.maroon} />}>
        This is ours to fix, not yours. Tell your teacher.
      </Waiting>
    );
  }

  const said = {
    "not-found": { head: "This class is gone", body: "Your classes are always on your day. Go through Home.", icon: <Unlink size={22} color={color.maroon} /> },
    cancelled: { head: "This class was cancelled", body: "Nothing is expected of you for it.", icon: <CalendarX size={22} color={color.maroon} /> },
    "not-started": { head: "Not started yet", body: "The room opens when your teacher opens it. Keep waiting.", icon: <Hourglass size={22} color={color.maroon} /> },
    "not-in-batch": { head: "This class is not yours", body: "It belongs to another batch. You have not done anything wrong.", icon: <Users size={22} color={color.maroon} /> },
  }[data.why];

  return (
    <Waiting title={said.head} icon={said.icon} onRefresh={data.why === "not-started" ? refresh : undefined} refreshing={refreshing}>
      {said.body}
    </Waiting>
  );
}

/**
 * JSON for inside a <script> tag. JSON.stringify leaves "<" alone, so a name
 * typed at registration as "</script><script>..." would close the tag and run
 * as code in the room page. Escaped, it stays a string.
 */
const scriptJson = (v: unknown) =>
  JSON.stringify(v)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

/** The room page the WebView runs: the website's student settings, verbatim. */
function roomHtml(m: Extract<ClassModel, { state: "live" }>): string {
  const options = {
    roomName: m.room,
    jwt: m.jwt,
    width: "100%",
    height: "100%",
    userInfo: { displayName: m.name },
    configOverwrite: {
      // Students arrive muted, camera off — arithmetic, not courtesy: 65
      // cameras coming back is ten times the teacher's video going out.
      startWithAudioMuted: true,
      startWithVideoMuted: true,
      prejoinConfig: { enabled: false },
      disableDeepLinking: true,
      disableThirdPartyRequests: true,
      disableInviteFunctions: true,
    },
    interfaceConfigOverwrite: {
      MOBILE_APP_PROMO: false,
      SHOW_JITSI_WATERMARK: false,
      SHOW_CHROME_EXTENSION_BANNER: false,
      TOOLBAR_BUTTONS: ["microphone", "camera", "chat", "raisehand", "tileview", "hangup"],
    },
  };
  // The page says what it is doing, so a black box is never the failure: a
  // child waiting for a class deserves to be told which step stopped.
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;height:100%;background:#000;color:#ccc;font:13px sans-serif}#box,#box iframe{position:absolute;inset:0;width:100%;height:100%;border:0}#say{position:absolute;top:50%;left:0;right:0;text-align:center}</style></head>
<body><div id="box"></div><p id="say">Opening the class…</p>
<script>
var say=function(t){document.getElementById('say').textContent=t};
var post=function(o){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(o))};
var s=document.createElement('script');s.src=${scriptJson(`https://${m.domain}/external_api.js`)};
s.onerror=function(){say('');post({type:'unreachable'})};
s.onload=function(){
  if(!window.JitsiMeetExternalAPI){say('Loaded, but the class could not start.');return}
  var o=${scriptJson(options)};o.parentNode=document.getElementById('box');
  var api=new JitsiMeetExternalAPI(${scriptJson(m.domain)},o);say('');
  api.addListener('readyToClose',function(){post({type:'left'})});
};
document.head.appendChild(s);
</script></body></html>`;
}

function LiveRoom({ m }: { m: Extract<ClassModel, { state: "live" }> }) {
  const insets = useSafeAreaInsets();
  const [unreachable, setUnreachable] = useState(false);
  // Fixed at the first token. The screen refetches when it comes back into
  // view, and a fresh token must not reload a class the child is sitting in.
  const [html] = useState(() => roomHtml(m));
  const base = `https://${m.domain}/`;

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as { type?: string };
      if (msg.type === "left") router.back();
      if (msg.type === "unreachable") setUnreachable(true);
    } catch {
      // Not ours.
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000", paddingTop: insets.top }}>
      <View style={s.bar}>
        <View style={s.dot} />
        <Text style={s.title} numberOfLines={1}>
          {m.title}
        </Text>
        {m.subject ? <Text style={s.sub}>{m.subject}</Text> : null}
        <Pressable onPress={() => router.back()} style={s.close} accessibilityLabel="Leave the class" hitSlop={6}>
          <X size={22} color={color.cream} />
        </Pressable>
      </View>
      {unreachable ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 }}>
          <Text style={[kit.h, { color: color.cream, textAlign: "center" }]}>The class could not be reached.</Text>
          <Text style={[kit.line, { color: "#BBB", textAlign: "center" }]}>
            The server at {m.domain} did not answer. Check your connection and try again — if it keeps happening, tell the office.
          </Text>
        </View>
      ) : (
        <WebView
          source={{ html, baseUrl: base }}
          style={{ flex: 1, backgroundColor: "#000" }}
          originWhitelist={["https://*"]}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mediaCapturePermissionGrantType="grant"
          onMessage={onMessage}
          // The class page itself never navigates away; the room loads inside
          // its own frame. A tapped link to anywhere else goes nowhere.
          onShouldStartLoadWithRequest={(req) => req.isTopFrame === false || req.url === base || req.url === "about:blank"}
          setSupportMultipleWindows={false}
        />
      )}
      <Text style={[s.note, { paddingBottom: insets.bottom + 8 }]}>You join muted. Raise your hand; when your teacher allows it, tap your own mic.</Text>
    </View>
  );
}

/**
 * A finished class: its recording, played by Google's own player straight from
 * the KIDS Drive (ruled 2 Oct). A recorder that restarted leaves two parts;
 * both, in order. Nothing yet usually means the upload is still running.
 */
function Recorded({ m }: { m: Extract<ClassModel, { state: "recorded" }> }) {
  const when = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }).format(new Date(m.startsAt));
  return (
    <View style={{ flex: 1, backgroundColor: color.cream }}>
      <Head title={m.title} />
      <Screen>
        <Text style={kit.line}>
          {m.subject ? `${m.subject} · ` : ""}
          {when}
        </Text>
        {m.parts.length === 0 ? (
          <Card tone="dashed">
            <Text style={kit.line}>No recording yet. A class reaches here within an hour or so of finishing — come back later.</Text>
          </Card>
        ) : (
          m.parts.map((p, i) => (
            <View key={p.id} style={{ gap: 6 }}>
              {m.parts.length > 1 ? <Text style={kit.label}>Part {i + 1}</Text> : null}
              <View style={s.player}>
                <WebView
                  source={{ uri: p.url }}
                  style={{ flex: 1, backgroundColor: "#000" }}
                  allowsFullscreenVideo
                  allowsInlineMediaPlayback
                  // Drive's player only; "open in Drive" and the like go nowhere.
                  onShouldStartLoadWithRequest={(req) => req.isTopFrame === false || req.url.startsWith("https://drive.google.com/file/") || req.url.startsWith("https://accounts.google.com/")}
                  setSupportMultipleWindows={false}
                />
              </View>
            </View>
          ))
        )}
        {m.parts.length > 0 ? <Text style={kit.line}>If it says the video is still being processed, Google is preparing it. Try again in a little while.</Text> : null}
      </Screen>
    </View>
  );
}

function Waiting({ title, icon, children, onRefresh, refreshing }: { title: string; icon: ReactNode; children: ReactNode; onRefresh?: () => void; refreshing?: boolean }) {
  return (
    <View style={{ flex: 1, backgroundColor: color.cream }}>
      <Head title="Class" />
      <Screen onRefresh={onRefresh} refreshing={refreshing}>
        <View style={{ alignItems: "center", gap: 10, paddingTop: 30 }}>
          <View style={s.waitIcon}>{icon}</View>
          <Text style={[kit.cardTitle, { textAlign: "center" }]}>{title}</Text>
          <Text style={[kit.line, { textAlign: "center", fontSize: 14 }]}>{children}</Text>
          {onRefresh ? <Text style={kit.meta}>Pull down to check again.</Text> : null}
        </View>
        <Btn label="Back to your day" onPress={() => router.dismissTo("/")} />
      </Screen>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 8 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: color.gold },
  title: { flexShrink: 1, fontFamily: font.bodySemibold, fontSize: 15, color: color.cream },
  sub: { fontFamily: font.body, fontSize: 12, color: "#BBB" },
  close: { marginLeft: "auto", width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  note: { fontFamily: font.body, fontSize: 12, color: "#BBB", textAlign: "center", paddingHorizontal: 16, paddingTop: 8 },
  player: { aspectRatio: 16 / 9, borderRadius: radius.lg, overflow: "hidden", backgroundColor: "#000" },
  waitIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: color.maroonWash, alignItems: "center", justifyContent: "center" },
});

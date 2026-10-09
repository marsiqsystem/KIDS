import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useFonts, PlayfairDisplay_600SemiBold } from "@expo-google-fonts/playfair-display";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { SessionProvider, useSession } from "@/lib/session";
import { usePush } from "@/lib/push";
import UpdateGate from "@/components/UpdateGate";
import { color } from "@/theme";

// Hold the KIDS splash until the fonts are in and the phone knows whether
// anyone is signed in, so the first frame is the right screen in the right type.
SplashScreen.preventAutoHideAsync();

export default function Root() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  return <SessionProvider>{fontsLoaded ? <Screens /> : null}</SessionProvider>;
}

/**
 * Two worlds, chosen by the session: the front door when nobody is signed in,
 * the app when somebody is. Stack.Protected moves the phone between them by
 * itself — sign in and the door disappears; sign out, or be moved off this
 * phone, and the app does.
 */
function Screens() {
  const { loading, token, mustChange } = useSession();
  usePush();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  return (
    <UpdateGate>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.cream } }}>
        <Stack.Protected guard={!token}>
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="claim" />
          <Stack.Screen name="register" />
          <Stack.Screen name="ask" />
        </Stack.Protected>
        {/* A one-time password: nothing but choosing one's own. */}
        <Stack.Protected guard={Boolean(token) && mustChange}>
          <Stack.Screen name="choose-password" />
        </Stack.Protected>
        <Stack.Protected guard={Boolean(token) && !mustChange}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="notices" />
          <Stack.Screen name="subjects" />
          <Stack.Screen name="password" />
          <Stack.Screen name="set" />
          <Stack.Screen name="summary" />
          <Stack.Screen name="chapter/[key]" />
          <Stack.Screen name="practice/[key]" />
          <Stack.Screen name="paper/online" />
          <Stack.Screen name="paper/written" />
          <Stack.Screen name="sit" options={{ animation: "fade" }} />
          <Stack.Screen name="room" />
          <Stack.Screen name="class/[id]" />
          <Stack.Screen name="recordings" />
          <Stack.Screen name="delete-account" />
        </Stack.Protected>
      </Stack>
    </UpdateGate>
  );
}

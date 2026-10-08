import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useFonts, PlayfairDisplay_600SemiBold } from "@expo-google-fonts/playfair-display";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { SessionProvider, useSession } from "@/lib/session";
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
  const { loading, token } = useSession();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.cream } }}>
        <Stack.Protected guard={!token}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        <Stack.Protected guard={Boolean(token)}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="notices" />
          <Stack.Screen name="subjects" />
          <Stack.Screen name="password" />
          <Stack.Screen name="set" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

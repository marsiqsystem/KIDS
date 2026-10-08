import { Tabs } from "expo-router/js-tabs";
import { Award, BookOpen, CircleUser, FilePenLine, House } from "lucide-react-native";
import { color, font } from "@/theme";

/**
 * The five tabs. Redesign board 01 — the website's TabBar, natively.
 *
 * Exam is permanent: on the one morning it matters, a nervous child already
 * knows where to look. Its gold dot (a paper open now) arrives with the exam
 * itself, in phase 4.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.maroon,
        tabBarInactiveTintColor: color.inkMuted,
        tabBarStyle: { backgroundColor: color.white, borderTopColor: color.creamMuted, minHeight: 64 },
        tabBarLabelStyle: { fontFamily: font.bodyMedium, fontSize: 10.5 },
        sceneStyle: { backgroundColor: color.cream },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color: c }) => <House size={24} strokeWidth={1.9} color={c} /> }} />
      <Tabs.Screen name="learn" options={{ title: "Learn", tabBarIcon: ({ color: c }) => <BookOpen size={24} strokeWidth={1.9} color={c} /> }} />
      <Tabs.Screen name="exam" options={{ title: "Exam", tabBarIcon: ({ color: c }) => <FilePenLine size={24} strokeWidth={1.9} color={c} /> }} />
      <Tabs.Screen name="record" options={{ title: "Record", tabBarIcon: ({ color: c }) => <Award size={24} strokeWidth={1.9} color={c} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color: c }) => <CircleUser size={24} strokeWidth={1.9} color={c} /> }} />
    </Tabs>
  );
}

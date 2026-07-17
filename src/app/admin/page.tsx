import type { Metadata } from "next";
import { isAdmin, adminConfigured } from "@/lib/admin/auth";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const metadata: Metadata = {
  title: "SET 2026 · Control room",
  robots: { index: false, follow: false },
};

// Never cache: the gate is per-request and the numbers are live.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) return <AdminLogin configured={adminConfigured()} />;
  return <AdminDashboard />;
}

import AppShell from "./AppShell";
import type { Profile } from "@/lib/types";

export default function AppLayout({
  profile,
  alertCount = 0,
  children,
}: {
  profile: Profile;
  alertCount?: number;
  children: React.ReactNode;
}) {
  return (
    <AppShell profile={profile} alertCount={alertCount}>
      {children}
    </AppShell>
  );
}

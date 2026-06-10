import { requireAuth } from "@/lib/auth";
import { normalizeRole } from "@/lib/constants";
import { getAlertCount } from "@/actions/customers";
import AppLayout from "@/components/layout/AppLayout";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAuth();
  const role = normalizeRole(profile.role);
  const alertCount =
    role === "admin" || role === "manager" ? await getAlertCount() : 0;

  return (
    <AppLayout profile={profile} alertCount={alertCount}>
      {children}
    </AppLayout>
  );
}

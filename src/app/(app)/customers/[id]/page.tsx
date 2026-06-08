import {
  getCustomer,
  getCallLogs,
  getCustomerNotes,
  getActivities,
} from "@/actions/customers";
import { getTeamMembers, getSeniorAssistUsers } from "@/actions/team";
import { requireAuth } from "@/lib/auth";
import { getISPColumns } from "@/actions/ispColumns";
import CustomerDetailContent from "@/components/customers/CustomerDetailContent";
import { notFound } from "next/navigation";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireAuth();
  const customer = await getCustomer(id);

  if (!customer) {
    notFound();
  }

  const [callLogs, notes, activities, recoveryTeamMembers, seniorAssistUsers, ispColumns] =
    await Promise.all([
      getCallLogs(id),
      getCustomerNotes(id),
      getActivities(id),
      getTeamMembers("Recovery Team"),
      getSeniorAssistUsers(),
      customer.isp_id ? getISPColumns(customer.isp_id) : Promise.resolve([]),
    ]);

  return (
    <CustomerDetailContent
      customer={customer}
      ispColumns={ispColumns}
      callLogs={callLogs}
      notes={notes}
      activities={activities}
      profile={profile}
      recoveryTeamMembers={recoveryTeamMembers}
      seniorAssistUsers={seniorAssistUsers}
    />
  );
}

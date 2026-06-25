import { redirect } from "next/navigation";

export default function SignUpPage() {
  // Public self-registration is disabled. Accounts are created by
  // administrators through the Users admin controls.
  redirect("/login");
}

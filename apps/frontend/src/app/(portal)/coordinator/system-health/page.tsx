import { redirect } from "next/navigation";

/** System Health moved to Super Admin. */
export default function CoordinatorSystemHealthRedirectPage() {
  redirect("/coordinator/dashboard");
}

import { redirect } from "next/navigation";

export default function SupervisorDeliverablesRedirect() {
  redirect("/supervisor/work-stream?tab=deliverables");
}

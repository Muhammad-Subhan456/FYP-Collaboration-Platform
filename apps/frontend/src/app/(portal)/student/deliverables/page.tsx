import { redirect } from "next/navigation";

export default function StudentDeliverablesRedirect() {
  redirect("/student/work-stream?tab=deliverables");
}

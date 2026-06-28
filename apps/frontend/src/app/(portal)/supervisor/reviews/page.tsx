import { redirect } from "next/navigation";

export default function SupervisorReviewsRedirect() {
  redirect("/supervisor/work-stream?tab=deliverables");
}

import { redirect } from "next/navigation";

/** Legacy supervisor evaluation UI removed — evaluate via Evaluator role. */
export default function SupervisorEvaluationsRedirectPage() {
  redirect("/supervisor/dashboard");
}

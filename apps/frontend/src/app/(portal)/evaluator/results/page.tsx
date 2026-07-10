import { redirect } from "next/navigation";

export default function EvaluatorResultsRedirectPage() {
  redirect("/evaluator/evaluations");
}

import { OnboardingGuard } from "@/components/onboarding/onboarding-guard";
import { EvaluatorOnboardingWizard } from "@/components/onboarding/evaluator-wizard";

export default function EvaluatorOnboardingPage() {
  return (
    <OnboardingGuard role="EVALUATOR">
      <EvaluatorOnboardingWizard />
    </OnboardingGuard>
  );
}

import { OnboardingGuard } from "@/components/onboarding/onboarding-guard";
import { SupervisorOnboardingWizard } from "@/components/onboarding/supervisor-wizard";

export default function SupervisorOnboardingPage() {
  return (
    <OnboardingGuard role="SUPERVISOR">
      <SupervisorOnboardingWizard />
    </OnboardingGuard>
  );
}

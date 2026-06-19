import { OnboardingGuard } from "@/components/onboarding/onboarding-guard";
import { StudentOnboardingWizard } from "@/components/onboarding/student-wizard";

export default function StudentOnboardingPage() {
  return (
    <OnboardingGuard role="STUDENT">
      <StudentOnboardingWizard />
    </OnboardingGuard>
  );
}

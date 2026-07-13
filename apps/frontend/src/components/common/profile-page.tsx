"use client";

import { ChangePasswordCard } from "@/components/auth/change-password-card";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { CoordinatorProfileForm } from "@/components/profile/coordinator-profile-form";
import { StudentProfileForm } from "@/components/profile/student-profile-form";
import { SupervisorProfileForm } from "@/components/profile/supervisor-profile-form";
import { useAuth } from "@/providers/auth-provider";

export function ProfilePage() {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) {
    return <DashboardSkeleton />;
  }

  const profileForm = (() => {
    switch (user.role) {
      case "STUDENT":
        return <StudentProfileForm />;
      case "SUPERVISOR":
        return <SupervisorProfileForm />;
      case "COORDINATOR":
        return <CoordinatorProfileForm />;
      case "EVALUATOR":
        return <StudentProfileForm title="Evaluator Profile" />;
      default:
        return null;
    }
  })();

  if (!profileForm) return null;

  return (
    <div className="space-y-6">
      {profileForm}
      <ChangePasswordCard />
    </div>
  );
}

"use client";

import { CoordinatorProfileForm } from "@/components/profile/coordinator-profile-form";
import { StudentProfileForm } from "@/components/profile/student-profile-form";
import { SupervisorProfileForm } from "@/components/profile/supervisor-profile-form";
import { useAuth } from "@/providers/auth-provider";

export function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case "STUDENT":
      return <StudentProfileForm />;
    case "SUPERVISOR":
      return <SupervisorProfileForm />;
    case "COORDINATOR":
      return <CoordinatorProfileForm />;
    default:
      return null;
  }
}

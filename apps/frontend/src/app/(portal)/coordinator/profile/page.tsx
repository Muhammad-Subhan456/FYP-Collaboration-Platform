"use client";

import { ChangePasswordCard } from "@/components/auth/change-password-card";
import { CoordinatorProfileForm } from "@/components/profile/coordinator-profile-form";

export default function CoordinatorProfilePage() {
  return (
    <div className="space-y-6">
      <CoordinatorProfileForm />
      <ChangePasswordCard />
    </div>
  );
}

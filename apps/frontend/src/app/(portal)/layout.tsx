"use client";

import { usePathname } from "next/navigation";

import { RoleLayout } from "@/components/dashboard/role-layout";
import type { UserRole } from "@/types";

const PORTAL_CONFIG: Record<
  string,
  { role: UserRole; roleLabel: string }
> = {
  student: { role: "STUDENT", roleLabel: "Student Portal" },
  supervisor: { role: "SUPERVISOR", roleLabel: "Supervisor Portal" },
  coordinator: { role: "COORDINATOR", roleLabel: "Coordinator Portal" },
  evaluator: { role: "EVALUATOR", roleLabel: "Evaluator Portal" },
  "super-admin": { role: "SUPER_ADMIN", roleLabel: "Super Admin" },
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const segment = pathname.split("/")[1] ?? "";
  const config = PORTAL_CONFIG[segment];

  if (!config) {
    return children;
  }

  return (
    <RoleLayout role={config.role} roleLabel={config.roleLabel}>
      {children}
    </RoleLayout>
  );
}

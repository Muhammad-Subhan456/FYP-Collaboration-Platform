import { RoleLayout } from "@/components/dashboard/role-layout";

export default function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleLayout role="SUPERVISOR" roleLabel="Supervisor Portal">
      {children}
    </RoleLayout>
  );
}

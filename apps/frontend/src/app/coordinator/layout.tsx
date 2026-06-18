import { RoleLayout } from "@/components/dashboard/role-layout";

export default function CoordinatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleLayout role="COORDINATOR" roleLabel="Coordinator Portal">
      {children}
    </RoleLayout>
  );
}

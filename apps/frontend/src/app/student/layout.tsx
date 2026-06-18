import { RoleLayout } from "@/components/dashboard/role-layout";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleLayout role="STUDENT" roleLabel="Student Portal">
      {children}
    </RoleLayout>
  );
}

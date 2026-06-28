import { redirect } from "next/navigation";

export default function StudentSubmissionsRedirect() {
  redirect("/student/work-stream?tab=deliverables");
}

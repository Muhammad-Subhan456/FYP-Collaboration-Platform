"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Logo } from "@/components/common/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDashboardPath } from "@/lib/auth";
import { getErrorMessage } from "@/lib/axios";
import { uploadService } from "@/services/progress.service";
import { profileService } from "@/services/profile.service";
import { useAuth } from "@/providers/auth-provider";

const schema = z.object({
  fullName: z.string().min(2),
  facultyId: z.string().min(1),
  department: z.enum(["CS", "SE", "IT", "AI", "DS"]),
  designation: z.string().min(1),
  coordinatorRole: z.string().optional(),
  officeLocation: z.string().optional(),
  contactInformation: z.string().optional(),
  biography: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function CoordinatorOnboardingWizard() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [picture, setPicture] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { department: "CS", coordinatorRole: "FYP Coordinator" },
  });
  const department = watch("department");

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    setSubmitting(true);
    try {
      let profilePicture: string | undefined;
      if (picture) {
        profilePicture = (await uploadService.uploadFile(picture)).fileUrl;
      }
      await profileService.createCoordinatorProfile({
        fullName: data.fullName,
        email: user.email,
        profilePicture,
        facultyId: data.facultyId,
        department: data.department,
        designation: data.designation,
        coordinatorRole: data.coordinatorRole,
        officeLocation: data.officeLocation,
        contactInformation: data.contactInformation,
        biography: data.biography,
      });
      await refreshProfile();
      toast.success("Coordinator profile created!");
      router.push(getDashboardPath(user.role));
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-lg shadow-lg">
      <CardHeader className="text-center">
        <Logo showText={false} className="justify-center" />
        <CardTitle className="mt-4">Coordinator Setup</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2"><Label>Full Name</Label><Input {...register("fullName")} /></div>
          <div className="space-y-2"><Label>Faculty ID</Label><Input {...register("facultyId")} /></div>
          <div className="space-y-2"><Label>Designation</Label><Input {...register("designation")} /></div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={department} onValueChange={(v) => setValue("department", v as FormData["department"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["CS","SE","IT","AI","DS"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Coordinator Role</Label><Input {...register("coordinatorRole")} /></div>
          <div className="space-y-2"><Label>Office Location</Label><Input {...register("officeLocation")} /></div>
          <div className="space-y-2"><Label>Contact Information</Label><Input {...register("contactInformation")} /></div>
          <div className="space-y-2"><Label>Biography</Label><Textarea {...register("biography")} /></div>
          <div className="space-y-2"><Label>Profile Picture</Label><Input type="file" accept="image/*" onChange={(e) => setPicture(e.target.files?.[0] ?? null)} /></div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}Complete Setup
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

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
  researchAreas: z.string().min(1),
  publications: z.string().optional(),
  officeLocation: z.string().optional(),
  officeHours: z.string().optional(),
  linkedIn: z.string().optional(),
  googleScholar: z.string().optional(),
  biography: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function SupervisorOnboardingWizard() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [picture, setPicture] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { department: "CS" },
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
      await profileService.createSupervisorProfile({
        fullName: data.fullName,
        email: user.email,
        profilePicture,
        facultyId: data.facultyId,
        department: data.department,
        designation: data.designation,
        researchAreas: data.researchAreas.split(",").map((s) => s.trim()).filter(Boolean),
        publications: data.publications?.split(",").map((s) => s.trim()).filter(Boolean),
        officeLocation: data.officeLocation,
        officeHours: data.officeHours,
        linkedIn: data.linkedIn,
        googleScholar: data.googleScholar,
        biography: data.biography,
      });
      await refreshProfile();
      toast.success("Faculty profile created!");
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
        <CardTitle className="mt-4">Faculty Profile Setup</CardTitle>
        <p className="text-sm text-muted-foreground">Step {step + 1} of 3</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {step === 0 && (
            <>
              <div className="space-y-2"><Label>Full Name</Label><Input {...register("fullName")} /></div>
              <div className="space-y-2"><Label>Faculty ID</Label><Input {...register("facultyId")} /></div>
              <div className="space-y-2"><Label>Designation</Label><Input {...register("designation")} placeholder="Assistant Professor" /></div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={department} onValueChange={(v) => setValue("department", v as FormData["department"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["CS","SE","IT","AI","DS"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Profile Picture</Label><Input type="file" accept="image/*" onChange={(e) => setPicture(e.target.files?.[0] ?? null)} /></div>
            </>
          )}
          {step === 1 && (
            <>
              <div className="space-y-2"><Label>Research Areas</Label><Textarea {...register("researchAreas")} placeholder="AI, NLP, Computer Vision" /></div>
              <div className="space-y-2"><Label>Publications</Label><Textarea {...register("publications")} placeholder="Comma-separated" /></div>
              <div className="space-y-2"><Label>Office Location</Label><Input {...register("officeLocation")} /></div>
              <div className="space-y-2"><Label>Office Hours</Label><Input {...register("officeHours")} placeholder="Mon-Wed 2-4 PM" /></div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="space-y-2"><Label>LinkedIn</Label><Input {...register("linkedIn")} /></div>
              <div className="space-y-2"><Label>Google Scholar</Label><Input {...register("googleScholar")} /></div>
              <div className="space-y-2"><Label>Biography</Label><Textarea {...register("biography")} /></div>
            </>
          )}
          <div className="flex justify-between">
            <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
            {step < 2 ? (
              <Button type="button" onClick={() => setStep((s) => s + 1)}>Next</Button>
            ) : (
              <Button type="submit" disabled={submitting}>{submitting && <Loader2 className="animate-spin" />}Finish</Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDashboardPath } from "@/lib/auth";
import { getErrorMessage } from "@/lib/axios";
import { uploadService } from "@/services/progress.service";
import { profileService } from "@/services/profile.service";
import { useAuth } from "@/providers/auth-provider";

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  registrationNumber: z.string().min(1),
  department: z.enum(["CS", "SE", "IT", "AI", "DS"]),
  batch: z.string().min(1),
  degreeProgram: z.string().min(1),
  semester: z.number().min(1).max(12),
  skills: z.string().min(1),
  interests: z.string().min(1),
  linkedIn: z.string().optional(),
  github: z.string().optional(),
  bio: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const STEPS = ["Basic Info", "Academic", "Skills", "Social Links", "Finish"];

export function StudentOnboardingWizard() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [picture, setPicture] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { department: "CS", semester: 7 },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;
  const department = watch("department");

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    setSubmitting(true);
    try {
      let profilePicture: string | undefined;
      if (picture) {
        const uploaded = await uploadService.uploadFile(picture);
        profilePicture = uploaded.fileUrl;
      }

      await profileService.createStudentProfile({
        fullName: data.fullName,
        email: data.email || user.email,
        profilePicture,
        registrationNumber: data.registrationNumber,
        department: data.department,
        batch: data.batch,
        degreeProgram: data.degreeProgram,
        semester: data.semester,
        skills: data.skills.split(",").map((s) => s.trim()).filter(Boolean),
        interests: data.interests.split(",").map((s) => s.trim()).filter(Boolean),
        linkedIn: data.linkedIn,
        github: data.github,
        bio: data.bio,
      });

      await refreshProfile();
      toast.success("Profile complete! Welcome aboard.");
      router.push(getDashboardPath(user.role));
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-lg border-border/60 shadow-lg">
      <CardHeader className="space-y-4 text-center">
        <Logo showText={false} className="justify-center" />
        <div>
          <CardTitle>Complete Your Student Profile</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </p>
          <div className="mt-3 flex justify-center gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-8 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input {...register("fullName")} />
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input {...register("email")} placeholder={user?.email} />
              </div>
              <div className="space-y-2">
                <Label>Profile Picture</Label>
                <Input type="file" accept="image/*" onChange={(e) => setPicture(e.target.files?.[0] ?? null)} />
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>Registration Number</Label>
                <Input {...register("registrationNumber")} placeholder="FA21-BCS-001" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={department} onValueChange={(v) => setValue("department", v as FormData["department"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["CS", "SE", "IT", "AI", "DS"].map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Semester</Label>
                  <Input type="number" {...register("semester", { valueAsNumber: true })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Batch</Label>
                <Input {...register("batch")} placeholder="2021-2025" />
              </div>
              <div className="space-y-2">
                <Label>Degree Program</Label>
                <Input {...register("degreeProgram")} placeholder="BS Computer Science" />
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Skills (comma-separated)</Label>
                <Textarea {...register("skills")} placeholder="React, Python, ML" />
              </div>
              <div className="space-y-2">
                <Label>Interests (comma-separated)</Label>
                <Textarea {...register("interests")} placeholder="Web Dev, AI" />
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea {...register("bio")} />
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label>LinkedIn URL</Label>
                <Input {...register("linkedIn")} placeholder="https://linkedin.com/in/..." />
              </div>
              <div className="space-y-2">
                <Label>GitHub URL</Label>
                <Input {...register("github")} placeholder="https://github.com/..." />
              </div>
            </>
          )}
          {step === 4 && (
            <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
              Review your information and click Finish to complete your profile and enter the platform.
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={() => setStep((s) => s + 1)}>Next</Button>
            ) : (
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="animate-spin" />}
                Finish
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

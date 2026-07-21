"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  studentOnboardingSchema,
  type StudentProfileFormValues,
} from "@/lib/validation/student-profile";
import { uploadService } from "@/services/progress.service";
import { profileService } from "@/services/profile.service";
import { useAuth } from "@/providers/auth-provider";

type FormData = StudentProfileFormValues;

const STEPS = ["Basic Info", "Academic", "Skills", "Social Links", "Finish"];

const STEP_FIELDS: Array<Array<keyof FormData>> = [
  ["fullName"],
  [
    "registrationNumber",
    "department",
    "batch",
    "degreeProgram",
    "semester",
    "cgpa",
    "phone",
  ],
  ["skills", "interests", "bio"],
  ["linkedIn", "github"],
  [],
];

export function StudentOnboardingWizard() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [picture, setPicture] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(studentOnboardingSchema),
    defaultValues: {
      department: "CS",
      semester: 7,
      fullName: "",
      registrationNumber: "",
      batch: "",
      degreeProgram: "",
      cgpa: undefined,
      phone: "",
      skills: "",
      interests: "",
      linkedIn: "",
      github: "",
      bio: "",
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = form;
  const department = watch("department");

  useEffect(() => {
    if (user?.email) {
      const suggestedName = user.email.split("@")[0] ?? "";
      if (suggestedName && !form.getValues("fullName")) {
        setValue("fullName", suggestedName.replace(/[._]/g, " "));
      }
    }
  }, [user?.email, form, setValue]);

  const goToStepWithError = (field: keyof FormData) => {
    const stepIndex = STEP_FIELDS.findIndex((fields) =>
      fields.includes(field),
    );
    if (stepIndex >= 0) {
      setStep(stepIndex);
    }
  };

  const handleNext = async () => {
    const fields = STEP_FIELDS[step];
    if (fields.length === 0) {
      setStep((current) => current + 1);
      return;
    }

    const valid = await trigger(fields);
    if (!valid) {
      toast.error("Please complete the required fields on this step.");
      return;
    }

    setStep((current) => current + 1);
  };

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    setSubmitting(true);
    try {
      let profilePicture: string | undefined;
      if (picture) {
        const uploaded = await uploadService.uploadFile(picture);
        profilePicture = uploaded.fileUrl;
      }

      const created = await profileService.createStudentProfile({
        fullName: data.fullName.trim(),
        email: user.email,
        profilePicture,
        registrationNumber: data.registrationNumber.trim(),
        department: data.department,
        batch: data.batch.trim(),
        degreeProgram: data.degreeProgram.trim(),
        semester: data.semester,
        cgpa: typeof data.cgpa === "number" ? data.cgpa : undefined,
        phone: data.phone?.trim() || undefined,
        skills: (data.skills ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        interests: (data.interests ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        linkedIn: data.linkedIn?.trim() || undefined,
        github: data.github?.trim() || undefined,
        bio: data.bio?.trim() || undefined,
      });

      await refreshProfile();
      toast.success("Profile complete! Welcome aboard.");
      router.replace(getDashboardPath(user.role));
      return created;
    } catch (e) {
      const message = getErrorMessage(e);
      if (message.toLowerCase().includes("already exists")) {
        await refreshProfile();
        toast.success("Your profile is already complete.");
        router.replace(getDashboardPath(user.role));
        return;
      }
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const onInvalid = () => {
    const firstError = Object.keys(errors)[0] as keyof FormData | undefined;
    if (firstError) {
      goToStepWithError(firstError);
    }
    toast.error("Please complete all required fields before finishing.");
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
        <form
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          className="space-y-4"
        >
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input {...register("fullName")} />
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={user?.email ?? ""}
                  readOnly
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Taken from your FOASIS account and cannot be changed here.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Profile Picture (optional)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPicture(e.target.files?.[0] ?? null)}
                />
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>Registration Number *</Label>
                <Input {...register("registrationNumber")} placeholder="FA21-BCS-001" />
                {errors.registrationNumber && (
                  <p className="text-sm text-destructive">
                    {errors.registrationNumber.message}
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Department *</Label>
                  <Select
                    value={department}
                    onValueChange={(v) =>
                      setValue("department", v as FormData["department"], {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["CS", "SE", "IT", "AI", "DS"].map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Semester *</Label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    {...register("semester", { valueAsNumber: true })}
                  />
                  {errors.semester && (
                    <p className="text-sm text-destructive">{errors.semester.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Batch *</Label>
                <Input {...register("batch")} placeholder="2021-2025" />
                {errors.batch && (
                  <p className="text-sm text-destructive">{errors.batch.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Degree Program *</Label>
                <Input {...register("degreeProgram")} placeholder="BS Computer Science" />
                {errors.degreeProgram && (
                  <p className="text-sm text-destructive">
                    {errors.degreeProgram.message}
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>CGPA (optional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    max={4}
                    placeholder="3.50"
                    {...register("cgpa", {
                      setValueAs: (v) =>
                        v === "" || v === null || v === undefined
                          ? undefined
                          : Number(v),
                    })}
                  />
                  {errors.cgpa && (
                    <p className="text-sm text-destructive">{errors.cgpa.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Phone Number (optional)</Label>
                  <Input
                    type="tel"
                    placeholder="+92 300 1234567"
                    {...register("phone")}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone.message}</p>
                  )}
                </div>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Skills (optional, comma-separated)</Label>
                <Textarea {...register("skills")} placeholder="React, Python, ML" />
                {errors.skills && (
                  <p className="text-sm text-destructive">{errors.skills.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Interests (optional, comma-separated)</Label>
                <Textarea {...register("interests")} placeholder="Web Dev, AI" />
                {errors.interests && (
                  <p className="text-sm text-destructive">{errors.interests.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Bio (optional)</Label>
                <Textarea {...register("bio")} maxLength={1000} />
                {errors.bio && (
                  <p className="text-sm text-destructive">{errors.bio.message}</p>
                )}
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label>LinkedIn URL (optional)</Label>
                <Input {...register("linkedIn")} placeholder="https://linkedin.com/in/..." />
                {errors.linkedIn && (
                  <p className="text-sm text-destructive">{errors.linkedIn.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>GitHub URL (optional)</Label>
                <Input {...register("github")} placeholder="https://github.com/..." />
                {errors.github && (
                  <p className="text-sm text-destructive">{errors.github.message}</p>
                )}
              </div>
            </>
          )}
          {step === 4 && (
            <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
              Review your information and click Finish to complete your profile and enter the platform.
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={step === 0 || submitting}
              onClick={() => setStep((s) => s - 1)}
            >
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
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

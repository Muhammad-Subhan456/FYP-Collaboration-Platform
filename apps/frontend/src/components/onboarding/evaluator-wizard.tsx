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
  fullName: z.string().min(2, "Full name is required"),
  facultyId: z.string().min(1, "Faculty ID is required"),
  department: z.enum(["CS", "SE", "IT", "AI", "DS"]),
  designation: z.string().min(1, "Designation is required"),
  researchAreas: z.string().min(1, "Research areas are required"),
  publications: z.string().optional(),
  officeLocation: z.string().optional(),
  officeHours: z.string().optional(),
  linkedIn: z.string().optional(),
  googleScholar: z.string().optional(),
  biography: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const STEPS = ["Basic Info", "Research & Office", "Links & Bio"];

const STEP_FIELDS: Array<Array<keyof FormData>> = [
  ["fullName", "facultyId", "designation", "department"],
  ["researchAreas"],
  ["linkedIn", "googleScholar", "biography"],
];

export function EvaluatorOnboardingWizard() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [picture, setPicture] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      department: "CS",
      fullName: user?.email?.split("@")[0] ?? "",
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
        profilePicture = (await uploadService.uploadFile(picture)).fileUrl;
      }

      await profileService.createEvaluatorProfile({
        fullName: data.fullName.trim(),
        email: user.email,
        profilePicture,
        facultyId: data.facultyId.trim(),
        department: data.department,
        designation: data.designation.trim(),
        researchAreas: data.researchAreas
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        publications: (data.publications ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        officeLocation: data.officeLocation?.trim() || undefined,
        officeHours: data.officeHours?.trim() || undefined,
        linkedIn: data.linkedIn?.trim() || undefined,
        googleScholar: data.googleScholar?.trim() || undefined,
        biography: data.biography?.trim() || undefined,
      });

      await refreshProfile();
      toast.success("Profile complete! Welcome to FOASIS.");
      router.replace(getDashboardPath(user.role));
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
          <CardTitle>Evaluator Profile Setup</CardTitle>
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
                <Label>Faculty ID *</Label>
                <Input {...register("facultyId")} />
                {errors.facultyId && (
                  <p className="text-sm text-destructive">{errors.facultyId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Designation *</Label>
                <Input {...register("designation")} placeholder="Assistant Professor" />
                {errors.designation && (
                  <p className="text-sm text-destructive">{errors.designation.message}</p>
                )}
              </div>
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
                <Label>Research Areas * (comma-separated)</Label>
                <Textarea {...register("researchAreas")} placeholder="AI, NLP, Computer Vision" />
                {errors.researchAreas && (
                  <p className="text-sm text-destructive">
                    {errors.researchAreas.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Publications (optional, comma-separated)</Label>
                <Textarea {...register("publications")} />
              </div>
              <div className="space-y-2">
                <Label>Office Location (optional)</Label>
                <Input {...register("officeLocation")} />
              </div>
              <div className="space-y-2">
                <Label>Office Hours (optional)</Label>
                <Input {...register("officeHours")} placeholder="Mon-Wed 2-4 PM" />
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>LinkedIn (optional)</Label>
                <Input {...register("linkedIn")} />
              </div>
              <div className="space-y-2">
                <Label>Google Scholar (optional)</Label>
                <Input {...register("googleScholar")} />
              </div>
              <div className="space-y-2">
                <Label>Biography (optional)</Label>
                <Textarea {...register("biography")} />
              </div>
              <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
                Review your information and click Finish to complete your profile.
              </div>
            </>
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

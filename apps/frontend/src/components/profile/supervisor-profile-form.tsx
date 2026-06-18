"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { ErrorState } from "@/components/common/state-blocks";
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
import { getErrorMessage } from "@/lib/axios";
import { useAuth } from "@/providers/auth-provider";
import { uploadService } from "@/services/progress.service";
import { profileService } from "@/services/profile.service";

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  facultyId: z.string().min(1),
  department: z.enum(["CS", "SE", "IT", "AI", "DS"]),
  designation: z.string().min(1),
  researchAreas: z.string(),
  publications: z.string().optional(),
  officeLocation: z.string().optional(),
  officeHours: z.string().optional(),
  linkedIn: z.string().optional(),
  googleScholar: z.string().optional(),
  biography: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const defaultFormValues: FormData = {
  fullName: "",
  email: "",
  facultyId: "",
  department: "CS",
  designation: "",
  researchAreas: "",
  publications: "",
  officeLocation: "",
  officeHours: "",
  linkedIn: "",
  googleScholar: "",
  biography: "",
};

export function SupervisorProfileForm() {
  const { refreshProfile } = useAuth();
  const [picture, setPicture] = useState<File | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: profileService.getMyProfile,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: defaultFormValues,
  });

  const department = watch("department");

  useEffect(() => {
    if (data) {
      reset({
        fullName: data.fullName,
        email: data.email ?? "",
        facultyId: data.facultyId ?? "",
        department: data.department ?? "CS",
        designation: data.designation ?? "",
        researchAreas: data.researchAreas.join(", "),
        publications: data.publications.join(", "),
        officeLocation: data.officeLocation ?? "",
        officeHours: data.officeHours ?? "",
        linkedIn: data.linkedIn ?? "",
        googleScholar: data.googleScholar ?? "",
        biography: data.biography ?? "",
      });
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: profileService.updateMyProfile,
    onSuccess: async () => {
      await refreshProfile();
      toast.success("Profile updated");
      refetch();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isLoading) return <DashboardSkeleton />;

  if (isError || !data) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Profile not found"}
        onRetry={() => refetch()}
      />
    );
  }

  const onSubmit = async (form: FormData) => {
    let profilePicture = data.profilePicture ?? undefined;
    if (picture) {
      const uploaded = await uploadService.uploadFile(picture);
      profilePicture = uploaded.fileUrl;
    }

    mutation.mutate({
      fullName: form.fullName,
      email: form.email || undefined,
      profilePicture,
      facultyId: form.facultyId,
      department: form.department,
      designation: form.designation,
      researchAreas: form.researchAreas
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      publications: (form.publications ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      officeLocation: form.officeLocation || undefined,
      officeHours: form.officeHours || undefined,
      linkedIn: form.linkedIn || undefined,
      googleScholar: form.googleScholar || undefined,
      biography: form.biography,
    });
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Supervisor Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="picture">Profile picture</Label>
            <Input
              id="picture"
              type="file"
              accept="image/*"
              onChange={(e) => setPicture(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" {...register("fullName")} />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="facultyId">Faculty ID</Label>
              <Input id="facultyId" {...register("facultyId")} />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={department ?? "CS"}
                onValueChange={(v) =>
                  setValue("department", v as FormData["department"], {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["CS", "SE", "IT", "AI", "DS"] as const).map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="designation">Designation</Label>
            <Input id="designation" {...register("designation")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="researchAreas">Research areas (comma-separated)</Label>
            <Input id="researchAreas" {...register("researchAreas")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="publications">Publications (comma-separated)</Label>
            <Input id="publications" {...register("publications")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="officeLocation">Office location</Label>
              <Input id="officeLocation" {...register("officeLocation")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="officeHours">Office hours</Label>
              <Input id="officeHours" {...register("officeHours")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="linkedIn">LinkedIn</Label>
              <Input id="linkedIn" {...register("linkedIn")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="googleScholar">Google Scholar</Label>
              <Input id="googleScholar" {...register("googleScholar")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="biography">Biography</Label>
            <Textarea id="biography" rows={4} {...register("biography")} />
          </div>
          <Button type="submit" disabled={(!isDirty && !picture) || mutation.isPending}>
            {mutation.isPending && <Loader2 className="animate-spin" />}
            Save changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

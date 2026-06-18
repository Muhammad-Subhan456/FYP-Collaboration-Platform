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
  registrationNumber: z.string().min(1),
  department: z.enum(["CS", "SE", "IT", "AI", "DS"]),
  batch: z.string().min(1),
  degreeProgram: z.string().min(1),
  semester: z.number().min(1).max(12),
  skills: z.string(),
  interests: z.string(),
  linkedIn: z.string().optional(),
  github: z.string().optional(),
  bio: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const defaultFormValues: FormData = {
  fullName: "",
  email: "",
  registrationNumber: "",
  department: "CS",
  batch: "",
  degreeProgram: "",
  semester: 7,
  skills: "",
  interests: "",
  linkedIn: "",
  github: "",
  bio: "",
};

export function StudentProfileForm() {
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
        registrationNumber: data.registrationNumber ?? "",
        department: data.department ?? "CS",
        batch: data.batch ?? "",
        degreeProgram: data.degreeProgram ?? "",
        semester: data.semester ?? 7,
        skills: data.skills.join(", "),
        interests: data.interests.join(", "),
        linkedIn: data.linkedIn ?? "",
        github: data.github ?? "",
        bio: data.bio ?? "",
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
      registrationNumber: form.registrationNumber,
      department: form.department,
      batch: form.batch,
      degreeProgram: form.degreeProgram,
      semester: form.semester,
      skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      interests: form.interests.split(",").map((s) => s.trim()).filter(Boolean),
      linkedIn: form.linkedIn || undefined,
      github: form.github || undefined,
      bio: form.bio,
    });
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Student Profile</CardTitle>
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
          <div className="space-y-2">
            <Label htmlFor="registrationNumber">Registration number</Label>
            <Input id="registrationNumber" {...register("registrationNumber")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="space-y-2">
              <Label htmlFor="batch">Batch</Label>
              <Input id="batch" placeholder="2022-2026" {...register("batch")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="degreeProgram">Degree program</Label>
              <Input id="degreeProgram" {...register("degreeProgram")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="semester">Semester</Label>
              <Input
                id="semester"
                type="number"
                {...register("semester", { valueAsNumber: true })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="skills">Skills (comma-separated)</Label>
            <Input id="skills" {...register("skills")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interests">Interests (comma-separated)</Label>
            <Input id="interests" {...register("interests")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="linkedIn">LinkedIn</Label>
              <Input id="linkedIn" {...register("linkedIn")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="github">GitHub</Label>
              <Input id="github" {...register("github")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" rows={3} {...register("bio")} />
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

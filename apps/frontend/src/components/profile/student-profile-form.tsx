"use client";

import { useUpdateStudentProfileMutation } from "@/mutations/student";
import { useStudentProfileQuery, isStudentQueryPending } from "@/queries/student";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { useAuth } from "@/providers/auth-provider";
import { getErrorMessage } from "@/lib/axios";
import {
  studentProfileFormSchema,
  type StudentProfileFormValues,
} from "@/lib/validation/student-profile";
import { uploadService } from "@/services/progress.service";

type FormData = StudentProfileFormValues;

const defaultFormValues: FormData = {
  fullName: "",
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

export function StudentProfileForm({
  title = "Student Profile",
}: {
  title?: string;
}) {
  const { user, refreshProfile } = useAuth();
  const [picture, setPicture] = useState<File | null>(null);

  const profileQuery = useStudentProfileQuery();
  const { data, isError, error, refetch } = profileQuery;

  const mutation = useUpdateStudentProfileMutation({
    onSuccess: async () => {
      await refreshProfile();
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(studentProfileFormSchema),
    defaultValues: defaultFormValues,
  });

  const department = watch("department");
  const accountEmail = user?.email ?? data?.email ?? "";

  useEffect(() => {
    if (data) {
      reset({
        fullName: data.fullName,
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

  if (isStudentQueryPending(profileQuery)) return <DashboardSkeleton />;

  if (isError || !data) {
    return (
      <ErrorState
        message={error ? getErrorMessage(error) : "Profile not found"}
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
      profilePicture,
      registrationNumber: form.registrationNumber,
      department: form.department,
      batch: form.batch,
      degreeProgram: form.degreeProgram,
      semester: form.semester,
      skills: (form.skills ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      interests: (form.interests ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      linkedIn: form.linkedIn || undefined,
      github: form.github || undefined,
      bio: form.bio || undefined,
    });
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
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
            <Input
              id="email"
              type="email"
              value={accountEmail}
              readOnly
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Managed by your FOASIS account and cannot be edited here.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="registrationNumber">Registration number</Label>
            <Input id="registrationNumber" {...register("registrationNumber")} />
            {errors.registrationNumber && (
              <p className="text-sm text-destructive">
                {errors.registrationNumber.message}
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={department ?? "CS"}
                onValueChange={(v) =>
                  setValue("department", v as FormData["department"], {
                    shouldDirty: true,
                    shouldValidate: true,
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
              {errors.batch && (
                <p className="text-sm text-destructive">{errors.batch.message}</p>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="degreeProgram">Degree program</Label>
              <Input id="degreeProgram" {...register("degreeProgram")} />
              {errors.degreeProgram && (
                <p className="text-sm text-destructive">
                  {errors.degreeProgram.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="semester">Semester</Label>
              <Input
                id="semester"
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
            <Label htmlFor="skills">Skills (comma-separated)</Label>
            <Input id="skills" {...register("skills")} />
            {errors.skills && (
              <p className="text-sm text-destructive">{errors.skills.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="interests">Interests (comma-separated)</Label>
            <Input id="interests" {...register("interests")} />
            {errors.interests && (
              <p className="text-sm text-destructive">{errors.interests.message}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="linkedIn">LinkedIn</Label>
              <Input
                id="linkedIn"
                placeholder="https://linkedin.com/in/..."
                {...register("linkedIn")}
              />
              {errors.linkedIn && (
                <p className="text-sm text-destructive">{errors.linkedIn.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="github">GitHub</Label>
              <Input
                id="github"
                placeholder="https://github.com/..."
                {...register("github")}
              />
              {errors.github && (
                <p className="text-sm text-destructive">{errors.github.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" rows={3} maxLength={1000} {...register("bio")} />
            {errors.bio && (
              <p className="text-sm text-destructive">{errors.bio.message}</p>
            )}
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

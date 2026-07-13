"use client";

import { useUpdateCoordinatorProfileMutation } from "@/mutations/coordinator";
import {
  isCoordinatorQueryInitialLoading,
  useCoordinatorProfileQuery,
} from "@/queries/coordinator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { ErrorState } from "@/components/common/state-blocks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { uploadService } from "@/services/progress.service";

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  facultyId: z.string().min(1),
  department: z.enum(["CS", "SE", "IT", "AI", "DS"]),
  designation: z.string().min(1),
  coordinatorRole: z.string().optional(),
  officeLocation: z.string().optional(),
  contactInformation: z.string().optional(),
  biography: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const defaultFormValues: FormData = {
  fullName: "",
  email: "",
  facultyId: "",
  department: "CS",
  designation: "",
  coordinatorRole: "",
  officeLocation: "",
  contactInformation: "",
  biography: "",
};

export function CoordinatorProfileForm() {
  const { refreshProfile } = useAuth();
  const [picture, setPicture] = useState<File | null>(null);

  const profileQuery = useCoordinatorProfileQuery();
  const { data, isError, error, refetch } = profileQuery;

  const mutation = useUpdateCoordinatorProfileMutation({
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
        coordinatorRole: data.coordinatorRole ?? "",
        officeLocation: data.officeLocation ?? "",
        contactInformation: data.contactInformation ?? "",
        biography: data.biography ?? "",
      });
    }
  }, [data, reset]);

  if (isCoordinatorQueryInitialLoading(profileQuery)) return <DashboardSkeleton />;

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
      email: form.email || undefined,
      profilePicture,
      facultyId: form.facultyId,
      department: form.department,
      designation: form.designation,
      coordinatorRole: form.coordinatorRole || undefined,
      officeLocation: form.officeLocation || undefined,
      contactInformation: form.contactInformation || undefined,
      biography: form.biography,
    });
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Coordinator Profile</CardTitle>
        <CardDescription>
          Update your coordinator account details for this workspace.
        </CardDescription>
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
            <Label htmlFor="coordinatorRole">Coordinator role</Label>
            <Input id="coordinatorRole" {...register("coordinatorRole")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="officeLocation">Office location</Label>
              <Input id="officeLocation" {...register("officeLocation")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactInformation">Contact information</Label>
              <Input id="contactInformation" {...register("contactInformation")} />
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

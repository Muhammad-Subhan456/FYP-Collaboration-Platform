"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Logo } from "@/components/common/logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/axios";
import { invitationService } from "@/services/invitation.service";
import { authService } from "@/services/auth.service";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useAuth } from "@/providers/auth-provider";

const schema = z
  .object({
    fullName: z.string().min(2, "Name is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { completeSession } = useAuthSession();
  const { syncSession } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const invitationQuery = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => invitationService.verify(token),
    enabled: !!token,
    retry: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: invitationQuery.data?.fullName ?? "",
    },
  });

  const subtitle = useMemo(() => {
    if (!invitationQuery.data) return "Set up your FOASIS account";
    return `Join ${invitationQuery.data.workspaceName} as ${invitationQuery.data.role}`;
  }, [invitationQuery.data]);

  const onSubmit = async (data: FormValues) => {
    if (!token) return;
    setIsSubmitting(true);
    try {
      const accepted = await invitationService.accept({
        token,
        fullName: data.fullName,
        password: data.password,
      });

      const loginResponse = await authService.login({
        email: accepted.email,
        password: data.password,
      });

      if (loginResponse.accessToken) {
        await completeSession(loginResponse.accessToken);
        await syncSession();
        toast.success("Account created successfully");
        return;
      }

      router.push("/auth/login");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invalid invitation</CardTitle>
          <CardDescription>
            This invitation link is missing or malformed.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-lg">
      <CardHeader className="space-y-4 text-center">
        <div className="flex justify-center">
          <Logo showText={false} />
        </div>
        <div>
          <CardTitle className="text-2xl">Accept invitation</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {invitationQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : invitationQuery.isError ? (
            <p className="text-sm text-destructive">
              {getErrorMessage(invitationQuery.error)}
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={invitationQuery.data?.email ?? ""} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" {...register("fullName")} />
                {errors.fullName ? (
                  <p className="text-sm text-destructive">
                    {errors.fullName.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...register("password")}
                />
                {errors.password ? (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword ? (
                  <p className="text-sm text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                ) : null}
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            disabled={
              isSubmitting ||
              invitationQuery.isLoading ||
              invitationQuery.isError
            }
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Create account
          </Button>
          <Link
            href="/auth/login"
            className="text-sm text-primary hover:underline"
          >
            Already have an account? Sign in
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardContent className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </CardContent>
        </Card>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}

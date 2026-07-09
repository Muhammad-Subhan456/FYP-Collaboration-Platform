"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
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
import { getErrorMessage } from "@/lib/axios";
import {
  CONTEXT_OPTIONS_KEY,
  CONTEXT_SELECTION_TOKEN_KEY,
  getStoredContextOptions,
} from "@/hooks/use-auth-session";
import { useAuth } from "@/providers/auth-provider";
import type { AuthContextOption, UserRole } from "@/types";

export default function SelectContextPage() {
  const router = useRouter();
  const { selectContext } = useAuth();
  const [contexts, setContexts] = useState<AuthContextOption[]>([]);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem(CONTEXT_SELECTION_TOKEN_KEY);
    const options = getStoredContextOptions();

    if (!token || options.length === 0) {
      router.replace("/auth/login");
      return;
    }

    setContexts(options);
  }, [router]);

  const handleSelect = async (
    workspaceId: string,
    role: UserRole,
  ) => {
    const key = `${workspaceId}-${role}`;
    setLoadingKey(key);
    try {
      await selectContext(workspaceId, role);
      toast.success("Signed in");
    } catch (error) {
      toast.error(getErrorMessage(error));
      sessionStorage.removeItem(CONTEXT_SELECTION_TOKEN_KEY);
      sessionStorage.removeItem(CONTEXT_OPTIONS_KEY);
      router.replace("/auth/login");
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <Card className="border-border/60 shadow-lg">
      <CardHeader className="space-y-4 text-center">
        <div className="flex justify-center">
          <Logo showText={false} />
        </div>
        <div>
          <CardTitle className="text-2xl">Choose your workspace</CardTitle>
          <CardDescription>
            Select which workspace and role you want to use for this session
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {contexts.map((context) => {
          const key = `${context.workspaceId}-${context.role}`;
          const isLoading = loadingKey === key;

          return (
            <Button
              key={key}
              variant="outline"
              className="h-auto w-full justify-start gap-3 py-4"
              disabled={!!loadingKey}
              onClick={() =>
                handleSelect(context.workspaceId, context.role)
              }
            >
              <Building2 className="h-5 w-5 shrink-0" />
              <div className="text-left">
                <p className="font-medium">{context.workspaceName}</p>
                <p className="text-xs text-muted-foreground">
                  {context.role}
                </p>
              </div>
              {isLoading ? (
                <Loader2 className="ml-auto h-4 w-4 animate-spin" />
              ) : null}
            </Button>
          );
        })}
      </CardContent>
      <CardFooter className="justify-center">
        <Link href="/auth/login" className="text-sm text-primary hover:underline">
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  );
}

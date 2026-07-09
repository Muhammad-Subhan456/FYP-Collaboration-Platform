"use client";

import Link from "next/link";

import { Logo } from "@/components/common/logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  return (
    <Card className="border-border/60 shadow-lg">
      <CardHeader className="space-y-4 text-center">
        <div className="flex justify-center">
          <Logo showText={false} />
        </div>
        <div>
          <CardTitle className="text-2xl">Invitation required</CardTitle>
          <CardDescription>
            FOASIS accounts are created through coordinator invitations
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Ask your program coordinator to invite you by email. You will receive a
        secure link to set your password and join your workspace.
      </CardContent>
      <CardFooter className="justify-center">
        <Button asChild variant="outline">
          <Link href="/auth/login">Back to sign in</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

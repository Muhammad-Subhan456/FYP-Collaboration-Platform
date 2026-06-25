"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CreditCard, Loader2, Lock } from "lucide-react";
import { useState, Suspense } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/common/logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EXAMPLE_ORGANIZATIONS } from "@/constants/subscription-plans";
import type { SubscriptionPlanId } from "@/constants/subscription-plans";
import { getErrorMessage } from "@/lib/axios";
import { organizationService } from "@/services/organization.service";

function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = (searchParams.get("plan") ?? "STARTER").toUpperCase() as SubscriptionPlanId;
  const [organizationName, setOrganizationName] = useState("");
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [processing, setProcessing] = useState(false);

  const plansQuery = useQuery({
    queryKey: ["organizations", "plans"],
    queryFn: organizationService.getPlans,
  });

  const selectedPlan = plansQuery.data?.find((plan) => plan.id === planParam);

  const subscribeMutation = useMutation({
    mutationFn: organizationService.subscribe,
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const handlePay = async () => {
    if (!organizationName.trim()) {
      toast.error("Organization name is required");
      return;
    }

    setProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      const organization = await subscribeMutation.mutateAsync({
        organizationName: organizationName.trim(),
        plan: planParam,
      });

      router.push(
        `/checkout/success?org=${encodeURIComponent(organization.name)}&plan=${organization.plan}`,
      );
    } catch {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <Logo />
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-6 py-10 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Stripe Checkout
            </CardTitle>
            <CardDescription>
              Simulated payment flow for FOASIS organization activation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                placeholder="e.g. University A"
                list="organization-examples"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
              />
              <datalist id="organization-examples">
                {EXAMPLE_ORGANIZATIONS.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="card">Card number</Label>
              <Input
                id="card"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry</Label>
                <Input id="expiry" defaultValue="12/30" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvc">CVC</Label>
                <Input id="cvc" defaultValue="123" />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handlePay}
              disabled={processing || subscribeMutation.isPending}
            >
              {(processing || subscribeMutation.isPending) && (
                <Loader2 className="animate-spin" />
              )}
              <CreditCard className="h-4 w-4" />
              Pay ${selectedPlan?.price ?? 0}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              This is a demo checkout. No real payment is processed.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
            <CardDescription>
              {selectedPlan?.name ?? planParam} subscription
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span>Plan</span>
              <span className="font-medium">{selectedPlan?.name ?? planParam}</span>
            </div>
            <div className="flex justify-between">
              <span>Team limit</span>
              <span>{selectedPlan?.teamLimit ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span>Storage</span>
              <span>{selectedPlan?.storageLimitGb ?? "—"} GB</span>
            </div>
            <div className="flex justify-between border-t pt-4 text-base font-semibold">
              <span>Total due today</span>
              <span>${selectedPlan?.price ?? 0}</span>
            </div>
            <Button variant="outline" asChild className="w-full">
              <Link href="/pricing">Back to pricing</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted/30">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <CheckoutPageContent />
    </Suspense>
  );
}

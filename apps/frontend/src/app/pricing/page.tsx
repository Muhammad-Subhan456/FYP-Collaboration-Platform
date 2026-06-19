"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";

import { Logo } from "@/components/common/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EXAMPLE_ORGANIZATIONS } from "@/constants/subscription-plans";
import { organizationService } from "@/services/organization.service";
import { cn } from "@/lib/utils";

export default function PricingPage() {
  const plansQuery = useQuery({
    queryKey: ["organizations", "plans"],
    queryFn: organizationService.getPlans,
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" asChild>
            <Link href="/auth/login">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-6 pb-20">
        <section className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            FOASIS for your institution
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Multi-tenant SaaS plans for universities and colleges. Choose a plan,
            complete checkout, and activate your organization workspace.
          </p>
          {/* <p className="mt-4 text-sm text-muted-foreground">
            Trusted by programs like{" "}
            {EXAMPLE_ORGANIZATIONS.join(", ")}.
          </p> */}
        </section>

        {plansQuery.isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {(plansQuery.data ?? []).map((plan, index) => (
              <Card
                key={plan.id}
                className={cn(
                  "flex flex-col",
                  index === 1 && "border-primary shadow-lg",
                )}
              >
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>
                    ${plan.price}/month · up to {plan.teamLimit} teams ·{" "}
                    {plan.storageLimitGb} GB storage
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <p className="text-3xl font-bold">${plan.price}</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    Analytics access:{" "}
                    {plan.analyticsAccess ? "Included" : "Not included"}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href={`/checkout?plan=${plan.id}`}>Subscribe</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

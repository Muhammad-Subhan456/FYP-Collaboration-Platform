export const EXAMPLE_ORGANIZATIONS = [
  "University A",
  "University B",
  "University C",
] as const;

export type SubscriptionPlanId =
  | "STARTER"
  | "PROFESSIONAL"
  | "ENTERPRISE";

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  price: number;
  teamLimit: number;
  storageLimitGb: number;
  analyticsAccess: boolean;
  features: string[];
}

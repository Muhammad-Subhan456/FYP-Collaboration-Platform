import api from "@/lib/axios";
import type {
  SubscriptionPlan,
  SubscriptionPlanId,
} from "@/constants/subscription-plans";

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  plan: SubscriptionPlanId;
  isActive: boolean;
  subscribedAt?: string | null;
}

export const organizationService = {
  getPlans: async () => {
    const res = await api.get<SubscriptionPlan[]>("/organizations/plans");
    return res.data;
  },

  getMyOrganization: async () => {
    const res = await api.get<OrganizationRecord | null>("/organizations/me");
    return res.data;
  },

  subscribe: async (data: {
    organizationName: string;
    plan: SubscriptionPlanId;
  }) => {
    const res = await api.post<OrganizationRecord>(
      "/organizations/subscribe",
      data,
    );
    return res.data;
  },
};

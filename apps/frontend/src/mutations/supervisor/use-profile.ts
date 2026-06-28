import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/axios";
import { profileService } from "@/services/profile.service";

import { useQueryClient } from "@tanstack/react-query";

import { invalidateSupervisorProfile } from "./invalidate";

export function useUpdateSupervisorProfileMutation(options?: {
  onSuccess?: () => void | Promise<void>;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: profileService.updateMyProfile,
    onSuccess: async () => {
      invalidateSupervisorProfile(queryClient);
      await options?.onSuccess?.();
      toast.success("Profile updated");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

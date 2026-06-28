import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/axios";
import { profileService } from "@/services/profile.service";

import { invalidateCoordinatorProfile } from "./invalidate";

export function useUpdateCoordinatorProfileMutation(options?: {
  onSuccess?: () => void | Promise<void>;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: profileService.updateMyProfile,
    onSuccess: async () => {
      invalidateCoordinatorProfile(queryClient);
      await options?.onSuccess?.();
      toast.success("Profile updated");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

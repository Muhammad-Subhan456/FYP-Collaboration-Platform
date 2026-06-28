import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/axios";
import { profileService } from "@/services/profile.service";

import { invalidateStudentProfile } from "./invalidate";

export function useUpdateStudentProfileMutation(options?: {
  onSuccess?: () => void | Promise<void>;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: profileService.updateMyProfile,
    onSuccess: async () => {
      invalidateStudentProfile(queryClient);
      await options?.onSuccess?.();
      toast.success("Profile updated");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

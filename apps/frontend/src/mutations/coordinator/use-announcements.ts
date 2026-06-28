import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/axios";
import { coordinatorService } from "@/services/coordinator.service";

import { invalidateCoordinatorAnnouncements } from "./invalidate";

export function useCoordinatorCreateAnnouncementMutation(options?: {
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: coordinatorService.createGlobalAnnouncement,
    onSuccess: () => {
      toast.success("Announcement published");
      invalidateCoordinatorAnnouncements(queryClient);
      options?.onSuccess?.();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/axios";
import { prependGlobalAnnouncementToCaches } from "@/lib/realtime/global-announcement-cache";
import { useAuth } from "@/providers/auth-provider";
import { coordinatorService } from "@/services/coordinator.service";

import { invalidateCoordinatorAnnouncements } from "./invalidate";

export function useCoordinatorCreateAnnouncementMutation(options?: {
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: coordinatorService.createGlobalAnnouncement,
    onSuccess: (announcement) => {
      toast.success("Announcement published");

      if (user?.userId) {
        prependGlobalAnnouncementToCaches(
          queryClient,
          "COORDINATOR",
          user.userId,
          user.workspaceId ?? null,
          announcement,
        );
      }

      invalidateCoordinatorAnnouncements(queryClient);
      options?.onSuccess?.();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

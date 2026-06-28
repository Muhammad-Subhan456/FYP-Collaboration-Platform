import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/axios";
import { notificationService } from "@/services/notification.service";

import { invalidateSupervisorNotifications } from "./invalidate";

export function useSupervisorNotificationMutations() {
  const queryClient = useQueryClient();

  const markReadMutation = useMutation({
    mutationFn: notificationService.markAsRead,
    onSuccess: () => {
      invalidateSupervisorNotifications(queryClient);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const markAllMutation = useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => {
      toast.success("All notifications marked as read");
      invalidateSupervisorNotifications(queryClient);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return { markReadMutation, markAllMutation };
}

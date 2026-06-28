import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/axios";
import { notificationService } from "@/services/notification.service";

import { invalidateCoordinatorNotifications } from "./invalidate";

export function useCoordinatorNotificationMutations() {
  const queryClient = useQueryClient();

  const markReadMutation = useMutation({
    mutationFn: notificationService.markAsRead,
    onSuccess: () => {
      invalidateCoordinatorNotifications(queryClient);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const markAllMutation = useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => {
      toast.success("All notifications marked as read");
      invalidateCoordinatorNotifications(queryClient);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return { markReadMutation, markAllMutation };
}

import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/axios";
import { notificationService } from "@/services/notification.service";

import { invalidateStudentNotifications } from "./invalidate";

export function useStudentNotificationMutations() {
  const queryClient = useQueryClient();

  const markReadMutation = useMutation({
    mutationFn: notificationService.markAsRead,
    onSuccess: () => {
      invalidateStudentNotifications(queryClient);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const markAllMutation = useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => {
      toast.success("All notifications marked as read");
      invalidateStudentNotifications(queryClient);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return { markReadMutation, markAllMutation };
}

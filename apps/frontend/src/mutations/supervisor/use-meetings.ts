import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/axios";
import { supervisorService } from "@/services/supervisor.service";

import { invalidateSupervisorMeetings } from "./invalidate";

export function useSupervisorCreateMeetingMutation(options?: {
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: supervisorService.createMeeting,
    onSuccess: () => {
      toast.success("Meeting scheduled");
      invalidateSupervisorMeetings(queryClient);
      options?.onSuccess?.();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

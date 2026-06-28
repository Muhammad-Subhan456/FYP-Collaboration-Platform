import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/axios";
import { authService } from "@/services/auth.service";
import type { UserRole } from "@/types";

import { invalidateCoordinatorUsers } from "./invalidate";

export function useCoordinatorUserMutations() {
  const queryClient = useQueryClient();

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      authService.updateUserRole(userId, role),
    onSuccess: () => {
      toast.success("User role updated");
      invalidateCoordinatorUsers(queryClient);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      authService.updateUserStatus(userId, isActive),
    onSuccess: () => {
      toast.success("User status updated");
      invalidateCoordinatorUsers(queryClient);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return { roleMutation, statusMutation };
}

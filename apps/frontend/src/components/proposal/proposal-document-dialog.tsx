"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorState } from "@/components/common/state-blocks";
import { getErrorMessage } from "@/lib/axios";
import { proposalService } from "@/services/proposal.service";
import { ProposalDocument } from "@/components/proposal/proposal-document";

export function ProposalDocumentDialog({
  proposalId,
  open,
  onOpenChange,
}: {
  proposalId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const query = useQuery({
    queryKey: ["proposal-document", proposalId],
    queryFn: () => proposalService.getProposalDocument(proposalId as string),
    enabled: open && !!proposalId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Project Proposal</DialogTitle>
        </DialogHeader>
        {query.isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : query.isError ? (
          <ErrorState
            message={getErrorMessage(query.error)}
            onRetry={() => query.refetch()}
          />
        ) : query.data ? (
          <ProposalDocument data={query.data} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MailPlus, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/common/status-badge";
import { formatDate } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { invalidateCoordinatorUsers } from "@/mutations/coordinator/invalidate";
import { queryKeys } from "@/lib/react-query";
import { useAuth } from "@/providers/auth-provider";
import {
  coordinatorUsersService,
  type CsvImportSummary,
} from "@/services/invitation.service";
import type { UserRole } from "@/types";

const INVITE_ROLES: UserRole[] = [
  "STUDENT",
  "SUPERVISOR",
  "COORDINATOR",
  "EVALUATOR",
];

type CsvPreviewRow = {
  row: number;
  email: string;
  fullName?: string;
  role: string;
  valid: boolean;
  reason?: string;
};

function parseCsvPreview(content: string): CsvPreviewRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const startIndex =
    lines[0]?.toLowerCase().includes("email") ? 1 : 0;
  const rows: CsvPreviewRow[] = [];

  for (let index = startIndex; index < lines.length; index++) {
    const line = lines[index];
    const rowNumber = index + 1;
    const parts = line.split(",").map((part) => part.trim());

    if (parts.length < 2) {
      rows.push({
        row: rowNumber,
        email: parts[0] ?? "",
        role: parts[1] ?? "",
        valid: false,
        reason: "Expected email,fullName,role or email,role",
      });
      continue;
    }

    let email: string;
    let fullName: string | undefined;
    let roleRaw: string;

    if (parts.length >= 3) {
      [email, fullName, roleRaw] = parts;
    } else {
      [email, roleRaw] = parts;
    }

    const role = roleRaw.toUpperCase();

    if (!email.includes("@")) {
      rows.push({
        row: rowNumber,
        email,
        fullName,
        role,
        valid: false,
        reason: "Invalid email address",
      });
      continue;
    }

    if (!INVITE_ROLES.includes(role as UserRole)) {
      rows.push({
        row: rowNumber,
        email,
        fullName,
        role,
        valid: false,
        reason: "Unsupported role",
      });
      continue;
    }

    rows.push({
      row: rowNumber,
      email,
      fullName,
      role,
      valid: true,
    });
  }

  return rows;
}

export function CoordinatorInvitePanel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("STUDENT");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CsvPreviewRow[]>([]);
  const [importSummary, setImportSummary] =
    useState<CsvImportSummary | null>(null);

  const invitationsQuery = useQuery({
    queryKey: queryKeys.coordinator.invitations(user?.workspaceId),
    queryFn: () => coordinatorUsersService.listInvitations(),
    enabled: !!user?.workspaceId,
  });

  const pendingInvitations = (invitationsQuery.data ?? []).filter(
    (invitation) => invitation.status === "PENDING",
  );

  const inviteMutation = useMutation({
    mutationFn: () =>
      coordinatorUsersService.invite({
        email,
        fullName: fullName || undefined,
        role,
      }),
    onSuccess: (result: {
      assignedExistingUser?: boolean;
    }) => {
      toast.success(
        result.assignedExistingUser
          ? "User assigned — notification email sent"
          : "Invitation sent",
      );
      setInviteOpen(false);
      setEmail("");
      setFullName("");
      queryClient.invalidateQueries({
        queryKey: queryKeys.coordinator.invitations(user?.workspaceId),
      });
      invalidateCoordinatorUsers(queryClient);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const resendMutation = useMutation({
    mutationFn: (invitationId: string) =>
      coordinatorUsersService.resendInvitation(invitationId),
    onSuccess: () => {
      toast.success("Invitation resent");
      queryClient.invalidateQueries({
        queryKey: queryKeys.coordinator.invitations(user?.workspaceId),
      });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => coordinatorUsersService.importCsv(file),
    onSuccess: (summary) => {
      setImportSummary(summary);
      queryClient.invalidateQueries({
        queryKey: queryKeys.coordinator.invitations(user?.workspaceId),
      });
      invalidateCoordinatorUsers(queryClient);
      toast.success(
        `Sent ${summary.invited} invitation(s) · ${summary.skipped} skipped · ${summary.invalid} invalid`,
      );
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const resetImportDialog = () => {
    setSelectedFile(null);
    setCsvPreview([]);
    setImportSummary(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = async (file: File | undefined) => {
    setImportSummary(null);
    if (!file) {
      setSelectedFile(null);
      setCsvPreview([]);
      return;
    }

    setSelectedFile(file);
    try {
      const content = await file.text();
      setCsvPreview(parseCsvPreview(content));
    } catch {
      setCsvPreview([]);
      toast.error("Could not read the selected CSV file");
    }
  };

  const handleImport = () => {
    if (!selectedFile) {
      toast.error("Select a CSV file first");
      return;
    }

    importMutation.mutate(selectedFile);
  };

  const validPreviewCount = csvPreview.filter((row) => row.valid).length;
  const invalidPreviewCount = csvPreview.length - validPreviewCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setInviteOpen(true)}>
          <MailPlus className="mr-2 h-4 w-4" />
          Invite user
        </Button>
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Pending invitations</h3>
        {pendingInvitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No pending invitations.
          </p>
        ) : (
          pendingInvitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div>
                <p className="font-medium">{invitation.email}</p>
                <p className="text-sm text-muted-foreground">
                  {invitation.role} · expires {formatDate(invitation.expiresAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={invitation.status} />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={resendMutation.isPending}
                  onClick={() => resendMutation.mutate(invitation.id)}
                >
                  Resend
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite user</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Full name (optional)</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as UserRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_ROLES.map((inviteRole) => (
                    <SelectItem key={inviteRole} value={inviteRole}>
                      {inviteRole}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => inviteMutation.mutate()}
              disabled={!email || inviteMutation.isPending}
            >
              {inviteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Send invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) resetImportDialog();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import users from CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Format: <code>email,fullName,role</code> or{" "}
              <code>email,role</code>. Supported roles:{" "}
              {INVITE_ROLES.join(", ")}.
            </p>
            <div className="space-y-2">
              <Label htmlFor="csv-file">CSV file</Label>
              <Input
                id="csv-file"
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                disabled={importMutation.isPending}
                onChange={(event) => {
                  void handleFileSelect(event.target.files?.[0]);
                }}
              />
            </div>

            {selectedFile ? (
              <p className="text-sm">
                Selected: <strong>{selectedFile.name}</strong> (
                {csvPreview.length} row{csvPreview.length === 1 ? "" : "s"})
              </p>
            ) : null}

            {csvPreview.length > 0 && !importSummary ? (
              <div className="max-h-64 overflow-auto rounded-lg border p-3 text-sm">
                <p className="mb-2 font-medium">
                  Preview: {validPreviewCount} valid · {invalidPreviewCount}{" "}
                  invalid
                </p>
                <ul className="space-y-1">
                  {csvPreview.map((row) => (
                    <li
                      key={row.row}
                      className={
                        row.valid ? undefined : "text-destructive"
                      }
                    >
                      Row {row.row}: {row.email}
                      {row.fullName ? ` (${row.fullName})` : ""} — {row.role}
                      {row.reason ? ` — ${row.reason}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {importSummary ? (
              <div className="max-h-64 overflow-auto rounded-lg border p-3 text-sm">
                <p className="font-medium">Import summary</p>
                <p className="mt-1">
                  Imported: {importSummary.invited} · Skipped:{" "}
                  {importSummary.skipped} · Invalid: {importSummary.invalid}
                </p>
                <ul className="mt-2 space-y-1">
                  {importSummary.rows.map((row) => (
                    <li key={row.row}>
                      Row {row.row}: {row.email} ({row.role}) — {row.status}
                      {row.reason ? ` — ${row.reason}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              disabled={importMutation.isPending}
              onClick={() => {
                setImportOpen(false);
                resetImportDialog();
              }}
            >
              {importSummary ? "Close" : "Cancel"}
            </Button>
            {!importSummary ? (
              <Button
                onClick={handleImport}
                disabled={
                  !selectedFile ||
                  csvPreview.length === 0 ||
                  validPreviewCount === 0 ||
                  importMutation.isPending
                }
              >
                {importMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Send invitations
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

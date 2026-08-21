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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_DEPARTMENTS = new Set(["CS", "SE", "IT", "AI", "DS"]);

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function isRollHeader(normalized: string): boolean {
  return (
    normalized === "rollno" ||
    normalized === "registrationnumber" ||
    normalized === "registrationno" ||
    normalized === "regno"
  );
}

function cellAt(
  parts: string[],
  headerIndex: Map<string, number>,
  keys: string[],
): string {
  for (const key of keys) {
    const idx = headerIndex.get(key);
    if (idx !== undefined && parts[idx] !== undefined) {
      return parts[idx].trim();
    }
  }
  return "";
}

function parseCsvPreview(content: string): CsvPreviewRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const firstCells = lines[0].split(",").map((part) => part.trim());
  const hasHeader = firstCells.some(
    (cell) => normalizeHeader(cell) === "email",
  );
  const isStudentFormat =
    hasHeader && firstCells.map(normalizeHeader).some(isRollHeader);

  const headerIndex = new Map<string, number>();
  if (hasHeader) {
    firstCells.forEach((cell, i) => {
      const key = normalizeHeader(cell);
      if (key) headerIndex.set(key, i);
    });
  }

  const startIndex = hasHeader ? 1 : 0;
  const rows: CsvPreviewRow[] = [];
  const seenEmails = new Set<string>();
  const seenRolls = new Set<string>();

  for (let index = startIndex; index < lines.length; index++) {
    const line = lines[index];
    const rowNumber = index + 1;
    const parts = line.split(",").map((part) => part.trim());

    if (isStudentFormat) {
      const emailRaw = cellAt(parts, headerIndex, ["email"]);
      const roleRaw = cellAt(parts, headerIndex, ["role"]).toUpperCase();
      const roll = cellAt(parts, headerIndex, [
        "rollno",
        "registrationnumber",
        "registrationno",
        "regno",
      ]);
      const batch = cellAt(parts, headerIndex, ["batch"]);
      const department = cellAt(parts, headerIndex, ["department"]).toUpperCase();
      const degree = cellAt(parts, headerIndex, [
        "degree",
        "degreeprogram",
        "degreeprogramme",
      ]);
      const email = emailRaw.trim().toLowerCase();

      if (!EMAIL_RE.test(emailRaw.trim())) {
        rows.push({
          row: rowNumber,
          email: emailRaw,
          role: roleRaw,
          valid: false,
          reason: "Invalid email address",
        });
        continue;
      }

      if (seenEmails.has(email)) {
        rows.push({
          row: rowNumber,
          email,
          role: roleRaw,
          valid: false,
          reason: "Duplicate email in CSV",
        });
        continue;
      }

      if (roleRaw !== "STUDENT") {
        rows.push({
          row: rowNumber,
          email,
          role: roleRaw,
          valid: false,
          reason: "Student CSV rows must use role STUDENT",
        });
        continue;
      }

      if (!roll || !batch || !department || !degree) {
        rows.push({
          row: rowNumber,
          email,
          role: roleRaw,
          valid: false,
          reason: "Student rows require roll no, batch, department, and degree",
        });
        continue;
      }

      if (!VALID_DEPARTMENTS.has(department)) {
        rows.push({
          row: rowNumber,
          email,
          role: roleRaw,
          valid: false,
          reason: "Invalid department (use CS, SE, IT, AI, or DS)",
        });
        continue;
      }

      const rollKey = roll.toLowerCase();
      if (seenRolls.has(rollKey)) {
        rows.push({
          row: rowNumber,
          email,
          role: roleRaw,
          valid: false,
          reason: "Duplicate registration number in CSV",
        });
        continue;
      }

      seenEmails.add(email);
      seenRolls.add(rollKey);
      rows.push({
        row: rowNumber,
        email,
        role: roleRaw,
        valid: true,
      });
      continue;
    }

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
    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_RE.test(email.trim())) {
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

    if (seenEmails.has(normalizedEmail)) {
      rows.push({
        row: rowNumber,
        email: normalizedEmail,
        fullName,
        role,
        valid: false,
        reason: "Duplicate email in CSV",
      });
      continue;
    }

    if (!INVITE_ROLES.includes(role as UserRole)) {
      rows.push({
        row: rowNumber,
        email: normalizedEmail,
        fullName,
        role,
        valid: false,
        reason: "Unsupported role",
      });
      continue;
    }

    seenEmails.add(normalizedEmail);
    rows.push({
      row: rowNumber,
      email: normalizedEmail,
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
  const [recipientsViewAll, setRecipientsViewAll] = useState<{
    title: string;
    lines: string[];
  } | null>(null);

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
    setRecipientsViewAll(null);
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
        <DialogContent closeOnOutsideClick={false}>
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
        <DialogContent className="max-w-2xl" closeOnOutsideClick={false}>
          <DialogHeader>
            <DialogTitle>Import users from CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong className="font-medium text-foreground">Students:</strong>{" "}
                <code>Email, Roll No, Batch, Department, Degree, Role</code>
                {" "}(department: CS, SE, IT, AI, or DS; role must be STUDENT).
              </p>
              <p>
                <strong className="font-medium text-foreground">Faculty:</strong>{" "}
                <code>email,fullName,role</code> or <code>email,role</code>.
                Roles: {INVITE_ROLES.join(", ")}.
              </p>
            </div>
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
              <RecipientListPreview
                heading={`Preview: ${validPreviewCount} valid · ${invalidPreviewCount} invalid`}
                items={csvPreview.map((row) => ({
                  key: String(row.row),
                  text: `Row ${row.row}: ${row.email}${
                    row.fullName ? ` (${row.fullName})` : ""
                  } — ${row.role}${row.reason ? ` — ${row.reason}` : ""}`,
                  destructive: !row.valid,
                }))}
                onViewAll={() =>
                  setRecipientsViewAll({
                    title: `All recipients (${csvPreview.length})`,
                    lines: csvPreview.map(
                      (row) =>
                        `Row ${row.row}: ${row.email}${
                          row.fullName ? ` (${row.fullName})` : ""
                        } — ${row.role}${row.reason ? ` — ${row.reason}` : ""}`,
                    ),
                  })
                }
              />
            ) : null}

            {importSummary ? (
              <RecipientListPreview
                heading="Import summary"
                subheading={`Imported: ${importSummary.invited} · Skipped: ${importSummary.skipped} · Invalid: ${importSummary.invalid}`}
                items={importSummary.rows.map((row) => ({
                  key: String(row.row),
                  text: `Row ${row.row}: ${row.email} (${row.role}) — ${row.status}${
                    row.reason ? ` — ${row.reason}` : ""
                  }`,
                }))}
                onViewAll={() =>
                  setRecipientsViewAll({
                    title: `All import results (${importSummary.rows.length})`,
                    lines: importSummary.rows.map(
                      (row) =>
                        `Row ${row.row}: ${row.email} (${row.role}) — ${row.status}${
                          row.reason ? ` — ${row.reason}` : ""
                        }`,
                    ),
                  })
                }
              />
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

      <Dialog
        open={!!recipientsViewAll}
        onOpenChange={(open) => {
          if (!open) setRecipientsViewAll(null);
        }}
      >
        <DialogContent className="max-w-2xl" closeOnOutsideClick={false}>
          <DialogHeader>
            <DialogTitle>
              {recipientsViewAll?.title ?? "All recipients"}
            </DialogTitle>
          </DialogHeader>
          <ul className="max-h-[60vh] space-y-1 overflow-auto rounded-lg border p-3 text-sm">
            {(recipientsViewAll?.lines ?? []).map((line, index) => (
              <li key={`${index}-${line}`}>{line}</li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecipientsViewAll(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const RECIPIENT_PREVIEW_LIMIT = 5;

function RecipientListPreview({
  heading,
  subheading,
  items,
  onViewAll,
}: {
  heading: string;
  subheading?: string;
  items: Array<{ key: string; text: string; destructive?: boolean }>;
  onViewAll: () => void;
}) {
  const visible = items.slice(0, RECIPIENT_PREVIEW_LIMIT);
  const hasMore = items.length > RECIPIENT_PREVIEW_LIMIT;

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border p-3 text-sm">
      <p className="mb-1 font-medium">{heading}</p>
      {subheading ? <p className="mb-2 text-muted-foreground">{subheading}</p> : null}
      <ul className="space-y-1">
        {visible.map((item) => (
          <li
            key={item.key}
            className={item.destructive ? "text-destructive" : undefined}
          >
            {item.text}
          </li>
        ))}
      </ul>
      {hasMore ? (
        <Button
          type="button"
          variant="link"
          className="mt-2 h-auto px-0"
          onClick={onViewAll}
        >
          View All ({items.length})
        </Button>
      ) : null}
    </div>
  );
}

import type { ReactNode } from "react";

interface SubmissionRemarksProps {
  remarks?: string | null;
  feedback?: string | null;
  grade?: number | null;
}

export function SubmissionRemarks({
  remarks,
  feedback,
  grade,
}: SubmissionRemarksProps) {
  if (!remarks?.trim() && !feedback?.trim() && grade == null) {
    return null;
  }

  const blocks: ReactNode[] = [];

  if (remarks?.trim()) {
    blocks.push(
      <div key="remarks" className="mt-2 rounded-md bg-muted/30 px-2 py-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          Student remarks
        </p>
        <p className="whitespace-pre-wrap text-sm">{remarks}</p>
      </div>,
    );
  }

  if (feedback?.trim() || grade != null) {
    blocks.push(
      <div key="feedback" className="mt-2 rounded-md bg-muted/30 px-2 py-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          Supervisor review
          {grade != null ? ` · Grade: ${grade}` : ""}
        </p>
        {feedback?.trim() ? (
          <p className="whitespace-pre-wrap text-sm">{feedback}</p>
        ) : (
          <p className="text-sm text-muted-foreground">No written feedback.</p>
        )}
      </div>,
    );
  }

  return <>{blocks}</>;
}

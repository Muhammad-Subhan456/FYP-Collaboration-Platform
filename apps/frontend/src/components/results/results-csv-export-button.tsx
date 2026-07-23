"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ResultsCsvExportButtonProps {
  onExport: () => void;
  disabled?: boolean;
}

export function ResultsCsvExportButton({
  onExport,
  disabled,
}: ResultsCsvExportButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={onExport}
    >
      <Download className="mr-2 h-4 w-4" />
      Download CSV
    </Button>
  );
}

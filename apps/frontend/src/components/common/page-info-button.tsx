"use client";

import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { PageGuidance } from "@/constants/page-copy";

interface PageInfoButtonProps {
  title: string;
  guidance: PageGuidance;
}

export function PageInfoButton({ title, guidance }: PageInfoButtonProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={`About ${title}`}
        >
          <Info className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>About {title}</DialogTitle>
          <DialogDescription>{guidance.purpose}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div>
            <p className="mb-2 font-medium text-foreground">What you can do</p>
            <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
              {guidance.actions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </div>

          {guidance.tip ? (
            <p className="rounded-lg border bg-muted/40 px-3 py-2 text-muted-foreground">
              <span className="font-medium text-foreground">Tip: </span>
              {guidance.tip}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

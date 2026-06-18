import { cn } from "@/lib/utils";

interface ScrollableFeedProps {
  children: React.ReactNode;
  className?: string;
}

/** Scrollable container sized to show ~2 feed items at a time */
export function ScrollableFeed({ children, className }: ScrollableFeedProps) {
  return (
    <div
      className={cn(
        "max-h-[11.5rem] space-y-2 overflow-y-auto overscroll-contain pr-1",
        "[&::-webkit-scrollbar]:w-1.5",
        "[&::-webkit-scrollbar-thumb]:rounded-full",
        "[&::-webkit-scrollbar-thumb]:bg-border",
        className,
      )}
    >
      {children}
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";

const URL_PATTERN =
  /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

/** Strip markup without regex catastrophic backtracking; prefer DOM when available. */
function toPlainText(content: string): string {
  if (typeof window !== "undefined" && typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(content, "text/html");
    return doc.body.textContent ?? "";
  }
  return content.replace(/<\/?[a-zA-Z][^>]{0,200}>/g, "");
}

function linkifyText(text: string) {
  const parts = text.split(URL_PATTERN);
  return parts.map((part, index) => {
    if (!part.match(URL_PATTERN)) {
      return part;
    }

    const href = part.startsWith("http") ? part : `https://${part}`;
    return (
      <a
        key={`${part}-${index}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2"
      >
        {part}
      </a>
    );
  });
}

interface RichContentProps {
  content: string;
  className?: string;
}

/**
 * Renders user-generated content safely.
 * HTML is converted to plain text (no dangerouslySetInnerHTML) to prevent stored XSS.
 */
export function RichContent({ content, className }: RichContentProps) {
  const plain = toPlainText(content);

  return (
    <div className={cn("whitespace-pre-wrap text-sm leading-relaxed", className)}>
      {linkifyText(plain)}
    </div>
  );
}

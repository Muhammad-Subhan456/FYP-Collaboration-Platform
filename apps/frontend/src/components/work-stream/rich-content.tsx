"use client";

import { cn } from "@/lib/utils";

const URL_PATTERN =
  /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

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

export function RichContent({ content, className }: RichContentProps) {
  const hasHtml = /<[a-z][\s\S]*>/i.test(content);

  if (hasHtml) {
    return (
      <div
        className={cn(
          "prose prose-sm max-w-none text-foreground dark:prose-invert",
          className,
        )}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return (
    <div className={cn("whitespace-pre-wrap text-sm leading-relaxed", className)}>
      {linkifyText(content)}
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function useDeepLinkFocus(paramName: string) {
  const searchParams = useSearchParams();
  const focusId = searchParams.get(paramName);

  useEffect(() => {
    if (!focusId) {
      return;
    }

    const element = document.getElementById(`focus-${focusId}`);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId]);

  return focusId;
}

export function isDeepLinkFocused(
  focusId: string | null,
  id: string,
): boolean {
  return !!focusId && focusId === id;
}

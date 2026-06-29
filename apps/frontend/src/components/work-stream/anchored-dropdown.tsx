"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

function usePortalContainer(
  triggerRef: RefObject<HTMLElement | null>,
  open: boolean,
) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    const dialog = triggerRef.current?.closest('[role="dialog"]');
    setContainer((dialog as HTMLElement | null) ?? document.body);
  }, [open, triggerRef]);

  return container;
}

export function useAnchoredDropdownStyle(
  triggerRef: RefObject<HTMLElement | null>,
  open: boolean,
  elevated: boolean,
) {
  const [style, setStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      return;
    }

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      setStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: elevated ? 200 : 100,
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [elevated, open, triggerRef]);

  return style;
}

interface AnchoredDropdownPanelProps {
  open: boolean;
  triggerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export function AnchoredDropdownPanel({
  open,
  triggerRef,
  onClose,
  children,
  className,
}: AnchoredDropdownPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const container = usePortalContainer(triggerRef, open);
  const isInDialog = container !== null && container !== document.body;
  const style = useAnchoredDropdownStyle(triggerRef, open, isInDialog);
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !isInDialog) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (triggerRef.current?.contains(target)) {
        return;
      }

      if (panelRef.current?.contains(target)) {
        return;
      }

      onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isInDialog, onClose, open, triggerRef]);

  if (!open || !mounted || !container) {
    return null;
  }

  return createPortal(
    <>
      {!isInDialog && (
        <button
          type="button"
          aria-label="Close dropdown"
          className="fixed inset-0 z-[99] bg-transparent"
          onClick={onClose}
        />
      )}
      <div ref={panelRef} style={style} className={className}>
        {children}
      </div>
    </>,
    container,
  );
}

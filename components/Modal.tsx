"use client";

import { ReactNode } from "react";

type ModalProps = {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  position?: "top" | "center";
  closeVariant?: "text" | "icon";
  closeOnBackdrop?: boolean;
  contentScrollable?: boolean;
  topOffsetClassName?: string;
  panelClassName?: string;
};

export default function Modal({
  isOpen,
  title,
  subtitle,
  onClose,
  children,
  position = "top",
  closeVariant = "text",
  closeOnBackdrop = true,
  contentScrollable = true,
  topOffsetClassName,
  panelClassName,
}: ModalProps) {
  if (!isOpen) return null;

  const positionClass =
    position === "center"
      ? "items-center py-8"
      : `items-start ${topOffsetClassName ?? "pt-20"} pb-6`;
  const panelClass =
    position === "center"
      ? "w-full max-w-md overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-white p-5 text-[var(--color-text)] shadow-[0_20px_40px_rgba(15,61,52,0.08)]"
      : "flex w-full max-w-md max-h-[calc(100dvh-6.5rem)] flex-col overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-white p-5 text-[var(--color-text)] shadow-[0_20px_40px_rgba(15,61,52,0.08)]";
  const contentClass =
    contentScrollable
      ? position === "center"
        ? "max-h-[70vh] overflow-y-auto text-left"
        : "min-h-0 flex-1 overflow-y-auto text-left"
      : "text-left";

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-[rgba(15,30,28,0.48)] px-4 backdrop-blur-[2px] ${positionClass}`}
      onClick={() => {
        if (closeOnBackdrop) onClose();
      }}
    >
      <div
        className={panelClassName ? `${panelClass} ${panelClassName}` : panelClass}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 text-left">
            {subtitle ? (
              <p className="text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
            ) : null}
            <h2 className="text-lg font-semibold tracking-[-0.02em]">{title}</h2>
          </div>
          {closeVariant === "icon" ? (
            <button
              className="ui-icon-btn h-9 w-9 text-base"
              onClick={onClose}
              type="button"
              aria-label="Close"
            >
              ×
            </button>
          ) : (
            <button
              className="ui-btn ui-btn-secondary min-h-0 rounded-full px-3 py-2 text-sm"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          )}
        </div>
        <div className={contentClass}>{children}</div>
      </div>
    </div>
  );
}

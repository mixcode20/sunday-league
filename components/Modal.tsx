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
  panelMaxHeightClassName?: string;
  onPrev?: () => void;
  onNext?: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
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
  panelMaxHeightClassName,
  onPrev,
  onNext,
  prevDisabled = false,
  nextDisabled = false,
}: ModalProps) {
  if (!isOpen) return null;

  const positionClass =
    position === "center"
      ? "items-center py-8"
      : `items-start ${topOffsetClassName ?? "pt-20"} pb-6`;
  const defaultMaxH = position === "top" ? "max-h-[calc(100dvh-6.5rem)]" : "";
  const maxHClass = panelMaxHeightClassName ?? defaultMaxH;
  const panelClass =
    position === "center"
      ? `w-full max-w-md overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-white p-5 text-[var(--color-text)] shadow-[0_20px_40px_rgba(15,61,52,0.08)]${maxHClass ? ` ${maxHClass}` : ""}`
      : `flex w-full max-w-md ${maxHClass} flex-col overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-white p-5 text-[var(--color-text)] shadow-[0_20px_40px_rgba(15,61,52,0.08)]`;
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
        <div
          className={
            onPrev || onNext
              ? "mb-4 grid grid-cols-[1.15fr_auto_0.85fr] items-center gap-4"
              : "mb-4 flex items-center justify-between gap-4"
          }
        >
          <div className="min-w-0 text-left">
            {subtitle ? (
              <p className="text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
            ) : null}
            <h2 className="text-lg font-semibold tracking-[-0.02em]">{title}</h2>
          </div>
          {(onPrev || onNext) && (
            <div className="flex shrink-0 items-center gap-1 justify-self-center">
              <button
                className="ui-icon-btn h-9 w-9 text-base disabled:cursor-not-allowed disabled:opacity-30"
                onClick={onPrev}
                disabled={!onPrev || prevDisabled}
                type="button"
                aria-label="Previous gameweek"
              >
                ‹
              </button>
              <button
                className="ui-icon-btn h-9 w-9 text-base disabled:cursor-not-allowed disabled:opacity-30"
                onClick={onNext}
                disabled={!onNext || nextDisabled}
                type="button"
                aria-label="Next gameweek"
              >
                ›
              </button>
            </div>
          )}
          {closeVariant === "icon" ? (
            <button
              className="ui-icon-btn h-9 w-9 text-base justify-self-end"
              onClick={onClose}
              type="button"
              aria-label="Close"
            >
              ×
            </button>
          ) : (
            <button
              className="ui-btn ui-btn-secondary min-h-0 rounded-full px-3 py-2 text-sm justify-self-end"
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

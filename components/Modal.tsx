"use client";

import { ReactNode } from "react";

type ModalProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  position?: "top" | "center";
  closeVariant?: "text" | "icon";
  closeOnBackdrop?: boolean;
};

export default function Modal({
  isOpen,
  title,
  onClose,
  children,
  position = "top",
  closeVariant = "text",
  closeOnBackdrop = true,
}: ModalProps) {
  if (!isOpen) return null;

  const positionClass =
    position === "center"
      ? "items-center py-8"
      : "items-start pt-20 pb-6";

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-[rgba(15,30,28,0.48)] px-4 backdrop-blur-[2px] ${positionClass}`}
      onClick={() => {
        if (closeOnBackdrop) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-[1.5rem] border border-[var(--color-border)] bg-white p-5 text-[var(--color-text)] shadow-[0_20px_40px_rgba(15,61,52,0.08)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-[-0.02em]">{title}</h2>
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
        <div className="max-h-[70vh] overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  );
}

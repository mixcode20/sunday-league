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
      : "items-start pt-24 pb-6";

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-black/50 px-4 ${positionClass}`}
      onClick={() => {
        if (closeOnBackdrop) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 text-slate-900 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          {closeVariant === "icon" ? (
            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-base text-slate-600"
              onClick={onClose}
              type="button"
              aria-label="Close"
            >
              ×
            </button>
          ) : (
            <button
              className="rounded-full border border-slate-200 px-2 py-1 text-sm"
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

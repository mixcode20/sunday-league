"use client";

type SettingsButtonProps = {
  onClick: () => void;
  label?: string;
};

export default function SettingsButton({ onClick, label }: SettingsButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
      aria-label={label ?? "Open settings"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-4 w-4"
      >
        <path d="M12 3.5l2.1 1.2 2.4-.3 1.2 2.1 2 1.3-.8 2.2.8 2.2-2 1.3-1.2 2.1-2.4-.3-2.1 1.2-2.1-1.2-2.4.3-1.2-2.1-2-1.3.8-2.2-.8-2.2 2-1.3 1.2-2.1 2.4.3L12 3.5z" />
        <circle cx="12" cy="12" r="3.2" />
      </svg>
      {label ? <span>{label}</span> : null}
    </button>
  );
}

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
      className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-200 bg-white p-3 text-slate-700 shadow-sm"
      aria-label={label ?? "Open settings"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <path d="M12 3.75a.75.75 0 01.75.75v.524a7.5 7.5 0 014.44 2.56l.37-.214a.75.75 0 011.023.275l.75 1.299a.75.75 0 01-.275 1.023l-.37.214a7.5 7.5 0 010 5.12l.37.214a.75.75 0 01.275 1.023l-.75 1.299a.75.75 0 01-1.023.275l-.37-.214a7.5 7.5 0 01-4.44 2.56v.524a.75.75 0 01-1.5 0v-.524a7.5 7.5 0 01-4.44-2.56l-.37.214a.75.75 0 01-1.023-.275l-.75-1.299a.75.75 0 01.275-1.023l.37-.214a7.5 7.5 0 010-5.12l-.37-.214a.75.75 0 01-.275-1.023l.75-1.299a.75.75 0 011.023-.275l.37.214a7.5 7.5 0 014.44-2.56V4.5a.75.75 0 01.75-.75z" />
        <circle cx="12" cy="12" r="3.25" />
      </svg>
    </button>
  );
}

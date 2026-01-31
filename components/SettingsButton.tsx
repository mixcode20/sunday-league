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
      <img
        src="/settings-cog.svg"
        alt=""
        className="h-5 w-5"
        aria-hidden="true"
      />
    </button>
  );
}

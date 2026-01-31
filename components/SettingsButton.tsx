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
      className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-transparent p-3 text-slate-700"
      aria-label={label ?? "Open settings"}
    >
      <img
        src="/settings-cog.svg"
        alt=""
        className="h-6.5 w-6.5"
        aria-hidden="true"
      />
    </button>
  );
}

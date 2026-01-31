"use client";

type SettingsButtonProps = {
  onClick: () => void;
  isUnlocked: boolean;
};

export default function SettingsButton({ onClick, isUnlocked }: SettingsButtonProps) {
  const label = isUnlocked ? "Lock organiser mode" : "Unlock organiser mode";
  const iconSrc = isUnlocked ? "/unlock.svg" : "/lock.svg";
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-transparent text-slate-700 hover:bg-slate-100"
      aria-label={label}
      title={label}
    >
      <img
        src={iconSrc}
        alt=""
        className="h-5 w-5"
        aria-hidden="true"
      />
    </button>
  );
}

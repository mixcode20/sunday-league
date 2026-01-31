"use client";

type SettingsButtonProps = {
  onClick: () => void;
  isUnlocked: boolean;
};

export default function SettingsButton({ onClick, isUnlocked }: SettingsButtonProps) {
  const label = isUnlocked ? "Lock organiser mode" : "Unlock organiser mode";
  const iconSrc = isUnlocked ? "/unlock.svg" : "/lock.svg";
  const iconStyle = { maskImage: `url(${iconSrc})`, WebkitMaskImage: `url(${iconSrc})` };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition ${
        isUnlocked
          ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
          : "bg-transparent text-slate-700 hover:bg-slate-100"
      }`}
      aria-label={label}
      title={label}
    >
      <span
        aria-hidden="true"
        className="h-5 w-5 bg-current"
        style={{
          ...iconStyle,
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
          maskSize: "contain",
          WebkitMaskSize: "contain",
        }}
      />
    </button>
  );
}

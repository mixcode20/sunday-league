"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SettingsButton from "@/components/SettingsButton";
import { useOrganiserMode } from "@/components/OrganiserModeProvider";

export default function SiteNav() {
  const pathname = usePathname();
  const { isUnlocked, requestUnlock, lock } = useOrganiserMode();

  const navItems = [
    { href: "/", label: "Game" },
    { href: "/teams", label: "Teams" },
    { href: "/history", label: "Results" },
    { href: "/league", label: "League" },
  ];

  const handleLockClick = () => {
    if (isUnlocked) {
      lock();
    } else {
      requestUnlock();
    }
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" prefetch aria-label="Game">
            <img src="/Symbol.svg" alt="Symbol logo" className="h-7 w-7" />
          </Link>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Sunday Powerleague
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  className={`rounded-full px-3 py-2 ${
                    isActive
                      ? "bg-slate-100 font-semibold text-slate-900"
                      : "text-slate-600"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <SettingsButton onClick={handleLockClick} isUnlocked={isUnlocked} />
        </div>
      </div>
    </header>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SettingsButton from "@/components/SettingsButton";
import { useOrganiserMode } from "@/components/OrganiserModeProvider";

export default function SiteNav() {
  const pathname = usePathname();
  const { isUnlocked, requestUnlock, lock } = useOrganiserMode();

  const primaryNavItems = [
    { href: "/", label: "Game" },
    { href: "/teams", label: "Teams" },
  ];
  const secondaryNavItems = [
    { href: "/history", label: "Results" },
    { href: "/league", label: "League" },
  ];
  const isGameOrTeamsActive =
    pathname === primaryNavItems[0].href || pathname === primaryNavItems[1].href;

  const handleLockClick = () => {
    if (isUnlocked) {
      lock();
    } else {
      requestUnlock();
    }
  };

  return (
    <header className="border-b border-[var(--color-border)] bg-white/96 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" prefetch aria-label="Game">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[rgba(15,61,52,0.08)] bg-white shadow-[0_6px_18px_rgba(15,61,52,0.05)]">
              <Image src="/Symbol.svg" alt="Symbol logo" width={24} height={24} className="h-6 w-6" />
            </span>
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-secondary)]">
            Sunday Powerleague
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <div
              className={`flex items-center gap-1 rounded-full p-1 transition ${
                isGameOrTeamsActive
                  ? "bg-white/60 shadow-[inset_0_0_0_1px_rgba(15,61,52,0.08)]"
                  : "bg-transparent p-0"
              }`}
            >
              {primaryNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch
                    className={`rounded-full px-4 py-2.5 font-medium transition ${
                      isActive
                        ? "bg-[var(--color-primary-dark)] text-white shadow-[0_8px_18px_rgba(15,61,52,0.18)]"
                        : isGameOrTeamsActive
                          ? "bg-transparent text-[var(--color-primary-dark)]"
                          : "text-[var(--color-text-secondary)] hover:bg-white hover:text-[var(--color-primary-dark)]"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
            {secondaryNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  className={`rounded-full px-4 py-2.5 font-medium transition ${
                    isActive
                      ? "bg-[var(--color-primary-dark)] text-white"
                      : "text-[var(--color-text-secondary)] hover:bg-white hover:text-[var(--color-primary-dark)]"
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

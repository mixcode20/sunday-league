"use client";

import { usePathname } from "next/navigation";
import SettingsButton from "@/components/SettingsButton";
import { useOrganiserMode } from "@/components/OrganiserModeProvider";

export default function SiteNav() {
  const pathname = usePathname();
  const { isOrganiser, requestEnable, disable } = useOrganiserMode();

  const navItems = [
    { href: "/", label: "Game" },
    { href: "/teams", label: "Teams" },
    { href: "/history", label: "Results" },
    { href: "/league", label: "League" },
  ];

  const handleCogClick = () => {
    if (isOrganiser) {
      disable();
    } else {
      requestEnable();
    }
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <SettingsButton onClick={handleCogClick} label="Organiser mode" />
          <a href="/" aria-label="Game">
<<<<<<< HEAD
            <img
              src="/Symbol.svg"
              alt="Symbol logo"
              className="h-7 w-7"
            />
=======
            <img src="/Synbol.svg" alt="Synbol logo" className="h-7 w-7" />
>>>>>>> b228c7a (Navbar organiser mode + game slots + teams/league layout)
          </a>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Sunday Powerleague
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-2 ${
                  isActive
                    ? "bg-slate-100 font-semibold text-slate-900"
                    : "text-slate-600"
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

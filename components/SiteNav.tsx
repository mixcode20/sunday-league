export default function SiteNav() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Sunday Powerleague
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <a href="/" className="font-medium text-slate-900">
            Game
          </a>
          <a href="/teams">Teams</a>
          <a href="/history">Results</a>
          <a href="/league">League</a>
        </nav>
      </div>
    </header>
  );
}

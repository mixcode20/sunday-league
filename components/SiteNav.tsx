export default function SiteNav() {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-500">
            WhatsApp Footy
          </p>
          <h1 className="text-lg font-semibold text-slate-900">
            Weekly 7-a-side
          </h1>
        </div>
        <nav className="flex items-center gap-3 text-sm text-slate-600">
          <a href="/" className="font-medium text-slate-900">
            Join
          </a>
          <a href="/teams">Teams</a>
          <a href="/history">History</a>
          <a href="/table">Table</a>
        </nav>
      </div>
    </header>
  );
}

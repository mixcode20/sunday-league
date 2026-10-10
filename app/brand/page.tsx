import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brand Reference",
  robots: { index: false, follow: false },
};

type Swatch = {
  name: string;
  cssVar: string;
  hex: string;
  usage: string;
  textOn: "light" | "dark";
  needsBorder?: boolean;
};

const CORE_PALETTE: Swatch[] = [
  {
    name: "Pitch Green",
    cssVar: "--color-primary",
    hex: "#1F7A63",
    usage:
      "Kickers, sparkline strokes, active-state accents. The brand green when it needs to feel lighter than the dark buttons.",
    textOn: "dark",
  },
  {
    name: "Deep Turf",
    cssVar: "--color-primary-dark",
    hex: "#0F3D34",
    usage:
      "Primary buttons, active chips/segments, the Darks team panel. Default text colour on any tinted green surface.",
    textOn: "dark",
  },
  {
    name: "Touchline Lime",
    cssVar: "--color-accent",
    hex: "#7ED957",
    usage:
      "Defined but not yet drawn on anywhere in the UI — reserved for a future high-energy accent (e.g. a \"live now\" indicator).",
    textOn: "light",
  },
  {
    name: "Chalk Mist",
    cssVar: "--off-white-green",
    hex: "#F5FAF9",
    usage:
      "Filled-slot backgrounds (a picked player's row) and the join-slot picker list. The quietest possible green tint.",
    textOn: "light",
    needsBorder: true,
  },
];

const NEUTRALS: Swatch[] = [
  {
    name: "Match Day White",
    cssVar: "--color-background",
    hex: "#FEFFFF",
    usage: "The page background, one hair off pure white so cards sit on top of it visibly.",
    textOn: "light",
    needsBorder: true,
  },
  {
    name: "Pure White",
    cssVar: "--color-surface",
    hex: "#FFFFFF",
    usage: "Card and input surfaces — .ui-card, .ui-input, modals.",
    textOn: "light",
    needsBorder: true,
  },
  {
    name: "Ink",
    cssVar: "--color-text",
    hex: "#1E1E1E",
    usage: "Primary body copy. Not pure black — slightly softer on white.",
    textOn: "dark",
  },
  {
    name: "Fog",
    cssVar: "--color-text-secondary",
    hex: "#667085",
    usage: "Labels, captions, timestamps, muted stat text — anything that should recede.",
    textOn: "dark",
  },
  {
    name: "Hairline",
    cssVar: "--color-border",
    hex: "#E5E7EB",
    usage: "Every default border in the app, via the global `* { border-color }` rule.",
    textOn: "light",
    needsBorder: true,
  },
  {
    name: "Mint Wash",
    cssVar: "--color-surface-highlight",
    hex: "#EDF5F2",
    usage: "Hover / expanded-row state on the league table and player picker rows.",
    textOn: "light",
    needsBorder: true,
  },
];

const SEMANTIC: Swatch[] = [
  {
    name: "Win Green",
    cssVar: "--color-success",
    hex: "#16A34A",
    usage: "Positive goal difference, win-rate bars, \"W\" form tiles, success banners.",
    textOn: "dark",
  },
  {
    name: "Caution Amber",
    cssVar: "--color-warning",
    hex: "#F59E0B",
    usage: "Warning banners (e.g. \"unlock organiser tools\"), archived-player tags.",
    textOn: "light",
  },
  {
    name: "Loss Red",
    cssVar: "--color-danger",
    hex: "#E5484D",
    usage: "Negative goal difference, \"L\" form tiles, worst-attacker/defender badges, destructive buttons.",
    textOn: "dark",
  },
  {
    name: "Draw Grey",
    cssVar: "--color-draw",
    hex: "#C2C8C4",
    usage: "\"D\" form tiles only — the one result colour with no green or red in it.",
    textOn: "light",
  },
];

const RANK_MEDALS: Swatch[] = [
  {
    name: "Gold Standard",
    cssVar: "--color-rank-gold",
    hex: "#E8B84B",
    usage: "#1 badge — most goals, best per-game average.",
    textOn: "dark",
  },
  {
    name: "Silver Boot",
    cssVar: "--color-rank-silver",
    hex: "#6B7A8D",
    usage: "#2 badge.",
    textOn: "dark",
  },
  {
    name: "Bronze Medal",
    cssVar: "--color-rank-bronze",
    hex: "#CD8B4E",
    usage: "#3 badge.",
    textOn: "dark",
  },
];

function SwatchCard({ swatch }: { swatch: Swatch }) {
  return (
    <div className="ui-card overflow-hidden">
      <div
        className={`flex h-24 items-end p-3 ${swatch.needsBorder ? "border-b border-[var(--color-border)]" : ""}`}
        style={{ background: swatch.hex }}
      >
        <span
          className="font-mono text-xs font-semibold tracking-wide opacity-85"
          style={{ color: swatch.textOn === "dark" ? "#ffffff" : "#1e1e1e" }}
        >
          {swatch.hex}
        </span>
      </div>
      <div className="p-3.5">
        <p className="text-[0.9375rem] font-bold tracking-[-0.01em] text-[var(--color-text)]">
          {swatch.name}
        </p>
        <span className="mt-1.5 inline-block rounded-[8px] bg-[var(--off-white-green)] px-2 py-0.5 font-mono text-[0.7rem] text-[var(--color-text-secondary)]">
          {swatch.cssVar}
        </span>
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--color-text-secondary)]">
          {swatch.usage}
        </p>
      </div>
    </div>
  );
}

function SectionHead({
  kicker,
  title,
  note,
}: {
  kicker: string;
  title: string;
  note: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
      <div>
        <p className="ui-kicker">{kicker}</p>
        <h2 className="mt-0.5 text-[1.375rem] font-bold tracking-[-0.01em] text-[var(--color-text)]">
          {title}
        </h2>
      </div>
      <p className="max-w-[22rem] text-right text-sm text-[var(--color-text-secondary)]">{note}</p>
    </div>
  );
}

export default function BrandReferencePage() {
  return (
    <div className="space-y-12 pb-12">
      <div className="ui-card p-6">
        <p className="ui-kicker">Internal · Not linked in the app nav</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.03em] text-[var(--color-text)] sm:text-4xl">
          Brand Reference
        </h1>
        <p className="mt-2 max-w-2xl text-[1.0625rem] text-[var(--color-text-secondary)]">
          Colour names and swatches for the Sunday Powerleague design system, pulled straight from{" "}
          <code className="rounded-[8px] bg-[var(--off-white-green)] px-1.5 py-0.5 font-mono text-[0.85em]">
            app/globals.css
          </code>
          . Kept off the site nav on purpose — this page exists so you have somewhere to point at
          while reviewing UI, not for players to browse.
        </p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-[var(--color-border)] pt-4 text-[0.8125rem] text-[var(--color-text-secondary)]">
          <span>
            Source: <strong className="font-mono text-[var(--color-text)]">app/globals.css</strong>
          </span>
          <span>
            Tokens: <strong className="text-[var(--color-text)]">17</strong> colour ·{" "}
            <strong className="text-[var(--color-text)]">1</strong> shadow ·{" "}
            <strong className="text-[var(--color-text)]">4</strong> radius
          </span>
          <span>
            Radius scale: <strong className="text-[var(--color-text)]">8px flat</strong>
          </span>
        </div>
      </div>

      <section>
        <SectionHead
          kicker="Core Palette"
          title="Pitch & turf greens"
          note="The two greens that carry every primary action, heading, and the Darks team identity."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CORE_PALETTE.map((swatch) => (
            <SwatchCard key={swatch.cssVar} swatch={swatch} />
          ))}
        </div>
      </section>

      <section>
        <SectionHead
          kicker="Neutrals & Surfaces"
          title="Page, card, and text greys"
          note="One grey scale, deliberately: no slate/zinc mixed in. Everything routes through these six."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {NEUTRALS.map((swatch) => (
            <SwatchCard key={swatch.cssVar} swatch={swatch} />
          ))}
        </div>
      </section>

      <section>
        <SectionHead
          kicker="Semantic"
          title="Result colours"
          note="Win / loss / draw / caution — used identically in the league table and the player drawer."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SEMANTIC.map((swatch) => (
            <SwatchCard key={swatch.cssVar} swatch={swatch} />
          ))}
        </div>
      </section>

      <section>
        <SectionHead
          kicker="Rank Medals"
          title="Leaderboard badges"
          note="Top-3 stat badges in the player drawer — the only place gold/silver/bronze appear."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RANK_MEDALS.map((swatch) => (
            <SwatchCard key={swatch.cssVar} swatch={swatch} />
          ))}
        </div>
      </section>

      <section>
        <SectionHead
          kicker="Shape & Depth"
          title="Radius & shadow"
          note="One flat 8px radius everywhere, plus the one soft card shadow."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="ui-card p-5 text-center">
            <div className="mx-auto mb-3 h-14 w-full rounded-[8px] border-[1.5px] border-[var(--color-primary-dark)] bg-[rgba(15,61,52,0.08)]" />
            <p className="text-sm font-bold text-[var(--color-text)]">8px radius</p>
            <p className="mt-0.5 font-mono text-xs text-[var(--color-text-secondary)]">
              --radius-sm / md / lg / xl
            </p>
          </div>
          <div className="ui-card p-5 text-center">
            <div className="mx-auto mb-3 h-14 w-full rounded-full border-[1.5px] border-[var(--color-primary-dark)] bg-[rgba(15,61,52,0.08)]" />
            <p className="text-sm font-bold text-[var(--color-text)]">Full pill</p>
            <p className="mt-0.5 font-mono text-xs text-[var(--color-text-secondary)]">
              chips, icon buttons, form tiles
            </p>
          </div>
          <div className="ui-card p-5 text-center">
            <div className="mx-auto mb-3 h-14 w-full rounded-[8px] bg-[var(--color-surface)] shadow-[0_10px_24px_rgba(15,61,52,0.16)]" />
            <p className="text-sm font-bold text-[var(--color-text)]">Subtle shadow</p>
            <p className="mt-0.5 font-mono text-xs text-[var(--color-text-secondary)]">--shadow-subtle</p>
          </div>
        </div>
      </section>

      <section>
        <SectionHead
          kicker="Assembled"
          title="Live components"
          note="The actual ui-* classes from app/globals.css, so you can sanity-check a token change before it hits the app."
        />
        <div className="ui-card flex flex-col gap-5 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-full text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
              Buttons
            </span>
            <button type="button" className="ui-btn ui-btn-primary">
              Join gameweek
            </button>
            <button type="button" className="ui-btn ui-btn-secondary">
              Leave
            </button>
            <button type="button" className="ui-btn ui-btn-danger">
              Remove player
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
              Banners
            </span>
            <p className="ui-banner ui-banner-success">You&apos;re in!</p>
            <p className="ui-banner ui-banner-warning">Unlock organiser tools to edit players.</p>
            <p className="ui-banner ui-banner-danger">Failed to load results. Please refresh.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-full text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
              Chips
            </span>
            <span className="ui-chip">All players</span>
            <span className="ui-chip ui-chip-active">Archived</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-full text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
              Input
            </span>
            <input
              className="ui-input max-w-[14rem]"
              type="text"
              placeholder="First name"
              disabled
              readOnly
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-full text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
              Card
            </span>
            <div className="ui-card max-w-[16rem] p-4 text-sm text-[var(--color-text)]">
              <span className="ui-kicker mb-1 block">Admin</span>
              Player management
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--color-border)] pt-5 text-[0.8125rem] text-[var(--color-text-secondary)]">
        Source of truth is always{" "}
        <code className="rounded-[8px] bg-[var(--off-white-green)] px-1.5 py-0.5 font-mono">
          app/globals.css
        </code>
        . If you change a value there, update the hex on this page too — it won&apos;t do it for you.
      </footer>
    </div>
  );
}

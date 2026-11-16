// Compares public.league_player_stats against the JavaScript aggregation in
// lib/leagueOverview.ts, row by row. Run after applying
// 20261116090000_league_player_stats_view.sql and before switching the code.
//
//   set -a; . ./.env.local; set +a; node scripts/verify-league-view.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const deriveWinner = (d, w) => {
  if (typeof d !== "number" || typeof w !== "number") return null;
  if (d === w) return "draw";
  return d > w ? "darks" : "whites";
};

// --- JavaScript path, mirroring lib/leagueOverview.ts ---
const { data: gameweeks, error: gwErr } = await sb
  .from("gameweeks")
  .select("id, darks_score, whites_score, winner, result_mode")
  .eq("status", "locked");
if (gwErr) throw new Error(gwErr.message);

const ids = gameweeks.map((g) => g.id);
const { data: entries, error: enErr } = ids.length
  ? await sb
      .from("gameweek_players")
      .select("gameweek_id, player_id, team")
      .in("gameweek_id", ids)
  : { data: [], error: null };
if (enErr) throw new Error(enErr.message);

const gwById = new Map(gameweeks.map((g) => [g.id, g]));
const resultById = new Map();
for (const g of gameweeks) {
  const r = ["darks", "whites", "draw"].includes(g.winner)
    ? g.winner
    : deriveWinner(g.darks_score, g.whites_score);
  if (r) resultById.set(g.id, r);
}

const js = new Map();
for (const e of entries) {
  if (e.team === "subs") continue;
  const g = gwById.get(e.gameweek_id);
  const r = resultById.get(e.gameweek_id);
  if (!g || !r) continue;
  const row =
    js.get(e.player_id) ??
    { gp: 0, games_with_score: 0, w: 0, d: 0, l: 0, goals_for: 0, goals_against: 0 };
  row.gp += 1;
  const scored = g.darks_score !== null && g.whites_score !== null;
  if (scored) row.games_with_score += 1;
  const gf = !scored ? 0 : e.team === "darks" ? g.darks_score : g.whites_score;
  const ga = !scored ? 0 : e.team === "darks" ? g.whites_score : g.darks_score;
  row.goals_for += gf;
  row.goals_against += ga;
  if (r === "draw") row.d += 1;
  else if (r === e.team) row.w += 1;
  else row.l += 1;
  js.set(e.player_id, row);
}

// --- View path ---
const { data: view, error: vErr } = await sb.from("league_player_stats").select("*");
if (vErr) {
  console.error("Could not read league_player_stats:", vErr.message);
  console.error("Has the migration been applied?");
  process.exit(1);
}

const FIELDS = ["gp", "games_with_score", "w", "d", "l", "goals_for", "goals_against"];
const viewById = new Map(view.map((r) => [r.player_id, r]));
let mismatches = 0;

for (const [playerId, expected] of js) {
  const actual = viewById.get(playerId);
  if (!actual) {
    console.log(`MISSING in view: ${playerId}`, expected);
    mismatches++;
    continue;
  }
  for (const f of FIELDS) {
    if (Number(actual[f]) !== Number(expected[f])) {
      console.log(`MISMATCH ${playerId}.${f}: view=${actual[f]} js=${expected[f]}`);
      mismatches++;
    }
  }
}
for (const r of view) {
  if (!js.has(r.player_id)) {
    console.log(`EXTRA in view: ${r.player_id}`, r);
    mismatches++;
  }
}

console.log(`\nplayers compared: ${js.size} (view returned ${view.length})`);
console.log(mismatches === 0 ? "MATCH - safe to switch over" : `${mismatches} mismatch(es) - do not switch`);
process.exit(mismatches === 0 ? 0 : 1);

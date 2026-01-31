"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOrganiserMode } from "@/components/OrganiserModeProvider";
import type { Gameweek, GameweekPlayer, Team } from "@/lib/types";

type TeamsClientProps = {
  gameweek: Gameweek;
  entries: GameweekPlayer[];
};

const TEAM_LIMITS: Record<Team, number> = {
  darks: 7,
  whites: 7,
  subs: 4,
};

type DragInfo = {
  playerId: string;
  team: Team;
  position: number;
};

export default function TeamsClient({ gameweek, entries }: TeamsClientProps) {
  const router = useRouter();
  const { isOrganiser, organiserPin } = useOrganiserMode();
  const [statusMessage, setStatusMessage] = useState("");
  const [dragged, setDragged] = useState<DragInfo | null>(null);

  const isLocked = gameweek.status === "locked";

  const grouped = useMemo(() => {
    const base: Record<Team, GameweekPlayer[]> = {
      darks: [],
      whites: [],
      subs: [],
    };
    entries.forEach((entry) => {
      base[entry.team].push(entry);
    });
    (Object.keys(base) as Team[]).forEach((team) => {
      base[team] = [...base[team]].sort((a, b) => a.position - b.position);
    });
    return base;
  }, [entries]);

  const playersThisWeek = useMemo(
    () =>
      [...entries].sort((a, b) =>
        `${a.players.first_name} ${a.players.last_name}`.localeCompare(
          `${b.players.first_name} ${b.players.last_name}`
        )
      ),
    [entries]
  );

  const teamsSelected = grouped.darks.length + grouped.whites.length > 0;

  const assignPlayer = async (playerId: string, team: Team, position: number) => {
    if (!organiserPin) return;
    const response = await fetch(`/api/gameweeks/${gameweek.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, team, position, pin: organiserPin }),
    });
    if (!response.ok) {
      const data = await response.json();
      setStatusMessage(data.error ?? "Failed to update player.");
      return;
    }
    router.refresh();
  };

  const handleDrop = async (team: Team, position: number, occupied?: DragInfo) => {
    if (!dragged || !organiserPin) return;
    await assignPlayer(dragged.playerId, team, position);
    if (occupied && (occupied.team !== dragged.team || occupied.position !== dragged.position)) {
      await assignPlayer(occupied.playerId, dragged.team, dragged.position);
    }
    setDragged(null);
  };

  const renderTeamSlots = (
    team: Team,
    title: string,
    accent: string,
    isDark?: boolean
  ) => {
    const slots = Array.from({ length: TEAM_LIMITS[team] }, (_, index) => ({
      entry: grouped[team][index] ?? null,
      position: index,
    }));

    return (
      <div className={`rounded-2xl border border-slate-200 p-4 shadow-sm ${accent}`}>
        <div className="flex items-center justify-between">
          <h3
            className={`text-xs font-semibold uppercase tracking-[0.2em] ${
              isDark ? "text-slate-200" : "text-slate-500"
            }`}
          >
            {title}
          </h3>
          <span className="text-xs text-slate-400">
            {grouped[team].length}/{TEAM_LIMITS[team]}
          </span>
        </div>
        <div className="mt-3 space-y-3">
          {slots.map(({ entry, position }) => {
            const occupiedInfo = entry
              ? { playerId: entry.player_id, team, position: entry.position }
              : undefined;
            return (
              <div
                key={`${team}-${position}`}
                onDragOver={(event) => {
                  if (!isOrganiser || isLocked) return;
                  event.preventDefault();
                }}
                onDrop={() => handleDrop(team, position, occupiedInfo)}
                className="flex min-h-[52px] items-center justify-between rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {entry ? (
                  <div
                    draggable={Boolean(isOrganiser) && !isLocked}
                    onDragStart={() =>
                      setDragged({
                        playerId: entry.player_id,
                        team,
                        position: entry.position,
                      })
                    }
                    className="w-full rounded-lg bg-white px-2 py-2 font-medium text-slate-900"
                  >
                    {entry.players.first_name} {entry.players.last_name}
                  </div>
                ) : isOrganiser && !isLocked ? (
                  <select
                    className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                    defaultValue=""
                    onChange={(event) =>
                      event.target.value
                        ? assignPlayer(event.target.value, team, position)
                        : null
                    }
                  >
                    <option value="">Select player</option>
                    {playersThisWeek.map((player) => (
                      <option key={player.player_id} value={player.player_id}>
                        {player.players.first_name} {player.players.last_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-slate-400">Empty slot</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Gameweek</p>
          <p className="text-base font-semibold text-slate-800">
            {isLocked ? "Locked" : "Open"}
          </p>
        </div>
      </div>

      {statusMessage ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {statusMessage}
        </p>
      ) : null}

      {!teamsSelected ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
          Teams have not yet been selected for this gameweek.
        </p>
      ) : null}

      {isOrganiser && !isLocked ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Organiser controls
          </p>
          <p className="mt-2">
            Fill empty slots from the dropdowns or drag players to swap teams.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        {renderTeamSlots("darks", "Darks", "bg-slate-900 text-white", true)}
        {renderTeamSlots("whites", "Whites", "bg-white border-slate-300")}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Subs
        </h3>
        <div className="mt-3 space-y-3">
          {Array.from({ length: TEAM_LIMITS.subs }, (_, index) => ({
            entry: grouped.subs[index] ?? null,
            position: index,
          })).map(({ entry, position }) => {
            const occupiedInfo = entry
              ? { playerId: entry.player_id, team: "subs" as Team, position: entry.position }
              : undefined;
            return (
              <div
                key={`subs-${position}`}
                onDragOver={(event) => {
                  if (!isOrganiser || isLocked) return;
                  event.preventDefault();
                }}
                onDrop={() => handleDrop("subs", position, occupiedInfo)}
                className="flex min-h-[52px] items-center justify-between rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {entry ? (
                  <div
                    draggable={Boolean(isOrganiser) && !isLocked}
                    onDragStart={() =>
                      setDragged({
                        playerId: entry.player_id,
                        team: "subs",
                        position: entry.position,
                      })
                    }
                    className="w-full rounded-lg bg-white px-2 py-2 font-medium text-slate-900"
                  >
                    {entry.players.first_name} {entry.players.last_name}
                  </div>
                ) : isOrganiser && !isLocked ? (
                  <select
                    className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                    defaultValue=""
                    onChange={(event) =>
                      event.target.value
                        ? assignPlayer(event.target.value, "subs", position)
                        : null
                    }
                  >
                    <option value="">Select player</option>
                    {playersThisWeek.map((player) => (
                      <option key={player.player_id} value={player.player_id}>
                        {player.players.first_name} {player.players.last_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-slate-400">Empty slot</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-400">
          Players in this week
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {playersThisWeek.length > 0 ? (
            playersThisWeek.map((entry) => (
              <div
                key={entry.player_id}
                className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
              >
                {entry.players.first_name} {entry.players.last_name}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-400">
              No players yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

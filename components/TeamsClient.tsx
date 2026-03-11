"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOrganiserMode } from "@/components/OrganiserModeProvider";
import type { Gameweek, GameweekPlayer, Team } from "@/lib/types";
import { formatPlayerName } from "@/lib/utils";

type TeamsClientProps = {
  gameweek: Gameweek;
  entries: GameweekPlayer[];
  onRefresh?: () => void;
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

export default function TeamsClient({ gameweek, entries, onRefresh }: TeamsClientProps) {
  const router = useRouter();
  const { isUnlocked, organiserPin } = useOrganiserMode();
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
      base[team] = [...base[team]].sort((a, b) => {
        const aPos = a.team_position ?? Number.MAX_SAFE_INTEGER;
        const bPos = b.team_position ?? Number.MAX_SAFE_INTEGER;
        if (aPos !== bPos) return aPos - bPos;
        return a.position - b.position;
      });
    });
    return base;
  }, [entries]);

  const playersThisWeek = useMemo(
    () => [...entries].sort((a, b) => a.position - b.position),
    [entries]
  );
  const teamsSelected = grouped.darks.length + grouped.whites.length > 0;

  const formatErrorMessage = (data: unknown, fallback: string) => {
    if (!data) return fallback;
    if (typeof data === "object" && data !== null && "error" in data) {
      const error = data.error;
      if (typeof error === "string") return error;
      if (error && typeof error === "object") {
        const message = "message" in error ? String(error.message ?? fallback) : fallback;
        const details =
          "details" in error && error.details ? ` (${String(error.details)})` : "";
        const code = "code" in error && error.code ? ` [${String(error.code)}]` : "";
        return `${message}${code}${details}`;
      }
    }
    if (typeof data === "object" && data !== null && "message" in data) {
      return String(data.message ?? fallback);
    }
    return fallback;
  };

  const assignPlayer = async (
    playerId: string,
    team: Team,
    position?: number | null,
    allowReassign?: boolean
  ) => {
    if (!organiserPin) return;
    setStatusMessage("");
    const response = await fetch(`/api/gameweeks/${gameweek.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        team,
        position,
        pin: organiserPin,
        allowReassign: Boolean(allowReassign),
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setStatusMessage(formatErrorMessage(data, "Failed to update player."));
      return;
    }
    onRefresh?.();
    router.refresh();
  };

  const clearTeamSlot = async (playerId: string) => {
    if (!organiserPin) return;
    setStatusMessage("");
    const response = await fetch(`/api/gameweeks/${gameweek.id}/slots/clear`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, pin: organiserPin }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setStatusMessage(formatErrorMessage(data, "Failed to clear slot."));
      return;
    }
    onRefresh?.();
    router.refresh();
  };

  const handleDrop = async (team: Team, position: number, occupied?: DragInfo) => {
    if (!dragged || !organiserPin) return;
    await assignPlayer(dragged.playerId, team, position, true);
    if (occupied && (occupied.team !== dragged.team || occupied.position !== dragged.position)) {
      await assignPlayer(occupied.playerId, dragged.team, dragged.position, true);
    }
    setDragged(null);
  };

  const renderTeamSlots = (
    team: Team,
    title: string,
    accent: string,
    isDark?: boolean
  ) => {
    const limit = TEAM_LIMITS[team];
    const slots: Array<{ entry: GameweekPlayer | null; position: number }> = Array.from(
      { length: limit },
      (_, index) => ({ entry: null, position: index + 1 })
    );
    const overflow: GameweekPlayer[] = [];

    grouped[team].forEach((entry) => {
      const slotPosition = entry.team_position;
      if (
        typeof slotPosition === "number" &&
        slotPosition >= 1 &&
        slotPosition <= limit &&
        !slots[slotPosition - 1].entry
      ) {
        slots[slotPosition - 1].entry = entry;
      } else {
        overflow.push(entry);
      }
    });

    let overflowIndex = 0;
    slots.forEach((slot, index) => {
      if (slot.entry || overflowIndex >= overflow.length) return;
      slots[index].entry = overflow[overflowIndex];
      overflowIndex += 1;
    });

    const isEditable = isUnlocked && !isLocked;
    const assignedTeamPlayerIds = new Set(
      entries.filter((entry) => entry.team !== "subs").map((entry) => entry.player_id)
    );

    return (
      <div className={`rounded-[1.35rem] border p-4 ${accent}`}>
        <div className="flex items-center justify-between">
          <h3
            className={`text-xs font-semibold uppercase tracking-[0.18em] ${
              isDark ? "text-white/80" : "text-[var(--color-text-secondary)]"
            }`}
          >
            {title}
          </h3>
          <span className={`text-xs ${isDark ? "text-white/60" : "text-[var(--color-text-secondary)]"}`}>
            {grouped[team].length}/{TEAM_LIMITS[team]}
          </span>
        </div>
        <div className="mt-3 space-y-3">
          {slots.map(({ entry, position }) => {
            const occupiedInfo = entry
              ? {
                  playerId: entry.player_id,
                  team,
                  position: entry.team_position ?? position,
                }
              : undefined;
            return (
              <div
                key={`${team}-${position}`}
                draggable={Boolean(isEditable && entry)}
                onDragStart={() => {
                  if (!entry || !isEditable) return;
                  setDragged({
                    playerId: entry.player_id,
                    team,
                    position: entry.team_position ?? position,
                  });
                }}
                onDragOver={(event) => {
                  if (!isUnlocked || isLocked) return;
                  event.preventDefault();
                }}
                onDrop={() => handleDrop(team, position, occupiedInfo)}
                className={`flex min-h-[52px] items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                  team === "darks"
                    ? "border-white/12 bg-white/8 text-white"
                    : "border-[var(--color-border)] bg-white text-[var(--color-text)]"
                }`}
              >
                {isEditable ? (
                  <select
                    className="ui-input py-2 text-sm"
                    value={entry?.player_id ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (!value) {
                        if (entry) {
                          clearTeamSlot(entry.player_id);
                        }
                        return;
                      }
                      assignPlayer(value, team, position);
                    }}
                  >
                    <option value="">
                      {entry ? "Clear slot" : "Select player"}
                    </option>
                    {playersThisWeek
                      .filter((player) => !player.players.archived || player.player_id === entry?.player_id)
                      .map((player) => {
                      const isCurrent = player.player_id === entry?.player_id;
                      const isTaken = assignedTeamPlayerIds.has(player.player_id);
                      return (
                        <option
                          key={player.player_id}
                          value={player.player_id}
                          disabled={isTaken && !isCurrent}
                        >
                          {formatPlayerName(player.players)}
                        </option>
                      );
                    })}
                  </select>
                ) : entry ? (
                  <div
                    className={`w-full rounded-lg px-2 py-2 font-medium ${
                      team === "darks"
                        ? "text-white"
                        : "text-[var(--color-text)]"
                    }`}
                  >
                    {formatPlayerName(entry.players)}
                  </div>
                ) : (
                  <span className={`text-xs ${team === "darks" ? "text-white/55" : "text-[var(--color-text-secondary)]"}`}>
                    -
                  </span>
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
      {statusMessage ? (
        <p className="ui-banner ui-banner-warning">
          {statusMessage}
        </p>
      ) : null}

      {!teamsSelected ? (
        <p className="ui-banner">
          Teams have not yet been selected for this gameweek.
        </p>
      ) : null}

      {isUnlocked && !isLocked ? (
        <div className="ui-card p-4 text-sm text-[var(--color-text-secondary)]">
          <p className="ui-kicker">
            Organiser controls
          </p>
          <p className="mt-2">
            Fill empty slots from the dropdowns or drag players to swap teams.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        {renderTeamSlots(
          "darks",
          "Darks",
          "border-[rgba(15,61,52,0.16)] bg-[var(--color-primary-dark)] text-white",
          true
        )}
        {renderTeamSlots(
          "whites",
          "Whites",
          "border-[var(--color-border)] bg-[rgba(255,255,255,0.9)]"
        )}
      </div>

      <section className="ui-card p-4">
        <p className="ui-kicker">
          Players in this week
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {playersThisWeek.length > 0 ? (
            playersThisWeek.map((entry) => (
              <div
                key={entry.player_id}
                className="rounded-xl border border-[rgba(229,231,235,0.9)] bg-[rgba(15,61,52,0.03)] px-3 py-2 text-sm"
              >
                {formatPlayerName(entry.players)}
              </div>
            ))
          ) : (
            <div className="ui-empty px-3 py-4 text-sm">
              No players yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

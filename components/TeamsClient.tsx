"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type SlotMeta = {
  team: Team;
  position: number;
};

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.12l3.71-3.89a.75.75 0 1 1 1.08 1.04l-4.25 4.45a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M8.5 3a5.5 5.5 0 1 0 3.47 9.77l3.63 3.63 1.06-1.06-3.63-3.63A5.5 5.5 0 0 0 8.5 3Zm0 1.5a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M16.7 5.29a1 1 0 0 1 .01 1.41l-7.12 7.2a1 1 0 0 1-1.42 0L3.3 9.04a1 1 0 1 1 1.4-1.43l4.18 4.1L15.3 5.3a1 1 0 0 1 1.4-.01Z" />
    </svg>
  );
}

function PlayerAvatar() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(148,163,184,0.22)] text-[rgba(100,116,139,0.9)]">
      <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-current">
        <path d="M10 10a3.25 3.25 0 1 0 0-6.5A3.25 3.25 0 0 0 10 10Zm0 1.5c-3.16 0-5.75 1.82-5.75 4.06 0 .24.2.44.44.44h10.62c.24 0 .44-.2.44-.44 0-2.24-2.59-4.06-5.75-4.06Z" />
      </svg>
    </span>
  );
}

export default function TeamsClient({ gameweek, entries, onRefresh }: TeamsClientProps) {
  const router = useRouter();
  const { isUnlocked, organiserPin } = useOrganiserMode();
  const [statusMessage, setStatusMessage] = useState("");
  const [dragged, setDragged] = useState<DragInfo | null>(null);
  const [openSlotKey, setOpenSlotKey] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingPlayerId, setPendingPlayerId] = useState<string | null>(null);
  const slotMenuRef = useRef<HTMLDivElement | null>(null);

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
  const slotMetaByKey = useMemo(() => {
    const meta = new Map<string, SlotMeta>();
    (Object.keys(TEAM_LIMITS) as Team[]).forEach((team) => {
      if (team === "subs") return;
      for (let position = 1; position <= TEAM_LIMITS[team]; position += 1) {
        meta.set(`${team}-${position}`, { team, position });
      }
    });
    return meta;
  }, []);
  const entryBySlotKey = useMemo(() => {
    const mapped = new Map<string, GameweekPlayer>();
    (["darks", "whites"] as Team[]).forEach((team) => {
      grouped[team].forEach((entry) => {
        const position = entry.team_position;
        if (typeof position === "number" && position >= 1 && position <= TEAM_LIMITS[team]) {
          mapped.set(`${team}-${position}`, entry);
        }
      });
    });
    return mapped;
  }, [grouped]);
  const assignedTeamByPlayerId = useMemo(
    () =>
      new Map(
        entries
          .filter((entry) => entry.team !== "subs")
          .map((entry) => [entry.player_id, entry.team] as const)
      ),
    [entries]
  );
  const teamsSelected = grouped.darks.length + grouped.whites.length > 0;

  useEffect(() => {
    if (!openSlotKey) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (slotMenuRef.current?.contains(event.target as Node)) return;
      if (
        event.target instanceof Element &&
        event.target.closest(`[data-slot-trigger-key="${openSlotKey}"]`)
      ) {
        return;
      }
      setOpenSlotKey(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [openSlotKey]);

  useEffect(() => {
    if (!openSlotKey) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenSlotKey(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [openSlotKey]);

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
            const slotKey = `${team}-${position}`;
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
                  <div className="relative w-full">
                    <button
                      type="button"
                      onClick={() => openSelector(slotKey)}
                      data-slot-trigger-key={slotKey}
                      className="flex w-full items-center justify-between gap-3 bg-transparent px-0 py-2 text-left text-sm text-inherit outline-none"
                    >
                      <span className="min-w-0 truncate">
                        {entry ? formatPlayerName(entry.players) : "-"}
                      </span>
                      {!entry ? (
                        <span
                          className={`shrink-0 ${
                            team === "darks" ? "text-white/65" : "text-[var(--color-text-secondary)]"
                          }`}
                        >
                          <ChevronDownIcon />
                        </span>
                      ) : null}
                    </button>
                  </div>
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

  const openSlotMeta = openSlotKey ? slotMetaByKey.get(openSlotKey) ?? null : null;
  const openSlotEntry = openSlotKey ? entryBySlotKey.get(openSlotKey) ?? null : null;
  const openSlotTitle =
    openSlotMeta?.team === "darks"
      ? "Select Player for Darks"
      : openSlotMeta?.team === "whites"
        ? "Select Player for Whites"
        : "";
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visiblePlayers = useMemo(
    () =>
      playersThisWeek.filter(
        (player) =>
          (!player.players.archived || player.player_id === openSlotEntry?.player_id) &&
          formatPlayerName(player.players).toLowerCase().includes(normalizedSearch)
      ),
    [normalizedSearch, openSlotEntry?.player_id, playersThisWeek]
  );
  const availablePlayers = useMemo(
    () =>
      visiblePlayers.filter((player) => {
        const assignedTeam = assignedTeamByPlayerId.get(player.player_id);
        return !assignedTeam || player.player_id === openSlotEntry?.player_id;
      }),
    [assignedTeamByPlayerId, openSlotEntry?.player_id, visiblePlayers]
  );
  const darksPlayers = useMemo(
    () =>
      visiblePlayers.filter((player) => {
        const assignedTeam = assignedTeamByPlayerId.get(player.player_id);
        return assignedTeam === "darks" && player.player_id !== openSlotEntry?.player_id;
      }),
    [assignedTeamByPlayerId, openSlotEntry?.player_id, visiblePlayers]
  );
  const whitesPlayers = useMemo(
    () =>
      visiblePlayers.filter((player) => {
        const assignedTeam = assignedTeamByPlayerId.get(player.player_id);
        return assignedTeam === "whites" && player.player_id !== openSlotEntry?.player_id;
      }),
    [assignedTeamByPlayerId, openSlotEntry?.player_id, visiblePlayers]
  );

  const closeSelector = () => {
    setOpenSlotKey(null);
    setSearchTerm("");
    setPendingPlayerId(null);
  };

  const openSelector = (slotKey: string) => {
    if (openSlotKey === slotKey) {
      closeSelector();
      return;
    }

    const currentEntry = entryBySlotKey.get(slotKey) ?? null;
    setSearchTerm("");
    setPendingPlayerId(currentEntry?.player_id ?? null);
    setOpenSlotKey(slotKey);
  };

  const handleSelectPlayer = async () => {
    if (!openSlotMeta || !pendingPlayerId) return;
    if (pendingPlayerId === openSlotEntry?.player_id) {
      closeSelector();
      return;
    }
    await assignPlayer(pendingPlayerId, openSlotMeta.team, openSlotMeta.position);
    closeSelector();
  };

  const renderPlayerRow = (
    player: GameweekPlayer,
    options?: { badge?: string; disabled?: boolean; selectable?: boolean }
  ) => {
    const isSelected = pendingPlayerId === player.player_id;
    const selectable = options?.selectable ?? !options?.disabled;

    return (
      <button
        key={player.player_id}
        type="button"
        disabled={!selectable}
        onClick={() => {
          if (!selectable) return;
          setPendingPlayerId(player.player_id);
        }}
        className={`flex w-full items-center gap-3 border-b border-[rgba(226,232,240,0.82)] px-4 py-3 text-left ${
          isSelected ? "bg-[rgba(15,61,52,0.12)]" : "bg-white"
        } ${selectable ? "hover:bg-[rgba(15,61,52,0.05)]" : "cursor-not-allowed opacity-80"}`}
      >
        {isSelected ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-dark)] text-white">
            <CheckIcon />
          </span>
        ) : (
          <PlayerAvatar />
        )}
        <span className="min-w-0 flex-1 truncate text-base text-[var(--color-text)]">
          {formatPlayerName(player.players)}
        </span>
        {options?.badge ? (
          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
              options.badge === "Darks"
                ? "border-[rgba(15,61,52,0.28)] bg-[var(--color-primary-dark)] text-white"
                : "border-[rgba(203,213,225,0.9)] bg-[rgba(248,250,252,0.9)] text-[var(--color-text-secondary)]"
            }`}
          >
            {options.badge}
          </span>
        ) : null}
      </button>
    );
  };

  const renderSection = (
    label: string,
    players: GameweekPlayer[],
    options?: { badge?: string; disabled?: boolean; selectable?: boolean }
  ) => {
    if (players.length === 0) return null;

    return (
      <section>
        <div className="border-y border-[rgba(226,232,240,0.82)] bg-[rgba(248,250,252,0.92)] px-4 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
            {label}
          </p>
        </div>
        <div>{players.map((player) => renderPlayerRow(player, options))}</div>
      </section>
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
            Organiser
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

      {openSlotMeta ? (
        <div className="fixed inset-0 z-40 flex justify-center bg-[rgba(15,30,28,0.34)] px-4 pt-[20vh] backdrop-blur-[2px]">
          <div
            ref={slotMenuRef}
            className="w-full max-w-md overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-white text-[var(--color-text)] shadow-[0_20px_40px_rgba(15,61,52,0.12)]"
          >
            <div className="flex items-center justify-between border-b border-[rgba(226,232,240,0.82)] px-5 py-4">
              <h3 className="text-[1.08rem] font-semibold tracking-[-0.02em] text-[var(--color-text)]">
                {openSlotTitle}
              </h3>
              <button
                className="ui-btn ui-btn-secondary min-h-0 rounded-full px-3 py-2 text-sm"
                onClick={closeSelector}
                type="button"
              >
                Close
              </button>
            </div>
            <div className="border-b border-[rgba(226,232,240,0.82)] px-4 py-3">
              <label className="flex items-center gap-2 rounded-2xl border border-[rgba(226,232,240,0.92)] bg-[rgba(248,250,252,0.9)] px-3 py-2 text-[var(--color-text-secondary)]">
                <SearchIcon />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search players..."
                  className="w-full bg-transparent text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-secondary)]"
                />
              </label>
            </div>
            <div className="max-h-[min(52vh,28rem)] overflow-y-auto">
              {renderSection("Available", availablePlayers, { selectable: true })}
              {renderSection("In Darks", darksPlayers, {
                badge: "Darks",
                disabled: true,
                selectable: false,
              })}
              {renderSection("In Whites", whitesPlayers, {
                badge: "Whites",
                disabled: true,
                selectable: false,
              })}
              {availablePlayers.length === 0 && darksPlayers.length === 0 && whitesPlayers.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-[var(--color-text-secondary)]">
                  No players match your search.
                </div>
              ) : null}
            </div>
            <div className="flex gap-3 border-t border-[rgba(226,232,240,0.82)] px-4 py-4">
              <button
                type="button"
                onClick={closeSelector}
                className="ui-btn ui-btn-secondary min-h-0 flex-1 rounded-xl px-4 py-3 text-sm"
              >
                Cancel
              </button>
              {openSlotEntry ? (
                <button
                  type="button"
                  onClick={async () => {
                    await clearTeamSlot(openSlotEntry.player_id);
                    closeSelector();
                  }}
                  className="ui-btn ui-btn-secondary min-h-0 rounded-xl px-4 py-3 text-sm"
                >
                  Clear Slot
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleSelectPlayer}
                disabled={!pendingPlayerId}
                className="ui-btn min-h-0 flex-1 rounded-xl px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                Select Player
              </button>
            </div>
          </div>
        </div>
      ) : null}

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

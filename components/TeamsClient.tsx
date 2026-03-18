"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useOrganiserMode } from "@/components/OrganiserModeProvider";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import type { Gameweek, GameweekPlayer, Team } from "@/lib/types";
import { formatGameweekDate, formatPlayerName, getGameweekDateTime, hasGameweekStarted } from "@/lib/utils";

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

function PlayerAvatar() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(148,163,184,0.22)] text-[rgba(100,116,139,0.9)]">
      <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-current">
        <path d="M10 10a3.25 3.25 0 1 0 0-6.5A3.25 3.25 0 0 0 10 10Zm0 1.5c-3.16 0-5.75 1.82-5.75 4.06 0 .24.2.44.44.44h10.62c.24 0 .44-.2.44-.44 0-2.24-2.59-4.06-5.75-4.06Z" />
      </svg>
    </span>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M10 4.25a.75.75 0 0 1 .75.75v4.25H15a.75.75 0 0 1 0 1.5h-4.25V15a.75.75 0 0 1-1.5 0v-4.25H5a.75.75 0 0 1 0-1.5h4.25V5a.75.75 0 0 1 .75-.75Z" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M5 9.25a.75.75 0 0 0 0 1.5h10a.75.75 0 0 0 0-1.5H5Z" />
    </svg>
  );
}

export default function TeamsClient({ gameweek, entries, onRefresh }: TeamsClientProps) {
  const router = useRouter();
  const { isUnlocked, organiserPin } = useOrganiserMode();
  const [statusMessage, setStatusMessage] = useState("");
  const [dragged, setDragged] = useState<DragInfo | null>(null);
  const [openSlotKey, setOpenSlotKey] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
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
  const unassignedPlayers = useMemo(
    () =>
      playersThisWeek.filter((player) => !assignedTeamByPlayerId.get(player.player_id)),
    [assignedTeamByPlayerId, playersThisWeek]
  );
  const teamsSelected = grouped.darks.length + grouped.whites.length > 0;
  const teamsComplete =
    grouped.darks.length === TEAM_LIMITS.darks &&
    grouped.whites.length === TEAM_LIMITS.whites;
  const orderedDarks = useMemo(
    () =>
      [...grouped.darks].sort((left, right) => {
        const leftPosition = left.team_position ?? Number.MAX_SAFE_INTEGER;
        const rightPosition = right.team_position ?? Number.MAX_SAFE_INTEGER;
        if (leftPosition !== rightPosition) return leftPosition - rightPosition;
        return left.position - right.position;
      }),
    [grouped.darks]
  );
  const orderedWhites = useMemo(
    () =>
      [...grouped.whites].sort((left, right) => {
        const leftPosition = left.team_position ?? Number.MAX_SAFE_INTEGER;
        const rightPosition = right.team_position ?? Number.MAX_SAFE_INTEGER;
        if (leftPosition !== rightPosition) return leftPosition - rightPosition;
        return left.position - right.position;
      }),
    [grouped.whites]
  );
  const sendTeamsText = useMemo(() => {
    if (!teamsComplete) return "";

    const darksList = orderedDarks.map((entry) => formatPlayerName(entry.players));
    const whitesList = orderedWhites.map((entry) => formatPlayerName(entry.players));

    return [
      `🚨 Teamsheet for this ${formatGameweekDate(gameweek.game_date)}`,
      "",
      "KICKING OFF 9:15",
      "",
      "*Darks:*",
      ...darksList,
      "",
      "*Whites:*",
      ...whitesList,
      "",
      "*Payment here:*",
      gameweek.payment_link?.trim() || "",
      "",
      "Payment needs to be made by Saturday",
      "",
      "Lets get there for 9:10 to start bang on 9:15",
    ].join("\n");
  }, [gameweek.game_date, gameweek.payment_link, orderedDarks, orderedWhites, teamsComplete]);

  const gameweekDateTime = useMemo(
    () => getGameweekDateTime(gameweek.game_date, gameweek.game_time),
    [gameweek.game_date, gameweek.game_time]
  );

  useEffect(() => {
    if (!gameweekDateTime || now >= gameweekDateTime.getTime()) return;
    const timeoutId = window.setTimeout(() => setNow(Date.now()), 1000);
    return () => window.clearTimeout(timeoutId);
  }, [gameweekDateTime, now]);

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

  const shareMessage = async (text: string) => {
    if (!text) return;

    try {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      const popup = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      if (popup) return;
    } catch {
      // Fall back to copying the share text below.
    }

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Ignore failures here; the share button should not surface a warning state.
    }
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
                    : entry
                      ? "ui-slot-filled"
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
  const visiblePlayers = useMemo(
    () =>
      playersThisWeek.filter(
        (player) => !player.players.archived || player.player_id === openSlotEntry?.player_id
      ),
    [openSlotEntry?.player_id, playersThisWeek]
  );
  const availablePlayers = useMemo(
    () =>
      visiblePlayers.filter((player) => {
        const assignedTeam = assignedTeamByPlayerId.get(player.player_id);
        return !assignedTeam;
      }),
    [assignedTeamByPlayerId, visiblePlayers]
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
  };

  const openSelector = (slotKey: string) => {
    if (openSlotKey === slotKey) {
      closeSelector();
      return;
    }

    setOpenSlotKey(slotKey);
  };

  const renderPlayerRow = (
    player: GameweekPlayer,
    options?: { badge?: string; disabled?: boolean; selectable?: boolean }
  ) => {
    const selectable = options?.selectable ?? !options?.disabled;

    return (
      <button
        key={player.player_id}
        type="button"
        disabled={!selectable}
        onClick={async () => {
          if (!selectable) return;
          if (!openSlotMeta) return;
          await assignPlayer(player.player_id, openSlotMeta.team, openSlotMeta.position);
          closeSelector();
        }}
        className={`flex w-full items-center gap-3 border-b border-[rgba(226,232,240,0.82)] px-4 py-3 text-left ${
          selectable
            ? "bg-white hover:bg-[rgba(15,61,52,0.05)]"
            : "cursor-not-allowed bg-[rgba(248,250,252,0.96)] opacity-100"
        }`}
      >
        <span className={selectable ? "" : "opacity-55 grayscale"}>
          <PlayerAvatar />
        </span>
        <span
          className={`min-w-0 flex-1 truncate text-base ${
            selectable ? "text-[var(--color-text)]" : "text-[rgba(100,116,139,0.95)]"
          }`}
        >
          {formatPlayerName(player.players)}
        </span>
        {selectable ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(15,61,52,0.1)] text-[var(--color-primary-dark)]">
            <PlusIcon />
          </span>
        ) : options?.badge ? (
          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
              options.badge === "Darks"
                ? "border-[rgba(203,213,225,0.9)] bg-[rgba(226,232,240,0.75)] text-[rgba(100,116,139,0.95)]"
                : "border-[rgba(203,213,225,0.9)] bg-[rgba(248,250,252,0.9)] text-[rgba(100,116,139,0.95)]"
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

  const currentSlotSection = openSlotEntry ? (
    <section>
      <div className="border-y border-[rgba(226,232,240,0.82)] bg-[rgba(248,250,252,0.92)] px-4 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
          Current Slot
        </p>
      </div>
      <button
        type="button"
        onClick={async () => {
          await clearTeamSlot(openSlotEntry.player_id);
          closeSelector();
        }}
        className="flex w-full items-center gap-3 border-b border-[rgba(226,232,240,0.82)] bg-white px-4 py-3 text-left hover:bg-[rgba(15,61,52,0.05)]"
      >
        <PlayerAvatar />
        <span className="min-w-0 flex-1 truncate text-base text-[var(--color-text)]">
          {formatPlayerName(openSlotEntry.players)}
        </span>
        <span className="flex shrink-0 items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)]">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(148,163,184,0.18)]">
            <MinusIcon />
          </span>
          <span>Remove</span>
        </span>
      </button>
    </section>
  ) : null;

  const orderedSections = openSlotMeta
    ? openSlotMeta.team === "whites"
      ? [
          currentSlotSection,
          renderSection("Available", availablePlayers, { selectable: true }),
          renderSection("In Whites", whitesPlayers, {
            badge: "Whites",
            disabled: true,
            selectable: false,
          }),
          renderSection("In Darks", darksPlayers, {
            badge: "Darks",
            disabled: true,
            selectable: false,
          }),
        ]
      : [
          currentSlotSection,
          renderSection("Available", availablePlayers, { selectable: true }),
          renderSection("In Darks", darksPlayers, {
            badge: "Darks",
            disabled: true,
            selectable: false,
          }),
          renderSection("In Whites", whitesPlayers, {
            badge: "Whites",
            disabled: true,
            selectable: false,
          }),
        ]
    : [];
  const hideSendTeamsButton = hasGameweekStarted(gameweek.game_date, gameweek.game_time, now);

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

      {isUnlocked && !isLocked && teamsComplete && !hideSendTeamsButton ? (
        <button
          type="button"
          onClick={() => void shareMessage(sendTeamsText)}
          className="ui-btn ui-btn-primary inline-flex w-full items-center justify-center gap-2"
        >
          <WhatsAppIcon tone="light" />
          Send teams
        </button>
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
        <div className="fixed inset-0 z-40 flex justify-center bg-[rgba(15,30,28,0.34)] px-4 pt-[10vh] backdrop-blur-[2px]">
          <div
            ref={slotMenuRef}
            className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-white text-[var(--color-text)] shadow-[0_20px_40px_rgba(15,61,52,0.12)]"
          >
            <div
              className={`flex items-center justify-between border-b border-[rgba(226,232,240,0.82)] px-5 py-4 ${
                openSlotMeta.team === "darks"
                  ? "bg-[var(--color-primary-dark)] text-white"
                  : "bg-white text-[var(--color-text)]"
              }`}
            >
              <h3 className="text-[1.08rem] font-semibold tracking-[-0.02em]">
                {openSlotTitle}
              </h3>
              <button
                className={`ui-btn ui-btn-secondary min-h-0 rounded-full px-3 py-2 text-sm ${
                  openSlotMeta.team === "darks"
                    ? "border-white/25 bg-white/10 text-white hover:bg-white/16"
                    : ""
                }`}
                onClick={closeSelector}
                type="button"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {orderedSections}
              {availablePlayers.length === 0 && darksPlayers.length === 0 && whitesPlayers.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-[var(--color-text-secondary)]">
                  No players available.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <section className="ui-card p-4">
        <p className="ui-kicker">
          Unassigned players
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {unassignedPlayers.length > 0 ? (
            unassignedPlayers.map((entry) => (
              <div
                key={entry.player_id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(229,231,235,0.9)] bg-[rgba(15,61,52,0.03)] px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">
                  {formatPlayerName(entry.players)}
                </span>
                <span className="shrink-0 min-w-[76px] text-center text-sm text-[var(--color-text-secondary)]">
                  {entry.team === "subs" ? "Sub" : "-"}
                </span>
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

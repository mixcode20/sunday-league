"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GameweekPlayer, Player } from "@/lib/types";
import Modal from "@/components/Modal";
import { useOrganiserMode } from "@/components/OrganiserModeProvider";

type JoinSlotsProps = {
  isOpen: boolean;
  gameweekId?: string;
  players: Player[];
  entries: GameweekPlayer[];
};

const MAIN_CAPACITY = 14;
const SUB_CAPACITY = 4;
const UNDO_WINDOW_MS = 5 * 60 * 1000;

export default function JoinSlots({
  isOpen,
  gameweekId,
  players,
  entries,
}: JoinSlotsProps) {
  const router = useRouter();
  const { isUnlocked } = useOrganiserMode();
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [liveEntries, setLiveEntries] = useState<GameweekPlayer[]>(entries);
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);
  const [pendingPositions, setPendingPositions] = useState<Record<number, boolean>>({});
  const [optimisticByPosition, setOptimisticByPosition] = useState<
    Record<number, GameweekPlayer>
  >({});
  const [slotErrors, setSlotErrors] = useState<Record<number, string>>({});
  const [highlightedPosition, setHighlightedPosition] = useState<number | null>(null);
  const [sessionJoins, setSessionJoins] = useState<
    Record<string, { position: number; joinedAt: number }>
  >({});
  const [now, setNow] = useState(() => Date.now());
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const debugJoinFlow =
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_DEBUG_JOIN_FLOW === "true";

  useEffect(() => {
    setLiveEntries(entries);
  }, [entries]);

  useEffect(() => {
    if (!gameweekId || typeof window === "undefined") return;
    try {
      const stored = sessionStorage.getItem(`joinSession:${gameweekId}`);
      if (!stored) {
        setSessionJoins({});
        return;
      }
      const parsed = JSON.parse(stored) as Record<
        string,
        { position: number; joinedAt: number }
      >;
      setSessionJoins(parsed ?? {});
    } catch {
      setSessionJoins({});
    }
  }, [gameweekId]);

  useEffect(() => {
    if (Object.keys(sessionJoins).length === 0) return;
    const interval = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, [sessionJoins]);

  useEffect(() => {
    if (highlightedPosition === null) return;
    const timeout = window.setTimeout(() => setHighlightedPosition(null), 8000);
    return () => window.clearTimeout(timeout);
  }, [highlightedPosition]);

  useEffect(() => {
    if (!gameweekId) return;
    const interval = setInterval(async () => {
      const response = await fetch(`/api/gameweeks/${gameweekId}/entries`);
      if (!response.ok) return;
      const data = await response.json();
      if (Array.isArray(data.entries)) {
        setLiveEntries(data.entries);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [gameweekId]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (openSlot === null) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (
        target.closest("[data-slot-trigger]") ||
        target.closest("[data-slot-dropdown]")
      ) {
        return;
      }
      setOpenSlot(null);
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [openSlot]);

  const persistSessionJoins = (
    next: Record<string, { position: number; joinedAt: number }>
  ) => {
    setSessionJoins(next);
    if (typeof window !== "undefined" && gameweekId) {
      sessionStorage.setItem(`joinSession:${gameweekId}`, JSON.stringify(next));
    }
  };

  const recordSessionJoin = (playerId: string, position: number) => {
    setSessionJoins((prev) => {
      const next = {
        ...prev,
        [playerId]: { position, joinedAt: Date.now() },
      };
      if (typeof window !== "undefined" && gameweekId) {
        sessionStorage.setItem(`joinSession:${gameweekId}`, JSON.stringify(next));
      }
      return next;
    });
  };

  const clearSessionJoin = (playerId: string) => {
    setSessionJoins((prev) => {
      if (!prev[playerId]) return prev;
      const next = { ...prev };
      delete next[playerId];
      if (typeof window !== "undefined" && gameweekId) {
        sessionStorage.setItem(`joinSession:${gameweekId}`, JSON.stringify(next));
      }
      return next;
    });
  };

  useEffect(() => {
    if (!gameweekId) return;
    const liveIds = new Set(liveEntries.map((entry) => entry.player_id));
    let changed = false;
    const next: Record<string, { position: number; joinedAt: number }> = {};
    Object.entries(sessionJoins).forEach(([playerId, info]) => {
      if (liveIds.has(playerId)) {
        next[playerId] = info;
      } else {
        changed = true;
      }
    });
    if (changed) {
      persistSessionJoins(next);
    }
  }, [gameweekId, liveEntries, sessionJoins]);

  useEffect(() => {
    if (Object.keys(optimisticByPosition).length === 0) return;
    const livePositions = new Set(liveEntries.map((entry) => entry.position));
    setOptimisticByPosition((prev) => {
      let changed = false;
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        const position = Number(key);
        if (livePositions.has(position)) {
          delete next[position];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [liveEntries, optimisticByPosition]);

  useEffect(() => {
    if (Object.keys(slotErrors).length === 0) return;
    const livePositions = new Set(liveEntries.map((entry) => entry.position));
    setSlotErrors((prev) => {
      let changed = false;
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        const position = Number(key);
        if (livePositions.has(position) && next[position]) {
          delete next[position];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [liveEntries, slotErrors]);

  const orderedEntries = useMemo(() => {
    const merged = [...liveEntries].reduce<Record<number, GameweekPlayer>>(
      (acc, entry) => {
        acc[entry.position] = entry;
        return acc;
      },
      {}
    );

    Object.values(optimisticByPosition).forEach((entry) => {
      if (!merged[entry.position]) {
        merged[entry.position] = entry;
      }
    });

    return Object.values(merged).sort((a, b) => a.position - b.position);
  }, [liveEntries, optimisticByPosition]);


  const slotEntries = useMemo(() => {
    const entryMap = orderedEntries.reduce<Record<number, GameweekPlayer>>(
      (acc, entry) => {
        acc[entry.position] = entry;
        return acc;
      },
      {}
    );
    const mainSlots = Array.from(
      { length: MAIN_CAPACITY },
      (_, index) => entryMap[index + 1] ?? null
    );
    const subsSlots = Array.from(
      { length: SUB_CAPACITY },
      (_, index) => entryMap[15 + index] ?? null
    );
    return { mainSlots, subsSlots };
  }, [orderedEntries]);
  const isSlotPending = (position: number) => Boolean(pendingPositions[position]);

  const refreshEntries = async () => {
    if (!gameweekId) return;
    const response = await fetch(`/api/gameweeks/${gameweekId}/entries`);
    if (!response.ok) return;
    const data = await response.json();
    if (Array.isArray(data.entries)) {
      setLiveEntries(data.entries);
    }
  };

  const joinPlayer = async (playerId: string, position?: number) => {
    if (!gameweekId || typeof position !== "number") {
      return { ok: false, error: "Missing position." };
    }
    if (pendingPositions[position]) {
      return { ok: false, error: "Slot already pending." };
    }

    setMessage("");
    setSlotErrors((prev) => ({ ...prev, [position]: "" }));
    setHighlightedPosition(null);

    setPendingPositions((prev) => ({ ...prev, [position]: true }));
    const player = players.find((item) => item.id === playerId);
    if (player) {
      setOptimisticByPosition((prev) => ({
        ...prev,
        [position]: {
          id: `optimistic-${playerId}-${position}`,
          gameweek_id: gameweekId,
          player_id: playerId,
          team: "subs",
          position,
          remove_requested: false,
          players: player,
        },
      }));
    }

    if (debugJoinFlow) {
      console.info("[join-flow] client claim request", {
        gameweekId,
        playerId,
        position,
      });
    }

    try {
      const response = await fetch(`/api/gameweeks/${gameweekId}/slots/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: playerId, position }),
      });
      const data = await response.json();
      if (!response.ok) {
        const apiMessage =
          typeof data?.message === "string"
            ? data.message
            : typeof data?.error === "string"
              ? data.error
              : "Could not join.";
        const details = typeof data?.details === "string" ? data.details : "";
        const hint = typeof data?.hint === "string" ? data.hint : "";
        const errorMessage =
          data?.code === "player_already_signed_up" &&
          typeof data?.existing_position === "number"
            ? `You are already in slot ${data.existing_position}.`
            : [apiMessage, details, hint].filter(Boolean).join(" ");
        setSlotErrors((prev) => ({ ...prev, [position]: errorMessage }));
        if (
          data?.code === "player_already_signed_up" &&
          typeof data?.existing_position === "number"
        ) {
          setHighlightedPosition(data.existing_position);
        }
        setOptimisticByPosition((prev) => {
          const next = { ...prev };
          delete next[position];
          return next;
        });
        if (debugJoinFlow) {
          console.info("[join-flow] client claim error", {
            gameweekId,
            playerId,
            position,
            data,
          });
        }
        if (Array.isArray(data?.entries)) {
          setLiveEntries(data.entries);
        } else {
          await refreshEntries();
        }
        return { ok: false, error: errorMessage, existingPosition: data?.existing_position };
      }

      if (debugJoinFlow) {
        console.info("[join-flow] client claim success", {
          gameweekId,
          playerId,
          position,
        });
      }
      recordSessionJoin(playerId, position);
      if (Array.isArray(data?.entries)) {
        setLiveEntries(data.entries);
      } else {
        await refreshEntries();
      }
      router.refresh();
      return { ok: true };
    } catch {
      const errorMessage = "Could not join.";
      setSlotErrors((prev) => ({ ...prev, [position]: errorMessage }));
      setOptimisticByPosition((prev) => {
        const next = { ...prev };
        delete next[position];
        return next;
      });
      await refreshEntries();
      return { ok: false, error: errorMessage };
    } finally {
      setPendingPositions((prev) => {
        const next = { ...prev };
        delete next[position];
        return next;
      });
    }
  };

  const leavePlayer = async (playerId: string) => {
    if (!gameweekId) return;
    setMessage("");
    setLiveEntries((prev) => prev.filter((entry) => entry.player_id !== playerId));
    clearSessionJoin(playerId);
    const response = await fetch(`/api/gameweeks/${gameweekId}/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Could not remove.");
      router.refresh();
      await refreshEntries();
      return;
    }
    await refreshEntries();
    router.refresh();
  };

  const requestRemoval = async (playerId: string) => {
    if (!gameweekId) return;
    setMessage("");
    setLiveEntries((prev) =>
      prev.map((entry) =>
        entry.player_id === playerId
          ? { ...entry, remove_requested: true }
          : entry
      )
    );
    const response = await fetch(
      `/api/gameweeks/${gameweekId}/request-remove`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      }
    );
    if (!response.ok) {
      setMessage("Could not request removal.");
      router.refresh();
      await refreshEntries();
      return;
    }
    await refreshEntries();
  };

  const createPlayer = async () => {
    setMessage("");
    const response = await fetch("/api/players/public-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: newFirst, lastName: newLast }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Could not create player.");
      return;
    }
    setCreating(false);
    setNewFirst("");
    setNewLast("");
    if (data.player?.id && typeof pendingSlot === "number") {
      await joinPlayer(data.player.id, pendingSlot);
    } else {
      router.refresh();
    }
  };

  const availablePlayers = players.filter(
    (player) => !orderedEntries.some((entry) => entry.player_id === player.id)
  );

  const openDropdown = (slotIndex: number) => {
    if (!isOpen || isSlotPending(slotIndex)) return;
    setOpenSlot(slotIndex);
  };

  const selectPlayer = async (playerId: string) => {
    if (openSlot === null || isSlotPending(openSlot)) return;
    const targetSlot = openSlot;
    setOpenSlot(null);
    const result = await joinPlayer(playerId, targetSlot);
    if (result.ok) {
      setOpenSlot(null);
    } else {
      setOpenSlot(targetSlot);
    }
  };

  const handleAddNew = () => {
    if (openSlot === null || isSlotPending(openSlot)) return;
    setPendingSlot(openSlot);
    setOpenSlot(null);
    setCreating(true);
  };

  const getSessionState = (entry: GameweekPlayer) => {
    const sessionInfo = sessionJoins[entry.player_id];
    if (!sessionInfo || sessionInfo.position !== entry.position) {
      return { isOwner: false, withinUndo: false };
    }
    return {
      isOwner: true,
      withinUndo: now - sessionInfo.joinedAt <= UNDO_WINDOW_MS,
    };
  };

  return (
    <div className="space-y-4">
      {players.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
          No players yet. Use “+ New player” to add the first name.
        </div>
      ) : null}

      {message ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {message}
        </p>
      ) : null}

      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3">
          {slotEntries.mainSlots.map((entry, index) => {
            const slotPosition = index + 1;
            const sessionState = entry ? getSessionState(entry) : null;
            const canUndo = Boolean(
              sessionState?.isOwner && sessionState?.withinUndo && !entry?.remove_requested
            );
            const canRequestRemoval = Boolean(
              sessionState?.isOwner && !sessionState?.withinUndo && !entry?.remove_requested
            );
            const isHighlighted = highlightedPosition === slotPosition;
            const slotError = slotErrors[slotPosition];
            const isPending = isSlotPending(slotPosition);
            const isOptimistic = Boolean(
              entry && typeof entry.id === "string" && entry.id.startsWith("optimistic-")
            );
            return (
              <div
                key={`main-${index}`}
                className={`relative flex min-h-[56px] flex-col rounded-xl border p-3 text-xs shadow-sm ${
                  entry?.remove_requested
                    ? "border-rose-200 bg-rose-50 text-rose-600"
                    : entry
                      ? "border-emerald-200 bg-emerald-50 text-slate-700"
                      : "border-slate-200 bg-white text-slate-600"
                } ${entry ? "justify-between" : "justify-center"} ${
                  isHighlighted ? "ring-2 ring-amber-400" : ""
                } ${isPending ? "opacity-80" : ""}`}
              >
                {entry ? (
                  <>
                    <span
                      className={`text-sm font-semibold ${
                        entry.remove_requested ? "text-rose-600" : "text-slate-900"
                      }`}
                    >
                      <span className="mr-2 text-xs text-slate-400">
                        {index + 1}.
                      </span>
                      {entry.players.first_name} {entry.players.last_name}
                    </span>
                    {isPending && isOptimistic ? (
                      <span className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Claiming...
                      </span>
                    ) : null}
                    {entry.remove_requested ? (
                      <span className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-rose-500">
                        Removal requested
                      </span>
                    ) : null}
                    {isOpen ? (
                      isUnlocked ? (
                        <button
                          type="button"
                          onClick={() => leavePlayer(entry.player_id)}
                          className="mt-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 text-rose-500"
                          aria-label="Remove player"
                          disabled={isSlotPending(entry.position)}
                        >
                          ×
                        </button>
                      ) : canUndo ? (
                        <button
                          type="button"
                          onClick={() => leavePlayer(entry.player_id)}
                          className="mt-2 text-left text-xs font-semibold text-slate-600"
                          disabled={isSlotPending(entry.position)}
                        >
                          Undo
                        </button>
                      ) : canRequestRemoval ? (
                        <button
                          type="button"
                          onClick={() => requestRemoval(entry.player_id)}
                          className="mt-2 text-left text-xs font-semibold text-rose-500"
                          disabled={isSlotPending(entry.position)}
                        >
                          Remove me
                        </button>
                      ) : null
                    ) : null}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => openDropdown(index + 1)}
                    className="flex w-full items-center justify-between gap-3 text-left text-slate-400"
                    data-slot-trigger
                    aria-label="Add player"
                    disabled={isSlotPending(index + 1)}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {index + 1}.
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="3.5" />
                      </svg>
                      Free space
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="M12 5v14" />
                      <path d="M5 12h14" />
                    </svg>
                  </button>
                )}

                {openSlot === index + 1 ? (
                  <div
                    className="absolute left-0 right-0 top-full z-10 mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
                    data-slot-dropdown
                    ref={dropdownRef}
                  >
                    <div className="flex items-center justify-between px-3 py-1 text-[10px] uppercase tracking-wide text-slate-400">
                      <span>Add player</span>
                      <button
                        type="button"
                        onClick={() => setOpenSlot(null)}
                        className="text-slate-400 hover:text-slate-600"
                        aria-label="Close"
                        disabled={isSlotPending(index + 1)}
                      >
                        ×
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddNew}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                      disabled={isSlotPending(index + 1)}
                    >
                      + Add new player
                    </button>
                    <div className="max-h-52 overflow-y-auto">
                      {availablePlayers.length > 0 ? (
                        availablePlayers.map((player) => (
                          <button
                            key={player.id}
                            type="button"
                            onClick={() => selectPlayer(player.id)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            disabled={isSlotPending(index + 1)}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4 text-slate-400"
                            >
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="3.5" />
                            </svg>
                            {player.first_name} {player.last_name}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-xs text-slate-400">
                          No available players
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {slotError ? (
                  <p className="mt-2 text-[11px] font-semibold text-amber-600">
                    {slotError}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Subs</p>
          <div className="mt-2 grid grid-cols-1 gap-3">
            {slotEntries.subsSlots.map((entry, index) => {
              const slotPosition = MAIN_CAPACITY + index + 1;
              const sessionState = entry ? getSessionState(entry) : null;
              const canUndo = Boolean(
                sessionState?.isOwner && sessionState?.withinUndo && !entry?.remove_requested
              );
              const canRequestRemoval = Boolean(
                sessionState?.isOwner && !sessionState?.withinUndo && !entry?.remove_requested
              );
              const isHighlighted = highlightedPosition === slotPosition;
              const slotError = slotErrors[slotPosition];
              const isPending = isSlotPending(slotPosition);
              const isOptimistic = Boolean(
                entry && typeof entry.id === "string" && entry.id.startsWith("optimistic-")
              );
              return (
                <div
                  key={`sub-${index}`}
                  className={`relative flex min-h-[56px] flex-col rounded-xl border border-dashed p-3 text-xs shadow-sm ${
                    entry?.remove_requested
                      ? "border-rose-200 bg-rose-50 text-rose-600"
                      : entry
                        ? "border-emerald-200 bg-emerald-50 text-slate-700"
                        : "border-slate-200 bg-white text-slate-600"
                  } ${entry ? "justify-between" : "justify-center"} ${
                    isHighlighted ? "ring-2 ring-amber-400" : ""
                  } ${isPending ? "opacity-80" : ""}`}
                >
                  {entry ? (
                    <>
                      <span
                        className={`text-sm font-semibold ${
                          entry.remove_requested ? "text-rose-600" : "text-slate-900"
                        }`}
                      >
                        <span className="mr-2 text-xs text-slate-400">
                          {slotPosition}.
                        </span>
                        {entry.players.first_name} {entry.players.last_name}
                      </span>
                      {isPending && isOptimistic ? (
                        <span className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Claiming...
                        </span>
                      ) : null}
                      {entry.remove_requested ? (
                        <span className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-rose-500">
                          Removal requested
                        </span>
                      ) : null}
                      {isOpen ? (
                        isUnlocked ? (
                          <button
                            type="button"
                            onClick={() => leavePlayer(entry.player_id)}
                            className="mt-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 text-rose-500"
                            aria-label="Remove player"
                            disabled={isSlotPending(entry.position)}
                          >
                            ×
                          </button>
                        ) : canUndo ? (
                          <button
                            type="button"
                            onClick={() => leavePlayer(entry.player_id)}
                            className="mt-2 text-left text-xs font-semibold text-slate-600"
                            disabled={isSlotPending(entry.position)}
                          >
                            Undo
                          </button>
                        ) : canRequestRemoval ? (
                          <button
                            type="button"
                            onClick={() => requestRemoval(entry.player_id)}
                            className="mt-2 text-left text-xs font-semibold text-rose-500"
                            disabled={isSlotPending(entry.position)}
                          >
                            Remove me
                          </button>
                        ) : null
                      ) : null}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openDropdown(slotPosition)}
                      className="flex w-full items-center justify-between gap-3 text-left text-slate-400"
                      data-slot-trigger
                      aria-label="Add player"
                      disabled={isSlotPending(slotPosition)}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="text-xs text-slate-400">
                          {slotPosition}.
                        </span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="3.5" />
                        </svg>
                        Free space
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M12 5v14" />
                        <path d="M5 12h14" />
                      </svg>
                    </button>
                  )}

                  {openSlot === slotPosition ? (
                    <div
                      className="absolute left-0 right-0 top-full z-10 mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
                      data-slot-dropdown
                    >
                      <div className="flex items-center justify-between px-3 py-1 text-[10px] uppercase tracking-wide text-slate-400">
                        <span>Add player</span>
                        <button
                          type="button"
                        onClick={() => setOpenSlot(null)}
                        className="text-slate-400 hover:text-slate-600"
                        aria-label="Close"
                        disabled={isSlotPending(slotPosition)}
                      >
                        ×
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddNew}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                      disabled={isSlotPending(slotPosition)}
                    >
                      + Add new player
                    </button>
                      <div className="max-h-52 overflow-y-auto">
                        {availablePlayers.length > 0 ? (
                          availablePlayers.map((player) => (
                            <button
                            key={player.id}
                            type="button"
                            onClick={() => selectPlayer(player.id)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            disabled={isSlotPending(slotPosition)}
                          >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-4 w-4 text-slate-400"
                              >
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="3.5" />
                              </svg>
                              {player.first_name} {player.last_name}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs text-slate-400">
                            No available players
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {slotError ? (
                    <p className="mt-2 text-[11px] font-semibold text-amber-600">
                      {slotError}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Modal isOpen={creating} title="Add new player" onClose={() => setCreating(false)}>
        <label className="text-sm font-medium text-slate-600">First name</label>
        <input
          type="text"
          value={newFirst}
          onChange={(event) => setNewFirst(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-base"
        />
        <label className="mt-3 text-sm font-medium text-slate-600">Last name</label>
        <input
          type="text"
          value={newLast}
          onChange={(event) => setNewLast(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-base"
        />
        <button
          type="button"
          onClick={createPlayer}
          className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Save player
        </button>
      </Modal>
    </div>
  );
}

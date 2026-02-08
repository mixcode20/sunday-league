"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { GameweekPlayer, Player } from "@/lib/types";
import Modal from "@/components/Modal";
import { useOrganiserMode } from "@/components/OrganiserModeProvider";
import { buildEntryPositionMap, getSubSlotPositions, MAIN_SLOT_CAPACITY } from "@/lib/slots";
import { debugPerfEnabled } from "@/lib/swr";

type JoinSlotsProps = {
  isOpen: boolean;
  gameweekId?: string;
  players: Player[];
  entries: GameweekPlayer[];
};

const MAIN_CAPACITY = MAIN_SLOT_CAPACITY;
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
  const [subMovePrompt, setSubMovePrompt] = useState<{
    mainEntry: GameweekPlayer;
    suggestedSub: GameweekPlayer;
  } | null>(null);
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
    }, 10000);

    return () => clearInterval(interval);
  }, [gameweekId]);

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

  const { positionMap: basePositionMap, diagnostics } = useMemo(
    () => buildEntryPositionMap(liveEntries),
    [liveEntries]
  );

  useEffect(() => {
    if (!debugPerfEnabled) return;
    if (diagnostics.invalidEntries.length === 0 && diagnostics.duplicatePositions.length === 0) {
      return;
    }
    console.warn("[join-slots] slot data issues", {
      gameweekId,
      invalidPositions: diagnostics.invalidEntries.map((entry) => ({
        id: entry.id,
        player_id: entry.player_id,
        position: entry.position,
      })),
      duplicatePositions: diagnostics.duplicatePositions,
    });
  }, [diagnostics, gameweekId]);

  const mergedPositionMap = useMemo(() => {
    const next: Record<number, GameweekPlayer> = { ...basePositionMap };
    Object.values(optimisticByPosition).forEach((entry) => {
      if (!next[entry.position]) {
        next[entry.position] = entry;
      }
    });
    return next;
  }, [basePositionMap, optimisticByPosition]);

  const slotEntries = useMemo(() => {
    const mainSlots = Array.from(
      { length: MAIN_CAPACITY },
      (_, index) => mergedPositionMap[index + 1] ?? null
    );
    const subPositions = getSubSlotPositions(mergedPositionMap);
    const subsSlots = subPositions.map((position) => mergedPositionMap[position] ?? null);
    return { mainSlots, subsSlots, subPositions };
  }, [mergedPositionMap]);
  const isSlotPending = (position: number) => Boolean(pendingPositions[position]);

  const getNextAvailableMainSlot = (assumeEmptyPosition?: number) => {
    for (let position = 1; position <= MAIN_CAPACITY; position += 1) {
      if (position === assumeEmptyPosition) {
        return position;
      }
      if (!mergedPositionMap[position]) {
        return position;
      }
    }
    return null;
  };

  const resolveJoinTargetSlot = (requestedPosition: number) => {
    if (requestedPosition > MAIN_CAPACITY) {
      const nextMain = getNextAvailableMainSlot();
      if (typeof nextMain === "number") {
        return { position: nextMain, movedToMain: true };
      }
    }
    return { position: requestedPosition, movedToMain: false };
  };

  const getEarliestSubEntry = () => {
    for (let index = 0; index < slotEntries.subsSlots.length; index += 1) {
      const entry = slotEntries.subsSlots[index];
      if (entry) {
        return entry;
      }
    }
    return null;
  };

  const openSlotTitle = useMemo(() => {
    if (openSlot === null) return "";
    if (openSlot <= MAIN_CAPACITY) {
      return `Player #${openSlot}`;
    }
    const subIndex = slotEntries.subPositions.indexOf(openSlot);
    const subNumber = subIndex >= 0 ? subIndex + 1 : openSlot - MAIN_CAPACITY;
    return `Sub #${subNumber}`;
  }, [openSlot, slotEntries.subPositions]);

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
    if (!gameweekId) return false;
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
      return false;
    }
    await refreshEntries();
    router.refresh();
    return true;
  };

  const movePlayerToPosition = async (playerId: string, position: number) => {
    if (!gameweekId) return false;
    setMessage("");
    setPendingPositions((prev) => ({ ...prev, [position]: true }));
    setLiveEntries((prev) =>
      prev.map((entry) =>
        entry.player_id === playerId ? { ...entry, position } : entry
      )
    );
    setSessionJoins((prev) => {
      const existing = prev[playerId];
      if (!existing) return prev;
      const next = { ...prev, [playerId]: { ...existing, position } };
      if (typeof window !== "undefined" && gameweekId) {
        sessionStorage.setItem(`joinSession:${gameweekId}`, JSON.stringify(next));
      }
      return next;
    });
    try {
      const response = await fetch(`/api/gameweeks/${gameweekId}/slots/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, position }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Could not move player.");
        await refreshEntries();
        return false;
      }
      await refreshEntries();
      router.refresh();
      return true;
    } catch {
      setMessage("Could not move player.");
      await refreshEntries();
      return false;
    } finally {
      setPendingPositions((prev) => {
        const next = { ...prev };
        delete next[position];
        return next;
      });
    }
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

  const filledPlayerIds = useMemo(() => {
    const ids = new Set(liveEntries.map((entry) => entry.player_id));
    Object.values(optimisticByPosition).forEach((entry) => ids.add(entry.player_id));
    return ids;
  }, [liveEntries, optimisticByPosition]);
  const availablePlayers = players.filter((player) => !filledPlayerIds.has(player.id));

  const openDropdown = (slotIndex: number) => {
    if (!isOpen || isSlotPending(slotIndex)) return;
    setOpenSlot(slotIndex);
  };

  const selectPlayer = async (playerId: string) => {
    if (openSlot === null || isSlotPending(openSlot)) return;
    const { position: targetSlot, movedToMain } = resolveJoinTargetSlot(openSlot);
    if (movedToMain) {
      setMessage(`Moved into Player #${targetSlot} (main slots fill first)`);
    }
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
    const { position: targetSlot, movedToMain } = resolveJoinTargetSlot(openSlot);
    if (movedToMain) {
      setMessage(`Moved into Player #${targetSlot} (main slots fill first)`);
    }
    setPendingSlot(targetSlot);
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

  const handleOrganiserRemove = (entry: GameweekPlayer) => {
    if (entry.position <= MAIN_CAPACITY) {
      const suggested = getEarliestSubEntry();
      if (suggested) {
        setSubMovePrompt({
          mainEntry: entry,
          suggestedSub: suggested,
        });
        return;
      }
    }
    void leavePlayer(entry.player_id);
  };

  const handleMovePromptYes = async () => {
    if (!subMovePrompt) return;
    const { mainEntry, suggestedSub } = subMovePrompt;
    const targetPosition = getNextAvailableMainSlot(mainEntry.position);
    setSubMovePrompt(null);
    if (!targetPosition) {
      await refreshEntries();
      return;
    }
    const removed = await leavePlayer(mainEntry.player_id);
    if (!removed) return;
    const moved = await movePlayerToPosition(suggestedSub.player_id, targetPosition);
    if (moved) {
      setMessage(
        `Moved ${suggestedSub.players.first_name} ${suggestedSub.players.last_name} into Player #${targetPosition}.`
      );
    }
  };

  const handleMovePromptNo = async () => {
    if (!subMovePrompt) return;
    const { mainEntry } = subMovePrompt;
    setSubMovePrompt(null);
    await leavePlayer(mainEntry.player_id);
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
                          onClick={() => handleOrganiserRemove(entry)}
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
              const slotPosition = slotEntries.subPositions[index];
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
                  key={`sub-${slotPosition}`}
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
                          onClick={() =>
                            entry.position <= MAIN_CAPACITY
                              ? handleOrganiserRemove(entry)
                              : leavePlayer(entry.player_id)
                          }
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

      <Modal
        isOpen={openSlot !== null}
        title={openSlotTitle}
        onClose={() => setOpenSlot(null)}
        position="center"
        closeVariant="icon"
      >
        <button
          type="button"
          onClick={handleAddNew}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          disabled={openSlot === null ? true : isSlotPending(openSlot)}
        >
          + Add new player
        </button>
        <div className="mt-2 max-h-64 overflow-y-auto">
          {availablePlayers.length > 0 ? (
            availablePlayers.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => selectPlayer(player.id)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                disabled={openSlot === null ? true : isSlotPending(openSlot)}
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
      </Modal>

      <Modal
        isOpen={Boolean(subMovePrompt)}
        title="Move sub up?"
        onClose={() => setSubMovePrompt(null)}
        position="center"
        closeVariant="icon"
      >
        {subMovePrompt ? (
          <>
            <p className="text-sm text-slate-600">
              Fill the empty spot with Sub:{" "}
              <span className="font-semibold text-slate-900">
                {subMovePrompt.suggestedSub.players.first_name}{" "}
                {subMovePrompt.suggestedSub.players.last_name}
              </span>
              ?
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleMovePromptYes}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Yes, move up
              </button>
              <button
                type="button"
                onClick={handleMovePromptNo}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                No
              </button>
            </div>
          </>
        ) : null}
      </Modal>

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

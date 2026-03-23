"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { GameweekPlayer, Player } from "@/lib/types";
import Modal from "@/components/Modal";
import { useOrganiserMode } from "@/components/OrganiserModeProvider";
import { buildEntryPositionMap, getSubSlotPositions, MAIN_SLOT_CAPACITY } from "@/lib/slots";
import { debugPerfEnabled } from "@/lib/swr";
import {
  getSelfRemovalJoinedAt,
  getSelfRemovalCookieMaxAgeSeconds,
  getSelfRemovalCookieName,
  getSelfRemovalStorageKey,
  grantSelfRemovalAccess,
  hasSelfRemovalAccess,
  mergeSelfRemovalAccess,
  parseSelfRemovalCookie,
  revokeSelfRemovalAccess,
  serializeSelfRemovalCookie,
  type SelfRemovalGrantMap,
} from "@/lib/selfRemovalCookie";
import { formatPlayerName } from "@/lib/utils";

type JoinSlotsProps = {
  isOpen: boolean;
  gameweekId?: string;
  gameDate?: string | null;
  players: Player[];
  entries: GameweekPlayer[];
};

const MAIN_CAPACITY = MAIN_SLOT_CAPACITY;
const UNDO_WINDOW_MS = 5 * 60 * 1000;

export default function JoinSlots({
  isOpen,
  gameweekId,
  gameDate,
  players,
  entries,
}: JoinSlotsProps) {
  const router = useRouter();
  const { isUnlocked, organiserPin } = useOrganiserMode();
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [liveEntries, setLiveEntries] = useState<GameweekPlayer[]>(entries);
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);
  const [pendingPositions, setPendingPositions] = useState<Record<number, boolean>>({});
  const [optimisticByPosition, setOptimisticByPosition] = useState<
    Record<number, GameweekPlayer>
  >({});
  const [slotErrors, setSlotErrors] = useState<Record<number, string>>({});
  const [highlightedPosition, setHighlightedPosition] = useState<number | null>(null);
  const [selfRemovalAccess, setSelfRemovalAccess] = useState<SelfRemovalGrantMap>({});
  const [now, setNow] = useState(() => Date.now());
  const [subMovePrompt, setSubMovePrompt] = useState<{
    mainEntry: GameweekPlayer;
    suggestedSub: GameweekPlayer;
  } | null>(null);
  const debugJoinFlow =
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_DEBUG_JOIN_FLOW === "true";
  const formatLastSeenWeeksAgo = useCallback((dateString?: string | null) => {
    if (!dateString) return "-";
    const parseDateOnly = (value: string) => {
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return null;
      return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    };

    const lastPlayed = parseDateOnly(dateString);
    if (!lastPlayed) return "-";

    const referenceDate = gameDate ? parseDateOnly(gameDate) : null;
    const today = new Date();
    const fallbackCurrentDate = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    );
    const currentDate = referenceDate ?? fallbackCurrentDate;
    const getWeekStart = (date: Date) => {
      const weekStart = new Date(date);
      const daysSinceMonday = (weekStart.getUTCDay() + 6) % 7;
      weekStart.setUTCDate(weekStart.getUTCDate() - daysSinceMonday);
      return weekStart;
    };

    const lastWeekStart = getWeekStart(lastPlayed);
    const currentWeekStart = getWeekStart(currentDate);
    const diffWeeks = Math.max(
      0,
      Math.floor((currentWeekStart.getTime() - lastWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
    );

    if (currentDate.getTime() >= lastPlayed.getTime() && diffWeeks <= 1) {
      return "Played last game";
    }

    return `Played ${diffWeeks} weeks ago`;
  }, [gameDate]);

  const getLastSeenSortBucket = useCallback((dateString?: string | null) => {
    if (!dateString) return Number.MAX_SAFE_INTEGER;
    const label = formatLastSeenWeeksAgo(dateString);
    if (label === "-") return Number.MAX_SAFE_INTEGER;
    if (label === "Played last game") return 1;
    const match = label.match(/^Played (\d+) weeks ago$/);
    return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
  }, [formatLastSeenWeeksAgo]);

  useEffect(() => {
    setLiveEntries(entries);
  }, [entries]);

  useEffect(() => {
    if (openSlot === null) {
      setPlayerSearch("");
    }
  }, [openSlot]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const syncSelfRemovalAccess = () => {
      const rawCookie = document.cookie
        .split("; ")
        .find((part) => part.startsWith(`${getSelfRemovalCookieName()}=`))
        ?.slice(getSelfRemovalCookieName().length + 1);
      const cookieAccess = parseSelfRemovalCookie(rawCookie);
      const storedAccess = parseSelfRemovalCookie(
        window.localStorage.getItem(getSelfRemovalStorageKey())
      );
      const mergedAccess = mergeSelfRemovalAccess(cookieAccess, storedAccess);

      setSelfRemovalAccess(mergedAccess);

      const serializedAccess = serializeSelfRemovalCookie(mergedAccess);
      document.cookie = `${getSelfRemovalCookieName()}=${serializedAccess}; max-age=${getSelfRemovalCookieMaxAgeSeconds()}; path=/; samesite=lax`;
      window.localStorage.setItem(getSelfRemovalStorageKey(), serializedAccess);
    };

    syncSelfRemovalAccess();
    window.addEventListener("focus", syncSelfRemovalAccess);
    window.addEventListener("storage", syncSelfRemovalAccess);

    return () => {
      window.removeEventListener("focus", syncSelfRemovalAccess);
      window.removeEventListener("storage", syncSelfRemovalAccess);
    };
  }, [gameweekId]);

  useEffect(() => {
    if (Object.keys(selfRemovalAccess).length === 0) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [selfRemovalAccess]);

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

  const persistSelfRemovalAccess = useCallback((next: SelfRemovalGrantMap) => {
    setSelfRemovalAccess(next);
    if (typeof document !== "undefined") {
      const serialized = serializeSelfRemovalCookie(next);
      document.cookie = `${getSelfRemovalCookieName()}=${serialized}; max-age=${getSelfRemovalCookieMaxAgeSeconds()}; path=/; samesite=lax`;
      window.localStorage.setItem(getSelfRemovalStorageKey(), serialized);
    }
  }, []);

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
      persistSelfRemovalAccess(
        grantSelfRemovalAccess(selfRemovalAccess, gameweekId, playerId)
      );
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
    const nextSelfRemovalAccess = revokeSelfRemovalAccess(
      selfRemovalAccess,
      gameweekId,
      playerId
    );
    persistSelfRemovalAccess(nextSelfRemovalAccess);
    await refreshEntries();
    router.refresh();
    return true;
  };

  const removeFromGame = async (playerId: string) => {
    if (!gameweekId) return false;
    if (!organiserPin) {
      setMessage("Organiser PIN required.");
      return false;
    }
    setMessage("");
    setLiveEntries((prev) => prev.filter((entry) => entry.player_id !== playerId));
    const nextSelfRemovalAccess = revokeSelfRemovalAccess(
      selfRemovalAccess,
      gameweekId,
      playerId
    );
    persistSelfRemovalAccess(nextSelfRemovalAccess);
    const response = await fetch(`/api/gameweeks/${gameweekId}/kick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, pin: organiserPin }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Could not remove.");
      persistSelfRemovalAccess(selfRemovalAccess);
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

  const cancelRemovalRequest = async (playerId: string) => {
    if (!gameweekId) return;
    setMessage("");
    setLiveEntries((prev) =>
      prev.map((entry) =>
        entry.player_id === playerId
          ? { ...entry, remove_requested: false }
          : entry
      )
    );
    const response = await fetch(
      `/api/gameweeks/${gameweekId}/request-remove`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, cancel: true }),
      }
    );
    if (!response.ok) {
      setMessage("Could not cancel removal request.");
      router.refresh();
      await refreshEntries();
      return;
    }
    await refreshEntries();
  };

  const clearRemovalRequest = async (playerId: string) => {
    if (!gameweekId) return;
    if (!organiserPin) {
      setMessage("Organiser PIN required.");
      return;
    }
    setMessage("");
    setLiveEntries((prev) =>
      prev.map((entry) =>
        entry.player_id === playerId
          ? { ...entry, remove_requested: false }
          : entry
      )
    );
    const response = await fetch(
      `/api/gameweeks/${gameweekId}/clear-remove`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, pin: organiserPin }),
      }
    );
    if (!response.ok) {
      setMessage("Could not clear removal request.");
      router.refresh();
      await refreshEntries();
      return;
    }
    await refreshEntries();
  };

  const handleCancelRemoval = async (playerId: string) => {
    if (isUnlocked) {
      await clearRemovalRequest(playerId);
      return;
    }
    await cancelRemovalRequest(playerId);
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
  const availablePlayers = useMemo(
    () =>
      players
        .filter((player) => !filledPlayerIds.has(player.id))
        .sort((a, b) => {
          const lastSeenComparison =
            getLastSeenSortBucket(a.last_game_date) - getLastSeenSortBucket(b.last_game_date);
          if (lastSeenComparison !== 0) {
            return lastSeenComparison;
          }

          const firstNameComparison = a.first_name.localeCompare(b.first_name);
          if (firstNameComparison !== 0) {
            return firstNameComparison;
          }

          return formatPlayerName(a).localeCompare(formatPlayerName(b));
        }),
    [filledPlayerIds, getLastSeenSortBucket, players]
  );
  const filteredAvailablePlayers = useMemo(
    () =>
      availablePlayers.filter((player) =>
        formatPlayerName(player).toLowerCase().includes(playerSearch.trim().toLowerCase())
      ),
    [availablePlayers, playerSearch]
  );

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
    const isCookieOwner = gameweekId
      ? hasSelfRemovalAccess(selfRemovalAccess, gameweekId, entry.player_id)
      : false;
    if (!gameweekId || !isCookieOwner) {
      return { isOwner: false, withinUndo: false, isCookieOwner };
    }
    const joinedAt = getSelfRemovalJoinedAt(selfRemovalAccess, gameweekId, entry.player_id);
    if (typeof joinedAt !== "number") {
      return { isOwner: true, withinUndo: false, isCookieOwner };
    }
    return {
      isOwner: true,
      withinUndo: now - joinedAt <= UNDO_WINDOW_MS,
      isCookieOwner,
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
    void removeFromGame(entry.player_id);
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
    const removed = await removeFromGame(mainEntry.player_id);
    if (!removed) return;
    const moved = await movePlayerToPosition(suggestedSub.player_id, targetPosition);
    if (moved) {
      setMessage(
        `Moved ${formatPlayerName(suggestedSub.players)} into Player #${targetPosition}.`
      );
    }
  };

  const handleMovePromptNo = async () => {
    if (!subMovePrompt) return;
    const { mainEntry } = subMovePrompt;
    setSubMovePrompt(null);
    await removeFromGame(mainEntry.player_id);
  };

  const userIcon = (className: string) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="3.5" />
    </svg>
  );

  const plusIcon = (className: string) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );

  const checkIcon = (className: string) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m7 12.5 3.1 3.1L17 8.8" />
    </svg>
  );

  const searchIcon = (className: string) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );

  return (
    <div className="space-y-4">
      {players.length === 0 ? (
        <div className="ui-empty p-4 text-sm">
          No players yet. Use “+ New player” to add the first name.
        </div>
      ) : null}

      {message ? (
        <p className="ui-banner ui-banner-warning">
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
              sessionState?.isCookieOwner && !canUndo && !entry?.remove_requested
            );
            const canCancelRemoval = Boolean(
              entry?.remove_requested && (isUnlocked || sessionState?.isCookieOwner)
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
                className={`relative flex min-h-[60px] flex-col rounded-[14px] border px-4 py-2 text-xs ${
                  entry?.remove_requested
                    ? "border-[rgba(229,72,77,0.18)] bg-[rgba(229,72,77,0.08)] text-[var(--color-danger)]"
                    : entry
                      ? "ui-slot-filled"
                      : "border-[var(--color-border)] bg-white text-[var(--color-text-secondary)]"
                } justify-center ${
                  isHighlighted ? "ring-2 ring-amber-400" : ""
                } ${isPending ? "opacity-80" : ""}`}
              >
                {entry ? (
                  <>
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 text-right text-base font-medium leading-none text-[var(--color-text-secondary)]">
                        {index + 1}.
                      </span>
                      <span
                        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          entry.remove_requested
                            ? "bg-[rgba(229,72,77,0.1)] text-[var(--color-danger)]"
                            : "bg-[rgba(31,122,99,0.12)] text-[var(--color-primary-dark)]"
                        }`}
                      >
                        {userIcon("h-4 w-4")}
                      </span>
                      <span className="flex min-w-0 flex-1 items-center">
                        <span
                          className={`min-w-0 truncate text-[14px] font-medium leading-none ${
                            entry.remove_requested ? "text-[var(--color-danger)]" : "text-[var(--color-text)]"
                          }`}
                        >
                          {formatPlayerName(entry.players)}
                        </span>
                      </span>
                      {entry.remove_requested ? (
                        <span className="ml-auto shrink-0 rounded-full border border-[rgba(229,72,77,0.18)] bg-[rgba(229,72,77,0.08)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-danger)]">
                          {isUnlocked ? "Remove me" : "Removal requested"}
                        </span>
                      ) : null}
                      {isOpen && isUnlocked ? (
                          <button
                            type="button"
                            onClick={() => handleOrganiserRemove(entry)}
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-danger)] bg-[var(--color-danger)] text-sm font-semibold leading-none text-white shadow-[0_6px_16px_rgba(229,72,77,0.22)]"
                            aria-label="Remove from game"
                            disabled={isSlotPending(entry.position)}
                          >
                          ×
                        </button>
                      ) : isOpen && canCancelRemoval ? (
                        <button
                          type="button"
                          onClick={() => handleCancelRemoval(entry.player_id)}
                          className="shrink-0 text-xs font-semibold text-[var(--color-text-secondary)]"
                          disabled={isSlotPending(entry.position)}
                        >
                          Cancel
                        </button>
                      ) : isOpen && canUndo ? (
                        <button
                          type="button"
                          onClick={() => leavePlayer(entry.player_id)}
                          className="shrink-0 text-xs font-semibold text-[var(--color-text-secondary)]"
                          disabled={isSlotPending(entry.position)}
                        >
                          Undo
                        </button>
                      ) : isOpen && canRequestRemoval ? (
                        <button
                          type="button"
                          onClick={() => requestRemoval(entry.player_id)}
                          className="shrink-0 text-xs font-semibold text-[var(--color-danger)]"
                          disabled={isSlotPending(entry.position)}
                        >
                          Remove me
                        </button>
                      ) : null}
                      {!entry.remove_requested ? (
                        <span
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white"
                          aria-hidden="true"
                        >
                          {checkIcon("h-[13px] w-[13px]")}
                        </span>
                      ) : null}
                    </div>
                    {isPending && isOptimistic ? (
                      <span className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                        Claiming...
                      </span>
                    ) : null}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => openDropdown(index + 1)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                    data-slot-trigger
                    aria-label="Add player"
                    disabled={isSlotPending(index + 1)}
                  >
                    <span className="inline-flex min-w-0 items-center gap-3">
                      <span className="w-7 text-right text-base font-medium leading-none text-[var(--color-text-secondary)]">
                        {index + 1}.
                      </span>
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(15,61,52,0.08)] text-[var(--color-text-secondary)]">
                        {userIcon("h-4 w-4")}
                      </span>
                      <span className="truncate text-[14px] font-medium leading-none text-[var(--color-text-secondary)]">
                        Free space
                      </span>
                    </span>
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[rgba(15,61,52,0.04)] text-[var(--color-text-secondary)]">
                      {plusIcon("h-[13px] w-[13px]")}
                    </span>
                  </button>
                )}

                {slotError ? (
                  <p className="mt-2 text-[11px] font-semibold text-[var(--color-warning)]">
                    {slotError}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        <div>
          <p className="ui-kicker">Subs</p>
          <div className="mt-2 grid grid-cols-1 gap-3">
            {slotEntries.subsSlots.map((entry, index) => {
              const slotPosition = slotEntries.subPositions[index];
              const sessionState = entry ? getSessionState(entry) : null;
              const canUndo = Boolean(
                sessionState?.isOwner && sessionState?.withinUndo && !entry?.remove_requested
              );
              const canRequestRemoval = Boolean(
                sessionState?.isCookieOwner && !canUndo && !entry?.remove_requested
              );
              const canCancelRemoval = Boolean(
                entry?.remove_requested && (isUnlocked || sessionState?.isCookieOwner)
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
                  className={`relative flex min-h-[60px] flex-col rounded-[14px] border px-4 py-2 text-xs ${
                    entry?.remove_requested
                      ? "border-[rgba(229,72,77,0.18)] bg-[rgba(229,72,77,0.08)] text-[var(--color-danger)]"
                      : entry
                        ? "ui-slot-filled"
                        : "border-[var(--color-border)] bg-white text-[var(--color-text-secondary)]"
                  } justify-center ${
                    isHighlighted ? "ring-2 ring-amber-400" : ""
                  } ${isPending ? "opacity-80" : ""}`}
                >
                  {entry ? (
                    <>
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 text-right text-base font-medium leading-none text-[var(--color-text-secondary)]">
                          {slotPosition}.
                        </span>
                        <span
                          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                            entry.remove_requested
                              ? "bg-[rgba(229,72,77,0.1)] text-[var(--color-danger)]"
                              : "bg-[rgba(31,122,99,0.12)] text-[var(--color-primary-dark)]"
                          }`}
                        >
                          {userIcon("h-4 w-4")}
                        </span>
                        <span className="flex min-w-0 flex-1 items-center">
                          <span
                            className={`min-w-0 truncate text-[14px] font-medium leading-none ${
                              entry.remove_requested ? "text-[var(--color-danger)]" : "text-[var(--color-text)]"
                            }`}
                          >
                            {formatPlayerName(entry.players)}
                          </span>
                        </span>
                        {entry.remove_requested ? (
                          <span className="ml-auto shrink-0 rounded-full border border-[rgba(229,72,77,0.18)] bg-[rgba(229,72,77,0.08)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-danger)]">
                            {isUnlocked ? "Remove me" : "Removal requested"}
                          </span>
                        ) : null}
                        {isOpen && isUnlocked ? (
                          <button
                            type="button"
                            onClick={() =>
                              entry.position <= MAIN_CAPACITY
                                ? handleOrganiserRemove(entry)
                                : removeFromGame(entry.player_id)
                            }
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-danger)] bg-[var(--color-danger)] text-sm font-semibold leading-none text-white shadow-[0_6px_16px_rgba(229,72,77,0.22)]"
                            aria-label="Remove from game"
                            disabled={isSlotPending(entry.position)}
                          >
                            ×
                          </button>
                        ) : isOpen && canCancelRemoval ? (
                          <button
                            type="button"
                            onClick={() => handleCancelRemoval(entry.player_id)}
                            className="shrink-0 text-xs font-semibold text-[var(--color-text-secondary)]"
                            disabled={isSlotPending(entry.position)}
                          >
                            Cancel
                          </button>
                        ) : isOpen && canUndo ? (
                        <button
                          type="button"
                          onClick={() => leavePlayer(entry.player_id)}
                          className="shrink-0 text-xs font-semibold text-[var(--color-text-secondary)]"
                          disabled={isSlotPending(entry.position)}
                        >
                          Undo
                        </button>
                        ) : isOpen && canRequestRemoval ? (
                          <button
                            type="button"
                            onClick={() => requestRemoval(entry.player_id)}
                            className="shrink-0 text-xs font-semibold text-[var(--color-danger)]"
                            disabled={isSlotPending(entry.position)}
                          >
                            Remove me
                          </button>
                        ) : null}
                        {!entry.remove_requested ? (
                          <span
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white"
                            aria-hidden="true"
                          >
                            {checkIcon("h-[13px] w-[13px]")}
                          </span>
                        ) : null}
                      </div>
                      {isPending && isOptimistic ? (
                        <span className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                          Claiming...
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openDropdown(slotPosition)}
                      className="flex w-full items-center justify-between gap-3 text-left"
                      data-slot-trigger
                      aria-label="Add player"
                      disabled={isSlotPending(slotPosition)}
                    >
                      <span className="inline-flex min-w-0 items-center gap-3">
                        <span className="w-7 text-right text-base font-medium leading-none text-[var(--color-text-secondary)]">
                          {slotPosition}.
                        </span>
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(15,61,52,0.08)] text-[var(--color-text-secondary)]">
                          {userIcon("h-4 w-4")}
                        </span>
                        <span className="truncate text-[14px] font-medium leading-none text-[var(--color-text-secondary)]">
                          Free space
                        </span>
                      </span>
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[rgba(15,61,52,0.04)] text-[var(--color-text-secondary)]">
                        {plusIcon("h-[13px] w-[13px]")}
                      </span>
                    </button>
                  )}

                  {slotError ? (
                    <p className="mt-2 text-[11px] font-semibold text-[var(--color-warning)]">
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
        position="top"
      >
        <div className="flex h-full min-h-0 flex-col border-t border-[var(--color-border)] pt-4">
          <label className="sr-only" htmlFor="player-search">
            Search players
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-primary)]">
              {searchIcon("h-[18px] w-[18px]")}
            </span>
            <input
              id="player-search"
              type="search"
              value={playerSearch}
              onChange={(event) => setPlayerSearch(event.target.value)}
              className="ui-input pl-11 text-sm"
              placeholder="Search players..."
            />
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pb-24">
            {filteredAvailablePlayers.length > 0 ? (
              filteredAvailablePlayers.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => selectPlayer(player.id)}
                  className="mb-2 flex w-full items-center gap-3 rounded-[16px] border border-[#d8dbe0] bg-[#eff1f3] px-4 py-3 text-left text-sm text-[var(--color-text)] transition hover:border-[#c6cbd2] hover:bg-[#e7eaee]"
                  disabled={openSlot === null ? true : isSlotPending(openSlot)}
                >
                  <span className="min-w-0 flex flex-1 items-center gap-3">
                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[var(--color-text)]">
                      {formatPlayerName(player)}
                    </span>
                    <span className="ml-auto inline-flex shrink-0 flex-col items-start text-left text-[11px] font-medium text-[var(--color-text-secondary)]">
                      <span className="font-normal text-[var(--color-text)]">
                        {formatLastSeenWeeksAgo(player.last_game_date)}
                      </span>
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center justify-center text-[var(--color-text-secondary)]">
                    {plusIcon("h-[14px] w-[14px]")}
                  </span>
                </button>
              ))
            ) : availablePlayers.length > 0 ? (
              <div className="px-1 py-2 text-xs text-[var(--color-text-secondary)]">
                No players match your search
              </div>
            ) : (
              <div className="px-1 py-2 text-xs text-[var(--color-text-secondary)]">
                No available players
              </div>
            )}
          </div>

          <div className="sticky bottom-0 mt-4 shrink-0 border-t border-[var(--color-border)] bg-white/95 pt-4 backdrop-blur">
            <button
              type="button"
              onClick={handleAddNew}
              className="flex w-full items-center justify-center gap-2 rounded-[16px] border border-[rgba(15,61,52,0.1)] bg-[var(--color-primary-dark)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,61,52,0.18)]"
              disabled={openSlot === null ? true : isSlotPending(openSlot)}
            >
              {plusIcon("h-[14px] w-[14px]")}
              Add new player
            </button>
          </div>
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
            <p className="text-sm text-[var(--color-text-secondary)]">
              Fill the empty spot with Sub:{" "}
              <span className="font-semibold text-[var(--color-text)]">
                {formatPlayerName(subMovePrompt.suggestedSub.players)}
              </span>
              ?
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleMovePromptYes}
                className="ui-btn ui-btn-primary"
              >
                Yes, move up
              </button>
              <button
                type="button"
                onClick={handleMovePromptNo}
                className="ui-btn ui-btn-secondary"
              >
                No
              </button>
            </div>
          </>
        ) : null}
      </Modal>

      <Modal isOpen={creating} title="Add new player" onClose={() => setCreating(false)}>
        <label className="ui-label">First name</label>
        <input
          type="text"
          value={newFirst}
          onChange={(event) => setNewFirst(event.target.value)}
          className="ui-input mt-2"
        />
        <label className="ui-label mt-3">Last name (optional)</label>
        <input
          type="text"
          value={newLast}
          onChange={(event) => setNewLast(event.target.value)}
          className="ui-input mt-2"
        />
        <button
          type="button"
          onClick={createPlayer}
          className="ui-btn ui-btn-primary mt-4 w-full"
        >
          Save player
        </button>
      </Modal>
    </div>
  );
}

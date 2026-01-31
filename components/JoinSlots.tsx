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

export default function JoinSlots({
  isOpen,
  gameweekId,
  players,
  entries,
}: JoinSlotsProps) {
  const router = useRouter();
  const { isOrganiser } = useOrganiserMode();
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [liveEntries, setLiveEntries] = useState<GameweekPlayer[]>(entries);
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLiveEntries(entries);
  }, [entries]);

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

  const orderedEntries = useMemo(() => {
    return [...liveEntries].sort((a, b) => a.position - b.position);
  }, [liveEntries]);


  const slotEntries = useMemo(() => {
    const mainSlots = Array.from(
      { length: MAIN_CAPACITY },
      (_, index) => orderedEntries[index] ?? null
    );
    const subsSlots = Array.from(
      { length: SUB_CAPACITY },
      (_, index) => orderedEntries[MAIN_CAPACITY + index] ?? null
    );
    return { mainSlots, subsSlots };
  }, [orderedEntries]);

  const joinPlayer = async (playerId: string, slotIndex?: number) => {
    if (!gameweekId) return;
    setMessage("");
    const player = players.find((item) => item.id === playerId);
    if (player && typeof slotIndex === "number") {
      setLiveEntries((prev) => [
        ...prev,
        {
          id: `optimistic-${playerId}-${slotIndex}`,
          gameweek_id: gameweekId,
          player_id: playerId,
          team: "subs",
          position: slotIndex,
          remove_requested: false,
          players: player,
        },
      ]);
    }
    const response = await fetch(`/api/gameweeks/${gameweekId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, slotIndex }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Could not join.");
      router.refresh();
      return;
    }
    router.refresh();
  };

  const leavePlayer = async (playerId: string) => {
    if (!gameweekId) return;
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
      return;
    }
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
    }
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
    if (data.player?.id) {
      await joinPlayer(data.player.id, pendingSlot ?? undefined);
    } else {
      router.refresh();
    }
  };

  const availablePlayers = players.filter(
    (player) => !orderedEntries.some((entry) => entry.player_id === player.id)
  );

  const openDropdown = (slotIndex: number) => {
    if (!isOpen) return;
    setOpenSlot(slotIndex);
  };

  const selectPlayer = async (playerId: string) => {
    if (openSlot === null) return;
    setOpenSlot(null);
    await joinPlayer(playerId, openSlot);
  };

  const handleAddNew = () => {
    if (openSlot === null) return;
    setPendingSlot(openSlot);
    setOpenSlot(null);
    setCreating(true);
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
          {slotEntries.mainSlots.map((entry, index) => (
            <div
              key={`main-${index}`}
              className={`relative flex min-h-[56px] flex-col rounded-xl border p-3 text-xs shadow-sm ${
                entry?.remove_requested
                  ? "border-rose-200 bg-rose-50 text-rose-600"
                  : entry
                    ? "border-emerald-200 bg-emerald-50 text-slate-700"
                    : "border-slate-200 bg-white text-slate-600"
              } ${entry ? "justify-between" : "justify-center"}`}
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
                  {entry.remove_requested ? (
                    <span className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-rose-500">
                      Removal requested
                    </span>
                  ) : null}
                  {isOpen ? (
                    isOrganiser ? (
                      <button
                        type="button"
                        onClick={() => leavePlayer(entry.player_id)}
                        className="mt-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 text-rose-500"
                        aria-label="Remove player"
                      >
                        ×
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => requestRemoval(entry.player_id)}
                        className="mt-2 text-left text-xs font-semibold text-rose-500"
                      >
                        Remove me
                      </button>
                    )
                  ) : null}
                </>
                ) : (
                  <button
                    type="button"
                    onClick={() => openDropdown(index)}
                    className="flex w-full items-center justify-between gap-3 text-left text-slate-400"
                    data-slot-trigger
                    aria-label="Add player"
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

              {openSlot === index ? (
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
                    >
                      ×
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddNew}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
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
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Subs</p>
          <div className="mt-2 grid grid-cols-1 gap-3">
            {slotEntries.subsSlots.map((entry, index) => (
              <div
                key={`sub-${index}`}
                className={`relative flex min-h-[56px] flex-col rounded-xl border border-dashed p-3 text-xs shadow-sm ${
                  entry?.remove_requested
                    ? "border-rose-200 bg-rose-50 text-rose-600"
                    : entry
                      ? "border-emerald-200 bg-emerald-50 text-slate-700"
                      : "border-slate-200 bg-white text-slate-600"
                } ${entry ? "justify-between" : "justify-center"}`}
              >
                {entry ? (
                  <>
                    <span
                      className={`text-sm font-semibold ${
                        entry.remove_requested ? "text-rose-600" : "text-slate-900"
                      }`}
                    >
                      <span className="mr-2 text-xs text-slate-400">
                        {MAIN_CAPACITY + index + 1}.
                      </span>
                      {entry.players.first_name} {entry.players.last_name}
                    </span>
                    {entry.remove_requested ? (
                      <span className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-rose-500">
                        Removal requested
                      </span>
                    ) : null}
                    {isOpen ? (
                      isOrganiser ? (
                        <button
                          type="button"
                          onClick={() => leavePlayer(entry.player_id)}
                          className="mt-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 text-rose-500"
                          aria-label="Remove player"
                        >
                          ×
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => requestRemoval(entry.player_id)}
                          className="mt-2 text-left text-xs font-semibold text-rose-500"
                        >
                          Remove me
                        </button>
                      )
                    ) : null}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => openDropdown(MAIN_CAPACITY + index)}
                    className="flex w-full items-center justify-between gap-3 text-left text-slate-400"
                    data-slot-trigger
                    aria-label="Add player"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {MAIN_CAPACITY + index + 1}.
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

              {openSlot === MAIN_CAPACITY + index ? (
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
                      >
                        ×
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddNew}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
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
              </div>
            ))}
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

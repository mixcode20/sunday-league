"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { GameweekPlayer, Player } from "@/lib/types";
import Modal from "@/components/Modal";

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
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [liveEntries, setLiveEntries] = useState<GameweekPlayer[]>(entries);
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);

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
    }, 5000);

    return () => clearInterval(interval);
  }, [gameweekId]);

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
    const response = await fetch(`/api/gameweeks/${gameweekId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, slotIndex }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Could not join.");
      return;
    }
    router.refresh();
  };

  const leavePlayer = async (playerId: string) => {
    if (!gameweekId) return;
    setMessage("");
    const response = await fetch(`/api/gameweeks/${gameweekId}/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Could not remove.");
      return;
    }
    router.refresh();
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
              className="relative flex min-h-[56px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-sm"
            >
              {entry ? (
                <>
                  <span className="text-sm font-semibold text-slate-900">
                    {entry.players.first_name} {entry.players.last_name}
                  </span>
                  {isOpen ? (
                    <button
                      type="button"
                      onClick={() => leavePlayer(entry.player_id)}
                      className="mt-2 text-left text-xs font-semibold text-rose-500"
                    >
                      Remove
                    </button>
                  ) : null}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => openDropdown(index)}
                  className="flex w-full items-center justify-between gap-3 text-left text-slate-400"
                  aria-label="Add player"
                >
                  <span className="inline-flex items-center gap-2">
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
                <div className="absolute left-0 right-0 top-full z-10 mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                  <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-slate-400">
                    Add player
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
                className="relative flex min-h-[56px] flex-col justify-between rounded-xl border border-dashed border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-sm"
              >
                {entry ? (
                  <>
                    <span className="text-sm font-semibold text-slate-900">
                      {entry.players.first_name} {entry.players.last_name}
                    </span>
                    {isOpen ? (
                      <button
                        type="button"
                        onClick={() => leavePlayer(entry.player_id)}
                        className="mt-2 text-left text-xs font-semibold text-rose-500"
                      >
                        Remove
                      </button>
                    ) : null}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => openDropdown(MAIN_CAPACITY + index)}
                    className="flex w-full items-center justify-between gap-3 text-left text-slate-400"
                    aria-label="Add player"
                  >
                    <span className="inline-flex items-center gap-2">
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
                  <div className="absolute left-0 right-0 top-full z-10 mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                    <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-slate-400">
                      Add player
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

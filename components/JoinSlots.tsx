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
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [liveEntries, setLiveEntries] = useState<GameweekPlayer[]>(entries);

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
    }, 8000);

    return () => clearInterval(interval);
  }, [gameweekId]);

  const totalCount = liveEntries.length;
  const mainCount = Math.min(liveEntries.length, MAIN_CAPACITY);
  const subsCount = Math.max(liveEntries.length - MAIN_CAPACITY, 0);

  const slotEntries = useMemo(() => {
    const mainSlots = Array.from(
      { length: MAIN_CAPACITY },
      (_, index) => liveEntries[index] ?? null
    );
    const subsSlots = Array.from(
      { length: SUB_CAPACITY },
      (_, index) => liveEntries[MAIN_CAPACITY + index] ?? null
    );
    return { mainSlots, subsSlots };
  }, [liveEntries]);

  const joinPlayer = async (playerId: string) => {
    if (!gameweekId) return;
    setMessage("");
    const response = await fetch(`/api/gameweeks/${gameweekId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Could not join.");
      return;
    }
    setSelectedPlayer("");
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

  const handleSelect = (value: string) => {
    if (value === "__new__") {
      setCreating(true);
      return;
    }
    setSelectedPlayer(value);
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
      await joinPlayer(data.player.id);
    } else {
      router.refresh();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Capacity</p>
          <p className="text-sm text-slate-500">
            {mainCount}/{MAIN_CAPACITY} main · {Math.min(subsCount, SUB_CAPACITY)}/{SUB_CAPACITY} subs
          </p>
        </div>
        {isOpen ? (
          <div className="min-w-[220px]">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Add player
            </label>
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={selectedPlayer}
              onChange={(event) => handleSelect(event.target.value)}
              disabled={totalCount >= MAIN_CAPACITY + SUB_CAPACITY}
            >
              <option value="">Select your name</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.first_name} {player.last_name}
                </option>
              ))}
              <option value="__new__">+ New player</option>
            </select>
            {selectedPlayer ? (
              <button
                type="button"
                onClick={() => joinPlayer(selectedPlayer)}
                className="mt-2 w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
              >
                Add player
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

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
              className="flex min-h-[56px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-sm"
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
                <span className="text-slate-400">Free space</span>
              )}
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Subs</p>
          <div className="mt-2 grid grid-cols-1 gap-3">
            {slotEntries.subsSlots.map((entry, index) => (
              <div
                key={`sub-${index}`}
                className="flex min-h-[56px] flex-col justify-between rounded-xl border border-dashed border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-sm"
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
                <span className="text-slate-400">Free space</span>
              )}
            </div>
          ))}
        </div>
      </div>
      </div>

      <Modal isOpen={creating} title="Add player" onClose={() => setCreating(false)}>
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

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import SettingsButton from "@/components/SettingsButton";
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

export default function TeamsClient({ gameweek, entries }: TeamsClientProps) {
  const router = useRouter();
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [organiserPin, setOrganiserPin] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [lockingScore, setLockingScore] = useState({ darks: "", whites: "" });

  const isLocked = gameweek.status === "locked";

  const teams = useMemo(() => {
    const grouped: Record<Team, GameweekPlayer[]> = {
      darks: [],
      whites: [],
      subs: [],
    };
    entries.forEach((entry) => {
      grouped[entry.team].push(entry);
    });
    return grouped;
  }, [entries]);

  const openSettings = () => {
    setSettingsOpen(true);
    setPinInput("");
    setOrganiserPin("");
    setStatusMessage("");
  };

  const verifyPin = async () => {
    setStatusMessage("");
    const response = await fetch("/api/organiser/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: pinInput }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      setStatusMessage("Incorrect PIN.");
      return;
    }
    setOrganiserPin(pinInput);
    setSettingsOpen(false);
  };

  const handleAssign = async (team: Team) => {
    if (!draggedPlayerId || !organiserPin) return;
    if (teams[team].length >= TEAM_LIMITS[team]) {
      setStatusMessage(`Team ${team} is full.`);
      return;
    }
    setStatusMessage("");
    await fetch(`/api/gameweeks/${gameweek.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId: draggedPlayerId,
        team,
        position: teams[team].length,
        pin: organiserPin,
      }),
    });
    setDraggedPlayerId(null);
    router.refresh();
  };

  const handleKick = async (playerId: string) => {
    if (!organiserPin) return;
    await fetch(`/api/gameweeks/${gameweek.id}/kick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, pin: organiserPin }),
    });
    router.refresh();
  };

  const handleLock = async () => {
    if (!organiserPin) return;
    const darksScore = Number(lockingScore.darks);
    const whitesScore = Number(lockingScore.whites);
    if (Number.isNaN(darksScore) || Number.isNaN(whitesScore)) {
      setStatusMessage("Scores must be numbers.");
      return;
    }
    const response = await fetch(`/api/gameweeks/${gameweek.id}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ darksScore, whitesScore, pin: organiserPin }),
    });
    if (!response.ok) {
      const data = await response.json();
      setStatusMessage(data.error ?? "Failed to lock gameweek.");
      return;
    }
    router.refresh();
  };

  const renderList = (team: Team, title: string, accent: string) => (
    <div
      className={`flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${accent}`}
      onDragOver={(event) => {
        if (!organiserPin || isLocked) return;
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (!organiserPin || isLocked) return;
        handleAssign(team);
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h3>
        <span className="text-xs text-slate-400">
          {teams[team].length}/{TEAM_LIMITS[team]}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {teams[team].map((entry) => (
          <div
            key={entry.player_id}
            draggable={Boolean(organiserPin) && !isLocked}
            onDragStart={() => setDraggedPlayerId(entry.player_id)}
            className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
          >
            <span>
              {entry.players.first_name} {entry.players.last_name}
            </span>
            {organiserPin && !isLocked ? (
              <button
                type="button"
                onClick={() => handleKick(entry.player_id)}
                className="text-xs font-semibold text-rose-500"
              >
                Kick
              </button>
            ) : null}
          </div>
        ))}
        {teams[team].length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
            Drag players here
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Gameweek status
          </p>
          <p className="text-base font-semibold text-slate-800">
            {isLocked ? "Locked" : "Open"}
          </p>
        </div>
        {!isLocked ? (
          <SettingsButton onClick={openSettings} label="Organiser" />
        ) : null}
      </div>

      {statusMessage ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {statusMessage}
        </p>
      ) : null}

      {!isLocked && !organiserPin ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
          Unlock organiser tools to drag players, kick, or lock the gameweek.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {renderList("darks", "Darks", "bg-slate-50")}
        {renderList("whites", "Whites", "bg-slate-50")}
        {renderList("subs", "Subs", "bg-slate-50")}
      </div>

      {!isLocked && organiserPin ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700">
            Lock gameweek with score
          </h3>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              min="0"
              className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm"
              value={lockingScore.darks}
              onChange={(event) =>
                setLockingScore((prev) => ({
                  ...prev,
                  darks: event.target.value,
                }))
              }
              placeholder="Darks"
            />
            <span className="text-slate-500">-</span>
            <input
              type="number"
              min="0"
              className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm"
              value={lockingScore.whites}
              onChange={(event) =>
                setLockingScore((prev) => ({
                  ...prev,
                  whites: event.target.value,
                }))
              }
              placeholder="Whites"
            />
            <button
              type="button"
              className="ml-auto rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
              onClick={handleLock}
            >
              Save & Lock
            </button>
          </div>
        </div>
      ) : null}

      <Modal
        isOpen={settingsOpen}
        title="Organiser access"
        onClose={() => setSettingsOpen(false)}
      >
        <label className="text-sm font-medium text-slate-600">
          Enter organiser PIN
        </label>
        <input
          type="password"
          value={pinInput}
          onChange={(event) => setPinInput(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-base"
          placeholder="PIN"
        />
        <button
          type="button"
          onClick={verifyPin}
          className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Unlock tools
        </button>
        <p className="mt-2 text-xs text-slate-500">
          PIN is required every time settings are opened.
        </p>
      </Modal>
    </div>
  );
}

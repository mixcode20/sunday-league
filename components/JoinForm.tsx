"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Player } from "@/lib/types";

type JoinFormProps = {
  gameweekId: string;
  players: Player[];
};

export default function JoinForm({ gameweekId, players }: JoinFormProps) {
  const router = useRouter();
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequest = async (endpoint: "join" | "leave") => {
    if (!selectedPlayer) {
      setMessage("Pick your name first.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/gameweeks/${gameweekId}/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId: selectedPlayer }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Something went wrong.");
      } else {
        setMessage(endpoint === "join" ? "You're in!" : "You're out.");
        router.refresh();
      }
    } catch (error) {
      setMessage("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <label className="text-sm font-medium text-slate-600">
        Select your name
      </label>
      <select
        className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-base"
        value={selectedPlayer}
        onChange={(event) => setSelectedPlayer(event.target.value)}
      >
        <option value="">Choose player...</option>
        {players.map((player) => (
          <option key={player.id} value={player.id}>
            {player.first_name} {player.last_name}
          </option>
        ))}
      </select>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => handleRequest("join")}
          className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Join
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => handleRequest("leave")}
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Leave
        </button>
      </div>
      {message ? (
        <p className="mt-2 text-sm text-slate-500">{message}</p>
      ) : null}
    </div>
  );
}

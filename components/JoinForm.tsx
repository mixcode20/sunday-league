"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Player } from "@/lib/types";
import { formatPlayerName } from "@/lib/utils";

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
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ui-card p-4">
      <label className="ui-label">Select your name</label>
      <select
        className="ui-input mt-2"
        value={selectedPlayer}
        onChange={(event) => setSelectedPlayer(event.target.value)}
      >
        <option value="">Choose player...</option>
        {players.map((player) => (
          <option key={player.id} value={player.id}>
            {formatPlayerName(player)}
          </option>
        ))}
      </select>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => handleRequest("join")}
          className="ui-btn flex-1 bg-[var(--color-primary)] text-white hover:bg-[#186650]"
        >
          Join
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => handleRequest("leave")}
          className="ui-btn ui-btn-secondary flex-1"
        >
          Leave
        </button>
      </div>
      {message ? (
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{message}</p>
      ) : null}
    </div>
  );
}

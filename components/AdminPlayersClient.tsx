"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOrganiserMode } from "@/components/OrganiserModeProvider";
import type { Player } from "@/lib/types";
import { formatPlayerName } from "@/lib/utils";

type AdminPlayersClientProps = {
  players: Player[];
};

type Draft = {
  first_name: string;
  last_name: string;
};

export default function AdminPlayersClient({ players }: AdminPlayersClientProps) {
  const router = useRouter();
  const { isUnlocked, organiserPin } = useOrganiserMode();
  const [message, setMessage] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const sortedPlayers = useMemo(
    () =>
      [...players].sort((a, b) => formatPlayerName(a).localeCompare(formatPlayerName(b))),
    [players]
  );

  const handleCreate = async () => {
    if (!organiserPin) return;
    setMessage("");
    const response = await fetch("/api/players/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: newFirstName,
        lastName: newLastName,
        pin: organiserPin,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Failed to create player.");
      return;
    }
    setNewFirstName("");
    setNewLastName("");
    router.refresh();
  };

  const handleUpdate = async (id: string) => {
    if (!organiserPin) return;
    setMessage("");
    const draft = drafts[id];
    const response = await fetch("/api/players/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        firstName: draft?.first_name ?? "",
        lastName: draft?.last_name ?? "",
        pin: organiserPin,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Failed to update player.");
      return;
    }
    router.refresh();
  };

  const handleArchive = async (id: string) => {
    if (!organiserPin) return;
    setMessage("");
    const response = await fetch("/api/players/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, pin: organiserPin }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Failed to archive player.");
      return;
    }
    router.refresh();
  };

  const updateDraft = (id: string, field: keyof Draft, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        first_name: prev[id]?.first_name ?? "",
        last_name: prev[id]?.last_name ?? "",
        [field]: value,
      },
    }));
  };

  return (
    <div className="space-y-4">
      <section className="ui-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="ui-kicker">Admin</p>
            <h2 className="text-2xl font-semibold text-[var(--color-text)]">
              Player management
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Create, edit, or archive players.
            </p>
          </div>
        </div>
      </section>

      {message ? <p className="ui-banner ui-banner-warning">{message}</p> : null}

      {isUnlocked ? (
        <div className="ui-card p-4 text-sm text-[var(--color-text)]">
          <p className="ui-kicker">Organiser menu</p>
          <p className="mt-2">
            Add new players above, edit active players, or archive them below.
          </p>
        </div>
      ) : (
        <p className="ui-banner ui-banner-warning">
          Unlock organiser tools to edit players.
        </p>
      )}
      {isUnlocked ? (
        <>
          <section className="ui-card p-4">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">Add player</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <input
                className="ui-input"
                placeholder="First name"
                value={newFirstName}
                onChange={(event) => setNewFirstName(event.target.value)}
              />
              <input
                className="ui-input"
                placeholder="Last name (optional)"
                value={newLastName}
                onChange={(event) => setNewLastName(event.target.value)}
              />
              <button type="button" onClick={handleCreate} className="ui-btn ui-btn-primary">
                Create
              </button>
            </div>
          </section>

          <section className="space-y-2">
            {sortedPlayers.length === 0 ? (
              <div className="ui-empty p-4 text-sm">
                No players yet. Add the first player above.
              </div>
            ) : (
              sortedPlayers.map((player) => {
                const draft = drafts[player.id] ?? {
                  first_name: player.first_name,
                  last_name: player.last_name,
                };
                return (
                  <div key={player.id} className="ui-card p-4">
                    <div className="grid gap-2 md:grid-cols-3">
                      <input
                        className="ui-input"
                        value={draft.first_name}
                        onChange={(event) =>
                          updateDraft(player.id, "first_name", event.target.value)
                        }
                      />
                      <input
                        className="ui-input"
                        value={draft.last_name}
                        onChange={(event) =>
                          updateDraft(player.id, "last_name", event.target.value)
                        }
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdate(player.id)}
                          className="ui-btn ui-btn-secondary flex-1"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchive(player.id)}
                          disabled={player.archived}
                          className="ui-btn ui-btn-secondary flex-1"
                        >
                          {player.archived ? "Archived" : "Archive"}
                        </button>
                      </div>
                    </div>
                    {player.archived ? (
                      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-[var(--color-warning)]">
                        Archived
                      </p>
                    ) : null}
                  </div>
                );
              })
            )}
          </section>
        </>
      ) : (
        <section className="ui-card p-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">Players</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {sortedPlayers.length === 0 ? (
              <div className="ui-empty px-3 py-4 text-sm">No players yet.</div>
            ) : (
              sortedPlayers.map((player) => (
                <div key={player.id} className="ui-slot-filled rounded-[8px] border px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span>{formatPlayerName(player)}</span>
                    {player.archived ? (
                      <span className="ui-chip px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--color-warning)]">
                        Archived
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

    </div>
  );
}

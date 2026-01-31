"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOrganiserMode } from "@/components/OrganiserModeProvider";
import type { Player } from "@/lib/types";

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
      [...players].sort((a, b) =>
        `${a.first_name} ${a.last_name}`.localeCompare(
          `${b.first_name} ${b.last_name}`
        )
      ),
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

  const handleDelete = async (id: string) => {
    if (!organiserPin) return;
    setMessage("");
    const response = await fetch("/api/players/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, pin: organiserPin }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Failed to delete player.");
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
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Admin
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              Player management
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Create, edit, or remove players.
            </p>
          </div>
        </div>
      </section>

      {message ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {message}
        </p>
      ) : null}

      {isUnlocked ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Organiser menu
          </p>
          <p className="mt-2">
            Add new players above, edit or delete existing players below.
          </p>
        </div>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
          Unlock organiser tools to edit players.
        </p>
      )}
      {isUnlocked ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700">Add player</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="First name"
                value={newFirstName}
                onChange={(event) => setNewFirstName(event.target.value)}
              />
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Last name"
                value={newLastName}
                onChange={(event) => setNewLastName(event.target.value)}
              />
              <button
                type="button"
                onClick={handleCreate}
                className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
              >
                Create
              </button>
            </div>
          </section>

          <section className="space-y-2">
            {sortedPlayers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-400">
                No players yet. Add the first player above.
              </div>
            ) : (
              sortedPlayers.map((player) => {
                const draft = drafts[player.id] ?? {
                  first_name: player.first_name,
                  last_name: player.last_name,
                };
                return (
                  <div
                    key={player.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="grid gap-2 md:grid-cols-3">
                      <input
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        value={draft.first_name}
                        onChange={(event) =>
                          updateDraft(player.id, "first_name", event.target.value)
                        }
                      />
                      <input
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        value={draft.last_name}
                        onChange={(event) =>
                          updateDraft(player.id, "last_name", event.target.value)
                        }
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdate(player.id)}
                          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(player.id)}
                          className="flex-1 rounded-xl border border-rose-200 px-3 py-2 text-sm text-rose-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700">Players</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {sortedPlayers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-400">
                No players yet.
              </div>
            ) : (
              sortedPlayers.map((player) => (
                <div
                  key={player.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                >
                  {player.first_name} {player.last_name}
                </div>
              ))
            )}
          </div>
        </section>
      )}

    </div>
  );
}

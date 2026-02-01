"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { useOrganiserMode } from "@/components/OrganiserModeProvider";
import type { Gameweek } from "@/lib/types";

type ConfirmResultPanelProps = {
  gameweek: Gameweek;
};

export default function ConfirmResultPanel({ gameweek }: ConfirmResultPanelProps) {
  const router = useRouter();
  const { isUnlocked, organiserPin } = useOrganiserMode();
  const [isOpen, setIsOpen] = useState(false);
  const [darksScore, setDarksScore] = useState(
    typeof gameweek.darks_score === "number" ? String(gameweek.darks_score) : ""
  );
  const [whitesScore, setWhitesScore] = useState(
    typeof gameweek.whites_score === "number" ? String(gameweek.whites_score) : ""
  );
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isUnlocked) return null;

  const submitResult = async () => {
    if (!organiserPin) {
      setMessage("Unlock organiser mode again to confirm the result.");
      return;
    }
    const darks = Number(darksScore);
    const whites = Number(whitesScore);
    if (!Number.isFinite(darks) || !Number.isFinite(whites)) {
      setMessage("Scores must be numbers.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    const response = await fetch(`/api/gameweeks/${gameweek.id}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ darksScore: darks, whitesScore: whites, pin: organiserPin }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Failed to confirm result.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    setIsOpen(false);
    router.refresh();
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Organiser</p>
          <p className="text-sm font-semibold text-slate-800">Confirm result</p>
        </div>
        <button
          type="button"
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => setIsOpen(true)}
          disabled={gameweek.status === "locked"}
        >
          {gameweek.status === "locked" ? "Result confirmed" : "Confirm result"}
        </button>
      </div>
      {message ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {message}
        </p>
      ) : null}

      <Modal
        isOpen={isOpen}
        title="Confirm result"
        onClose={() => setIsOpen(false)}
        position="top"
      >
        <label className="text-sm font-medium text-slate-600">Darks score</label>
        <input
          type="number"
          min={0}
          value={darksScore}
          onChange={(event) => setDarksScore(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-base"
        />
        <label className="mt-3 text-sm font-medium text-slate-600">Whites score</label>
        <input
          type="number"
          min={0}
          value={whitesScore}
          onChange={(event) => setWhitesScore(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-base"
        />
        <button
          type="button"
          onClick={submitResult}
          disabled={submitting}
          className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Save result
        </button>
        {message ? (
          <p className="mt-2 text-sm text-amber-600">{message}</p>
        ) : null}
      </Modal>
    </div>
  );
}

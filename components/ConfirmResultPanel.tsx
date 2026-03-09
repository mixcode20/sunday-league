"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { useOrganiserMode } from "@/components/OrganiserModeProvider";
import type { Gameweek } from "@/lib/types";
import { getGameweekDateTime } from "@/lib/utils";

type ConfirmResultPanelProps = {
  gameweek: Gameweek;
};

export default function ConfirmResultPanel({ gameweek }: ConfirmResultPanelProps) {
  const router = useRouter();
  const { isUnlocked, organiserPin } = useOrganiserMode();
  const [isOpen, setIsOpen] = useState(false);
  const [resultMode, setResultMode] = useState<"score" | "result">("score");
  const [darksScore, setDarksScore] = useState(
    typeof gameweek.darks_score === "number" ? String(gameweek.darks_score) : ""
  );
  const [whitesScore, setWhitesScore] = useState(
    typeof gameweek.whites_score === "number" ? String(gameweek.whites_score) : ""
  );
  const [winner, setWinner] = useState<"darks" | "whites" | "draw" | "">("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const gameDateTime = getGameweekDateTime(gameweek.game_date, gameweek.game_time);
  const canConfirm = Boolean(gameDateTime && Date.now() >= gameDateTime.getTime());

  if (!isUnlocked || !canConfirm) return null;

  const submitResult = async () => {
    if (!organiserPin) {
      setMessage("Unlock organiser mode again to confirm the result.");
      return;
    }

    const payload: {
      pin: string;
      resultMode: "score" | "result";
      darksScore?: number;
      whitesScore?: number;
      winner?: "darks" | "whites" | "draw";
    } = {
      pin: organiserPin,
      resultMode,
    };

    if (resultMode === "score") {
      if (darksScore.trim() === "" || whitesScore.trim() === "") {
        setMessage("Both scores are required.");
        return;
      }
      const darks = Number(darksScore);
      const whites = Number(whitesScore);
      if (!Number.isFinite(darks) || !Number.isFinite(whites)) {
        setMessage("Both scores are required.");
        return;
      }
      if (!Number.isInteger(darks) || !Number.isInteger(whites)) {
        setMessage("Scores must be whole numbers.");
        return;
      }
      if (darks < 0 || whites < 0) {
        setMessage("Scores cannot be negative.");
        return;
      }
      payload.darksScore = darks;
      payload.whitesScore = whites;
    } else if (winner) {
      payload.winner = winner;
    } else {
      setMessage("Select one result option.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    const response = await fetch(`/api/gameweeks/${gameweek.id}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
          onClick={() => {
            setResultMode("score");
            setWinner("");
            setMessage("");
            setIsOpen(true);
          }}
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
        onClose={() => {
          setMessage("");
          setIsOpen(false);
        }}
        position="top"
      >
        <div className="rounded-xl border border-slate-200 p-1">
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => {
                setResultMode("score");
                setMessage("");
              }}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                resultMode === "score"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              By score
            </button>
            <button
              type="button"
              onClick={() => {
                setResultMode("result");
                setMessage("");
              }}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                resultMode === "result"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              By result
            </button>
          </div>
        </div>

        {resultMode === "score" ? (
          <>
            <label className="mt-4 block text-sm font-medium text-slate-600">
              Darks score
            </label>
            <input
              type="number"
              min={0}
              value={darksScore}
              onChange={(event) => setDarksScore(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-base"
            />
            <label className="mt-3 block text-sm font-medium text-slate-600">
              Whites score
            </label>
            <input
              type="number"
              min={0}
              value={whitesScore}
              onChange={(event) => setWhitesScore(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-base"
            />
          </>
        ) : (
          <fieldset className="mt-4 space-y-2">
            <legend className="text-sm font-medium text-slate-600">Result</legend>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <input
                type="radio"
                name="winner"
                value="darks"
                checked={winner === "darks"}
                onChange={() => setWinner("darks")}
              />
              Darks won
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <input
                type="radio"
                name="winner"
                value="whites"
                checked={winner === "whites"}
                onChange={() => setWinner("whites")}
              />
              Whites won
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <input
                type="radio"
                name="winner"
                value="draw"
                checked={winner === "draw"}
                onChange={() => setWinner("draw")}
              />
              Draw
            </label>
          </fieldset>
        )}
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

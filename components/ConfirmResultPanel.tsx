"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import Modal from "@/components/Modal";
import { useOrganiserMode } from "@/components/OrganiserModeProvider";
import type { Gameweek } from "@/lib/types";
import { getGameweekDateTime } from "@/lib/utils";

type ConfirmResultPanelProps = {
  gameweek: Gameweek;
};

export default function ConfirmResultPanel({ gameweek }: ConfirmResultPanelProps) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
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
  const [now, setNow] = useState(() => Date.now());

  const gameDateTime = getGameweekDateTime(gameweek.game_date, gameweek.game_time);
  const canConfirm = Boolean(gameDateTime && now >= gameDateTime.getTime());

  useEffect(() => {
    if (!gameDateTime || now >= gameDateTime.getTime()) return;
    const timeoutId = window.setTimeout(() => setNow(Date.now()), 1000);
    return () => window.clearTimeout(timeoutId);
  }, [gameDateTime, now]);

  if (!isUnlocked || !canConfirm) return null;

  const formatApiError = (data: unknown, fallback: string) => {
    if (!data || typeof data !== "object") return fallback;
    if ("error" in data && typeof data.error === "string") {
      return data.error;
    }
    if ("error" in data && data.error && typeof data.error === "object") {
      const error = data.error as {
        message?: string;
        details?: string | null;
        code?: string | null;
      };
      const message = error.message ?? fallback;
      const details = error.details ? ` (${error.details})` : "";
      const code = error.code ? ` [${error.code}]` : "";
      return `${message}${code}${details}`;
    }
    return fallback;
  };

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
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(formatApiError(data, "Failed to confirm result."));
      setSubmitting(false);
      return;
    }
    await Promise.all([
      mutate("/api/game/overview"),
      mutate("/api/teams/overview"),
      mutate("/api/league/overview"),
      mutate((key) => typeof key === "string" && key.startsWith("/api/results/overview")),
    ]);
    setSubmitting(false);
    setMessage("");
    setIsOpen(false);
    router.refresh();
  };

  return (
    <div className="ui-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="ui-kicker">Organiser</p>
          <p className="text-sm font-semibold text-[var(--color-text)]">Confirm result</p>
        </div>
        <button
          type="button"
          className="ui-btn ui-btn-primary"
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
        <p className="ui-banner ui-banner-warning mt-3">
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
        <div className="ui-segment">
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => {
                setResultMode("score");
                setMessage("");
              }}
              className={`ui-segment-option ${
                resultMode === "score"
                  ? "ui-segment-option-active"
                  : ""
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
              className={`ui-segment-option ${
                resultMode === "result"
                  ? "ui-segment-option-active"
                  : ""
              }`}
            >
              By result
            </button>
          </div>
        </div>

        {resultMode === "score" ? (
          <>
            <label className="ui-label mt-4">Darks score</label>
            <input
              type="number"
              min={0}
              value={darksScore}
              onChange={(event) => setDarksScore(event.target.value)}
              className="ui-input mt-2"
            />
            <label className="ui-label mt-3">Whites score</label>
            <input
              type="number"
              min={0}
              value={whitesScore}
              onChange={(event) => setWhitesScore(event.target.value)}
              className="ui-input mt-2"
            />
          </>
        ) : (
          <fieldset className="mt-4 space-y-2">
            <legend className="ui-label">Result</legend>
            <label className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)]">
              <input
                type="radio"
                name="winner"
                value="darks"
                checked={winner === "darks"}
                onChange={() => setWinner("darks")}
              />
              Darks won
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)]">
              <input
                type="radio"
                name="winner"
                value="whites"
                checked={winner === "whites"}
                onChange={() => setWinner("whites")}
              />
              Whites won
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)]">
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
          className="ui-btn ui-btn-primary mt-4 w-full"
        >
          Save result
        </button>
        {message ? (
          <p className="ui-banner ui-banner-warning mt-2">{message}</p>
        ) : null}
      </Modal>
    </div>
  );
}

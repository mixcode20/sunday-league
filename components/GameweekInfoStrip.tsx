"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import ConfirmResultPanel from "@/components/ConfirmResultPanel";
import {
  formatGameweekDate,
  getGameweekDateTime,
  getGameweekWinner,
  hasGameweekStarted,
} from "@/lib/utils";
import { buildEntryPositionMap, getSlotCounts } from "@/lib/slots";
import { useOrganiserMode } from "@/components/OrganiserModeProvider";
import Modal from "@/components/Modal";
import ShareGameButton from "@/components/ShareGameButton";
import type { Gameweek, GameweekPlayer, Player } from "@/lib/types";

type GameweekInfoStripProps = {
  gameweekId?: string | null;
  gameDate?: string | null;
  time?: string | null;
  location?: string | null;
  paymentLink?: string | null;
  mainCount?: number;
  subsCount?: number;
  entries?: GameweekPlayer[];
  onRefresh?: () => void;
  showShareButton?: boolean;
  gameweek?: Gameweek | null;
  players?: Player[];
  footerAction?: ReactNode;
};

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M12 22s7-6.18 7-12a7 7 0 1 0-14 0c0 5.82 7 12 7 12Zm0-9.5A2.5 2.5 0 1 1 12 7a2.5 2.5 0 0 1 0 5.5Z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M12 1.75A10.25 10.25 0 1 0 22.25 12 10.26 10.26 0 0 0 12 1.75Zm0 18.5A8.25 8.25 0 1 1 20.25 12 8.26 8.26 0 0 1 12 20.25Zm.75-13h-1.5V12c0 .28.12.55.33.74l3.25 2.75.97-1.14-3.05-2.58V7.25Z" />
    </svg>
  );
}

export default function GameweekInfoStrip({
  gameweekId,
  gameDate,
  time,
  location,
  paymentLink,
  mainCount = 0,
  subsCount = 0,
  entries = [],
  onRefresh,
  showShareButton = false,
  gameweek = null,
  players = [],
  footerAction,
}: GameweekInfoStripProps) {
  const router = useRouter();
  const { isUnlocked, organiserPin } = useOrganiserMode();
  const [liveCounts, setLiveCounts] = useState<{
    main: number;
    subs: number;
    source: string;
  } | null>(null);
  const [liveEntries, setLiveEntries] = useState<GameweekPlayer[] | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editDate, setEditDate] = useState(gameDate ?? "");
  const [editTime, setEditTime] = useState("");
  const [editLocation, setEditLocation] = useState(location ?? "");
  const [editPaymentLink, setEditPaymentLink] = useState(paymentLink ?? "");
  const [message, setMessage] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const countsSource = `${gameweekId ?? "none"}:${mainCount}:${subsCount}`;
  const countsSourceRef = useRef(countsSource);

  useEffect(() => {
    countsSourceRef.current = countsSource;
  }, [countsSource]);

  useEffect(() => {
    if (!gameweekId) return;
    const interval = setInterval(async () => {
      const response = await fetch(`/api/gameweeks/${gameweekId}/entries`);
      if (!response.ok) return;
      const data = await response.json();
      if (Array.isArray(data.entries)) {
        setLiveEntries(data.entries);
        const { positionMap } = buildEntryPositionMap(data.entries);
        const { main, subs } = getSlotCounts(positionMap);
        setLiveCounts({
          main,
          subs,
          source: countsSourceRef.current,
        });
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [gameweekId]);

  const formatTimeFromInput = (value: string) => {
    if (!value) return "";
    const [hoursRaw, minutesRaw] = value.split(":");
    if (!hoursRaw || !minutesRaw) return "";
    const hoursNumber = Number(hoursRaw);
    if (Number.isNaN(hoursNumber)) return "";
    const period = hoursNumber >= 12 ? "pm" : "am";
    const hours12 = hoursNumber % 12 || 12;
    const minutes = minutesRaw.padStart(2, "0").slice(0, 2);
    return `${hours12}:${minutes}${period}`;
  };

  const timeForInput = useMemo(() => {
    if (!time) return "";
    const match = time.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
    if (!match) return "";
    const hours = Number(match[1]);
    const minutes = Number(match[2] ?? "0");
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return "";
    let adjusted = hours % 12;
    if (match[3].toLowerCase() === "pm") {
      adjusted += 12;
    }
    const hoursStr = String(adjusted).padStart(2, "0");
    const minutesStr = String(minutes).padStart(2, "0");
    return `${hoursStr}:${minutesStr}`;
  }, [time]);

  const gameweekDateTime = useMemo(
    () => (gameDate ? getGameweekDateTime(gameDate, time) : null),
    [gameDate, time]
  );

  useEffect(() => {
    if (!gameweekDateTime || now >= gameweekDateTime.getTime()) return;
    const timeoutId = window.setTimeout(() => setNow(Date.now()), 1000);
    return () => window.clearTimeout(timeoutId);
  }, [gameweekDateTime, now]);

  if (!gameDate) {
    return (
      <div className="ui-card-muted w-full px-4 py-3 text-sm text-[var(--color-text-secondary)]">
          No gameweek scheduled yet.
      </div>
    );
  }

  const openEdit = () => {
    setMessage("");
    setDeleteConfirm("");
    setEditDate(gameDate ?? "");
    setEditTime(timeForInput);
    setEditLocation(location ?? "");
    setEditPaymentLink(paymentLink ?? "");
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!gameweekId || !organiserPin) return;
    if (!editDate) {
      setMessage("Date is required.");
      return;
    }
    setMessage("");
    const formattedTime = formatTimeFromInput(editTime) || (time ?? "9:15am");
    const response = await fetch(`/api/gameweeks/${gameweekId}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: editDate,
        time: formattedTime,
        location: editLocation,
        paymentLink: editPaymentLink,
        pin: organiserPin,
      }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const errorMessage =
        data?.error?.message ?? data?.error ?? "Failed to update gameweek.";
      setMessage(errorMessage);
      return;
    }
    setEditOpen(false);
    onRefresh?.();
    router.refresh();
  };

  const handleDelete = async () => {
    if (!gameweekId || !organiserPin) return;
    if (deleteConfirm !== "DELETE") {
      setMessage("Type DELETE to confirm.");
      return;
    }
    setMessage("");
    const response = await fetch(`/api/gameweeks/${gameweekId}/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: organiserPin }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const errorMessage =
        data?.error?.message ?? data?.error ?? "Failed to delete gameweek.";
      setMessage(errorMessage);
      return;
    }
    setEditOpen(false);
    onRefresh?.();
    router.refresh();
  };

  const displayLocation =
    location === "MH" || !location ? "Mill Hill" : location;
  const counts =
    liveCounts && liveCounts.source === countsSource
      ? liveCounts
      : { main: mainCount, subs: subsCount };
  const shareEntries =
    liveEntries && liveCounts?.source === countsSource ? liveEntries : entries;
  const hideActionsAfterStart = hasGameweekStarted(gameDate, time, now);
  const lockedWinner = gameweek?.status === "locked" ? getGameweekWinner(gameweek) : null;
  const resultLabel =
    lockedWinner === "darks"
      ? "Darks win"
      : lockedWinner === "whites"
        ? "Whites win"
        : lockedWinner === "draw"
          ? "Draw"
          : null;
  const resultTextClass =
    lockedWinner === "darks"
      ? "text-[var(--color-primary-dark)]"
      : lockedWinner === "whites"
        ? "text-[var(--color-text)]"
        : "text-[var(--color-primary-dark)]";
  const showConfirmPanel =
    Boolean(gameweek) &&
    isUnlocked &&
    gameweek?.status === "open" &&
    hideActionsAfterStart;

  return (
    <div className="w-full">
      <div className="ui-card overflow-hidden">
        <section>
          <div className="relative flex items-center justify-center bg-[var(--off-white-green)] px-5 py-4 text-[var(--color-primary-dark)] sm:px-6">
            <div className="text-center text-[1.2rem] font-semibold tracking-[-0.03em] text-[var(--color-primary-dark)] sm:text-[1.6rem]">
              {formatGameweekDate(gameDate)}
            </div>
            {isUnlocked ? (
              <button
                type="button"
                onClick={openEdit}
                className="ui-btn absolute right-5 top-1/2 min-h-0 -translate-y-1/2 rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] sm:right-6"
                disabled={!gameweekId}
              >
                Edit
              </button>
            ) : null}
          </div>

          <div className="bg-white px-5 pb-5 pt-3 text-center sm:px-6 sm:pb-6">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] sm:text-base">
                <span className="text-[var(--color-primary)]">
                  <ClockIcon />
                </span>
                <span>{time ?? "9:15am"}</span>
              </div>
              <div className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] sm:text-base">
                <span className="text-[var(--color-primary)]">
                  <LocationIcon />
                </span>
                <span>{displayLocation}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-baseline gap-2 rounded-full bg-[var(--off-white-green)] px-4 py-2 text-[0.64rem] font-medium text-[var(--color-text-secondary)] sm:text-[0.64rem]">
                <span>Players</span>
                <span className="text-[0.8rem] font-semibold tracking-[-0.03em] text-[var(--color-text)] sm:text-[1.28rem]">
                  {counts.main}
                  <span className="text-[var(--color-text-secondary)]"> / 14</span>
                </span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--off-white-green)] px-4 py-2 text-[0.64rem] font-medium text-[var(--color-text-secondary)] sm:text-[0.64rem]">
                <span>Subs</span>
                <span className="text-[0.8rem] font-semibold tracking-[-0.03em] text-[var(--color-text)] sm:text-[1.28rem]">
                  {counts.subs}
                </span>
              </div>
            </div>

            {resultLabel ? (
              <div className="mt-4">
                <div className="mx-auto mb-3 h-px w-10 bg-[rgba(15,61,52,0.12)]" aria-hidden="true" />
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-secondary)]">
                    Result
                  </span>
                  <span className={`text-sm font-semibold ${resultTextClass}`}>
                    {resultLabel}
                  </span>
                </div>
              </div>
            ) : null}

            {showShareButton && gameweekId && !hideActionsAfterStart ? (
              <div className="mt-4">
                <ShareGameButton
                  gameweekId={gameweekId}
                  gameDate={gameDate}
                  time={time}
                  location={location}
                  entries={shareEntries}
                />
              </div>
            ) : null}

            {showConfirmPanel ? (
              <div className="mt-5">
                <ConfirmResultPanel gameweek={gameweek!} players={players} embedded />
              </div>
            ) : null}

            {footerAction ? (
              <div className="mt-5 border-t border-[var(--color-border)] pt-5">
                {footerAction}
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <Modal
        isOpen={editOpen}
        title="Edit gameweek"
        onClose={() => setEditOpen(false)}
        position="top"
      >
        <label className="ui-label">Date</label>
        <input
          type="date"
          value={editDate}
          onChange={(event) => setEditDate(event.target.value)}
          className="ui-input mt-2"
          autoFocus
        />
        <label className="ui-label mt-3">Time</label>
        <input
          type="time"
          value={editTime}
          onChange={(event) => setEditTime(event.target.value)}
          className="ui-input mt-2"
        />
        <label className="ui-label mt-3">Location</label>
        <input
          type="text"
          value={editLocation}
          onChange={(event) => setEditLocation(event.target.value)}
          className="ui-input mt-2"
        />
        <label className="ui-label mt-3">Payment link</label>
        <input
          type="text"
          value={editPaymentLink}
          onChange={(event) => setEditPaymentLink(event.target.value)}
          className="ui-input mt-2"
          placeholder="https://"
        />
        <button
          type="button"
          onClick={handleSave}
          className="ui-btn ui-btn-primary mt-4 w-full"
        >
          Save changes
        </button>

        <div className="ui-banner ui-banner-danger mt-6">
          <p className="font-semibold">Delete gameweek</p>
          <p className="mt-1 text-xs">
            Type DELETE to remove {formatGameweekDate(gameDate)} and all signups.
          </p>
          <input
            type="text"
            value={deleteConfirm}
            onChange={(event) => setDeleteConfirm(event.target.value)}
            className="ui-input mt-2 border-[rgba(229,72,77,0.22)] text-[var(--color-danger)]"
            placeholder="DELETE"
          />
          <button
            type="button"
            onClick={handleDelete}
            className="ui-btn ui-btn-danger mt-3 w-full"
            disabled={deleteConfirm !== "DELETE"}
          >
            Delete gameweek
          </button>
        </div>

        {message ? (
          <p className="ui-banner ui-banner-danger mt-2">{message}</p>
        ) : null}
      </Modal>
    </div>
  );
}

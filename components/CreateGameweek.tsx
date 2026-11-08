"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatFullDayDate, getNextSundayISO } from "@/lib/utils";
import { useOrganiserMode } from "@/components/OrganiserModeProvider";
import Modal from "@/components/Modal";
import type { GameweekStatus, Player } from "@/lib/types";
import { capacityForFormat, DEFAULT_GAME_FORMAT, type GameFormat } from "@/lib/slots";
import { formatPlayerName } from "@/lib/utils";

type CreateGameweekProps = {
  activeGameweekStatus?: GameweekStatus | null;
  players?: Player[];
  onCreated?: (gameweekId: string) => Promise<boolean> | boolean;
  buttonLabel?: string;
  showTrigger?: boolean;
  openRequestKey?: number;
  allowCompletedOverride?: boolean;
};

export default function CreateGameweek({
  activeGameweekStatus = null,
  players = [],
  onCreated,
  buttonLabel = "Create new game",
  showTrigger = true,
  openRequestKey = 0,
  allowCompletedOverride = false,
}: CreateGameweekProps) {
  const pinnedPlayerId = "541f87de-b74d-43da-b97b-97d688968fb5";
  const customTimeOption = "custom";
  const presetTimes = ["9:15am", "9:30am"];
  const quickPickTimes = [...presetTimes, customTimeOption];
  const formatOptions: GameFormat[] = ["7s", "5s"];
  // Inline label + control on one line; fixed label column keeps controls aligned.
  const fieldRowClass = "grid grid-cols-[5rem_1fr] items-center gap-3";
  const timeOptionLabels: Record<string, string> = {
    "9:15am": "9:15",
    "9:30am": "9:30",
    [customTimeOption]: "Custom",
  };
  const router = useRouter();
  const { isUnlocked, organiserPin } = useOrganiserMode();
  const [date, setDate] = useState(getNextSundayISO());
  const [time, setTime] = useState("9:15am");
  const [selectedTimeOption, setSelectedTimeOption] = useState("9:15am");
  const [location, setLocation] = useState("Mill Hill");
  const [format, setFormat] = useState<GameFormat>(DEFAULT_GAME_FORMAT);
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [customTime, setCustomTime] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasCompletedGameweek = activeGameweekStatus === "locked" || allowCompletedOverride;
  const previousOpenRequestKeyRef = useRef(openRequestKey);
  const orderedPlayers = useMemo(
    () =>
      [...players].sort((a, b) => {
        const aPinned = a.id === pinnedPlayerId;
        const bPinned = b.id === pinnedPlayerId;
        if (aPinned !== bPinned) return aPinned ? -1 : 1;
        const gamesPlayedDifference = (b.games_played ?? 0) - (a.games_played ?? 0);
        if (gamesPlayedDifference !== 0) return gamesPlayedDifference;
        return formatPlayerName(a).localeCompare(formatPlayerName(b));
      }),
    [players]
  );

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

  const openModal = () => {
    setMessage("");
    setDate(getNextSundayISO());
    setTime("9:15am");
    setSelectedTimeOption("9:15am");
    setCustomTime("");
    setLocation("Mill Hill");
    setFormat(DEFAULT_GAME_FORMAT);
    setSelectedPlayerIds([]);
    setIsOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsOpen(false);
  };

  useEffect(() => {
    if (openRequestKey === 0) {
      previousOpenRequestKeyRef.current = openRequestKey;
      return;
    }
    if (openRequestKey !== previousOpenRequestKeyRef.current) {
      const timeoutId = window.setTimeout(() => {
        openModal();
      }, 0);
      previousOpenRequestKeyRef.current = openRequestKey;
      return () => window.clearTimeout(timeoutId);
    }
    previousOpenRequestKeyRef.current = openRequestKey;
  }, [openRequestKey]);

  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId]
    );
  };

  const createGameweek = async () => {
    if (!organiserPin) return;
    if (!date) {
      setMessage("Date is required.");
      return;
    }
    if (selectedTimeOption === customTimeOption && !formatTimeFromInput(customTime)) {
      setMessage("Custom time is required.");
      return;
    }
    setMessage("");
    setIsSubmitting(true);
    const response = await fetch("/api/gameweeks/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        time,
        location,
        format,
        pin: organiserPin,
        playerIds: selectedPlayerIds,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setIsSubmitting(false);
      setMessage(data.error ?? "Failed to create gameweek.");
      return;
    }
    const createdGameweekId =
      typeof data?.id === "string" && data.id.trim().length > 0 ? data.id : "";
    if (createdGameweekId && onCreated) {
      let isVisible = false;
      for (let attempt = 0; attempt < 12; attempt += 1) {
        // Wait until the page data includes the newly created open gameweek.
        isVisible = await onCreated(createdGameweekId);
        if (isVisible) break;
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
    }
    setIsOpen(false);
    setIsSubmitting(false);
    router.refresh();
  };

  if (!isUnlocked || !hasCompletedGameweek) return null;

  return (
    <>
      {showTrigger ? (
        <div className="w-full">
          <button
            type="button"
            onClick={openModal}
            className="ui-btn ui-btn-primary w-full"
          >
            {buttonLabel}
          </button>
        </div>
      ) : null}
      {/* Panel height matches the overlay's usable space exactly (pt-8 + pb-6 =
          3.5rem), so it is as tall as possible without overflowing the overlay. */}
      <Modal
        isOpen={isOpen}
        title="Create new game"
        onClose={closeModal}
        position="top"
        contentScrollable={false}
        topOffsetClassName="pt-8"
        panelMaxHeightClassName="max-h-[calc(100dvh-3.5rem)]"
        panelClassName="h-[calc(100dvh-3.5rem)]"
      >
        <div className="relative flex h-full min-h-0 flex-col">
          {isSubmitting ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[8px] bg-white/88 text-center backdrop-blur-[2px]">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-dark)]">
                  Creating game
                </p>
              </div>
            </div>
          ) : null}
          <div
            aria-hidden={isSubmitting}
            className={`${isSubmitting ? "pointer-events-none opacity-40" : ""} flex min-h-0 flex-1 flex-col`}
          >
            <div className="shrink-0 space-y-3">
              <div className={fieldRowClass}>
                <label className="ui-label">Date</label>
                {/* Native date inputs render their own locale text, so the real
                    input sits transparent on top of our formatted display. */}
                <div className="relative">
                  <input
                    type="date"
                    aria-label="Date"
                    value={date}
                    onChange={(event) => {
                      setDate(event.target.value);
                    }}
                    onClick={(event) => {
                      // Desktop browsers only open the picker from the calendar
                      // icon; this makes the whole row a hit target.
                      try {
                        event.currentTarget.showPicker?.();
                      } catch {
                        // Picker unsupported - the native input still works.
                      }
                    }}
                    className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                  <div
                    aria-hidden="true"
                    className="ui-input pointer-events-none py-2 peer-focus-visible:border-[var(--color-primary-dark)]"
                  >
                    {formatFullDayDate(date) || "Select a date"}
                  </div>
                </div>
              </div>
              <div className={fieldRowClass}>
                <label className="ui-label">Time</label>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {quickPickTimes.map((option) => {
                    const isSelected = selectedTimeOption === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setSelectedTimeOption(option);
                          if (option === customTimeOption) return;
                          setTime(option);
                          setCustomTime("");
                        }}
                        className={`ui-chip w-full justify-center py-1.5 ${
                          isSelected ? "ui-chip-active" : ""
                        }`}
                        aria-pressed={isSelected}
                      >
                        {timeOptionLabels[option] ?? option}
                      </button>
                    );
                  })}
                </div>
              </div>
              {selectedTimeOption === customTimeOption ? (
                <div className={fieldRowClass}>
                  <label className="ui-label">Custom</label>
                  <input
                    type="time"
                    value={customTime}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setCustomTime(nextValue);
                      const formatted = formatTimeFromInput(nextValue);
                      if (formatted) setTime(formatted);
                    }}
                    className="ui-input py-2"
                  />
                </div>
              ) : null}
              <div className={fieldRowClass}>
                <label className="ui-label">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className="ui-input py-2"
                />
              </div>
            </div>
            <div className="mt-5 flex min-h-0 flex-1 flex-col border-t border-[var(--color-border)] pt-5">
              {/* 1fr_auto_1fr keeps the toggle on the exact centre line, independent
                  of the spaces label's width. */}
              <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center">
                <span aria-hidden="true" />
                <div
                  role="group"
                  aria-label="Game format"
                  className="flex rounded-full border border-[var(--color-border)] bg-[#fbfcfc] p-0.5"
                >
                  {formatOptions.map((option) => {
                    const isSelected = format === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setFormat(option)}
                        aria-pressed={isSelected}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                          isSelected
                            ? "bg-[var(--color-primary-dark)] text-white"
                            : "text-[var(--color-text-secondary)]"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
                <span className="justify-self-start pl-2 text-xs text-[var(--color-text-secondary)]">
                  {capacityForFormat(format)} spaces
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="ui-label m-0">Add players</span>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {selectedPlayerIds.length} selected
                </span>
              </div>
              {players.length > 0 ? (
                <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain rounded-[8px] border border-[var(--color-border)] p-2">
                  {orderedPlayers.map((player) => {
                    const checked = selectedPlayerIds.includes(player.id);
                    const gamesPlayed = player.games_played ?? 0;
                    return (
                      <label
                        key={player.id}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-[8px] px-2 py-2 text-sm text-[var(--color-text)] hover:bg-[rgba(15,61,52,0.04)]"
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--color-primary-dark)] ${
                              checked
                                ? "border-[var(--color-primary-dark)] bg-[var(--color-primary-dark)]"
                                : "border-[var(--color-border-strong)] bg-white"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePlayer(player.id)}
                              className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-full opacity-0"
                            />
                            <span
                              className={`h-2 w-2 rounded-full bg-white ${checked ? "opacity-100" : "opacity-0"}`}
                            />
                          </span>
                          <span>{formatPlayerName(player)}</span>
                        </span>
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          {gamesPlayed} GP
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  No active players available to prefill.
                </p>
              )}
            </div>
            <div className="mt-5 shrink-0 space-y-3">
              <button
                type="button"
                onClick={createGameweek}
                disabled={isSubmitting}
                className="ui-btn ui-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Creating..." : "Create game"}
              </button>
              {message ? (
                <p className="ui-banner ui-banner-danger">{message}</p>
              ) : null}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

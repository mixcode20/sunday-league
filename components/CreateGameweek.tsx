"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getNextSundayISO } from "@/lib/utils";
import { useOrganiserMode } from "@/components/OrganiserModeProvider";
import Modal from "@/components/Modal";
import type { GameweekStatus, Player } from "@/lib/types";
import { formatPlayerName } from "@/lib/utils";

type CreateGameweekProps = {
  activeGameweekStatus?: GameweekStatus | null;
  players?: Player[];
  onCreated?: (gameweekId: string) => Promise<boolean> | boolean;
  buttonLabel?: string;
};

export default function CreateGameweek({
  activeGameweekStatus = null,
  players = [],
  onCreated,
  buttonLabel = "Create new game",
}: CreateGameweekProps) {
  const pinnedPlayerId = "541f87de-b74d-43da-b97b-97d688968fb5";
  const customTimeOption = "custom";
  const presetTimes = ["9:15am", "9:30am"];
  const quickPickTimes = [...presetTimes, customTimeOption];
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
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [customTime, setCustomTime] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasCompletedGameweek = activeGameweekStatus === "locked";
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
    setSelectedPlayerIds([]);
    setIsOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsOpen(false);
  };

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
      <div className="w-full">
        <button
          type="button"
          onClick={openModal}
          className="ui-btn ui-btn-primary w-full"
        >
          {buttonLabel}
        </button>
      </div>
      <Modal
        isOpen={isOpen}
        title="Create new game"
        onClose={closeModal}
        position="top"
        contentScrollable={false}
        topOffsetClassName="pt-[60px]"
        panelClassName="h-[85vh]"
      >
        <div className="relative flex h-full min-h-0 flex-col">
          {isSubmitting ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[1rem] bg-white/88 text-center backdrop-blur-[2px]">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-dark)]">
                  Creating game
                </p>
              </div>
            </div>
          ) : null}
          <div
            aria-hidden={isSubmitting}
            className={`${isSubmitting ? "pointer-events-none opacity-40" : ""} flex min-h-0 flex-1 flex-col space-y-5`}
          >
            <div>
              <label className="ui-label">Date</label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="ui-input mt-2"
              />
            </div>
            <div>
              <label className="ui-label">Time</label>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
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
                      className={`ui-chip w-full justify-center ${
                        isSelected
                          ? "ui-chip-active"
                          : ""
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
              <div>
                <label className="ui-label">Custom time</label>
                <input
                  type="time"
                  value={customTime}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setCustomTime(nextValue);
                    const formatted = formatTimeFromInput(nextValue);
                    if (formatted) setTime(formatted);
                  }}
                  className="ui-input mt-2"
                />
              </div>
            ) : null}
            <div>
              <label className="ui-label">Location</label>
              <input
                type="text"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="ui-input mt-2"
              />
            </div>
            <div className="flex min-h-0 flex-1 flex-col border-t border-[var(--color-border)] pt-5">
              <div className="flex items-center justify-between gap-3">
                <span className="ui-label m-0">
                  Add confirmed players
                </span>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {selectedPlayerIds.length} selected
                </span>
              </div>
              {players.length > 0 ? (
                <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl border border-[var(--color-border)] p-2">
                  {orderedPlayers.map((player) => {
                    const checked = selectedPlayerIds.includes(player.id);
                    const gamesPlayed = player.games_played ?? 0;
                    return (
                      <label
                        key={player.id}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm text-[var(--color-text)] hover:bg-[rgba(15,61,52,0.04)]"
                      >
                        <span className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePlayer(player.id)}
                            className="peer sr-only"
                          />
                          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--color-border-strong)] bg-white peer-checked:border-[var(--color-primary-dark)] peer-checked:bg-[var(--color-primary-dark)]">
                            <span className="h-2 w-2 rounded-full bg-white opacity-0 peer-checked:opacity-100" />
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
      </Modal>
    </>
  );
}

"use client";

import { useMemo } from "react";
import { MAIN_SLOT_CAPACITY } from "@/lib/slots";
import type { GameweekPlayer } from "@/lib/types";
import { formatGameweekDate, formatPlayerName } from "@/lib/utils";
import { useOrganiserMode } from "@/components/OrganiserModeProvider";
import WhatsAppIcon from "@/components/WhatsAppIcon";

type ShareGameButtonProps = {
  gameweekId: string;
  gameDate: string;
  time?: string | null;
  location?: string | null;
  entries?: GameweekPlayer[];
};

export default function ShareGameButton({
  gameweekId,
  gameDate,
  time,
  location,
  entries = [],
}: ShareGameButtonProps) {
  const { isUnlocked } = useOrganiserMode();

  const shareText = useMemo(() => {
    if (typeof window === "undefined") return "";
    const origin = window.location.origin;
    const displayLocation =
      location === "MH" || !location ? "Mill Hill" : location;
    const gameUrl = `${origin}/`;
    const sortedEntries = [...entries].sort((left, right) => left.position - right.position);
    const playerLines = sortedEntries.map((entry) => {
      const name = formatPlayerName(entry.players) || "Unknown player";
      return entry.position > MAIN_SLOT_CAPACITY ? `${name} (sub)` : name;
    });
    const spacesLeft = Math.max(
      MAIN_SLOT_CAPACITY -
        sortedEntries.filter((entry) => entry.position <= MAIN_SLOT_CAPACITY).length,
      0
    );

    return [
      `Game is live for ${formatGameweekDate(gameDate)}`,
      "",
      `Join here: ${gameUrl}`,
      "",
      `Kick-off: ${time ?? "9:15am"}`,
      `Location: ${displayLocation}`,
      "",
      "Players already in:",
      ...(playerLines.length > 0 ? playerLines : ["None yet"]),
      "",
      `${spacesLeft} spaces left`,
    ].join("\n");
  }, [entries, gameDate, location, time]);

  const nudgeText = useMemo(() => {
    const mainEntries = entries.filter(
      (entry) => entry.position <= MAIN_SLOT_CAPACITY
    ).length;
    const spacesLeft = Math.max(MAIN_SLOT_CAPACITY - mainEntries, 0);
    const spacesLabel = spacesLeft === 1 ? "space" : "spaces";

    return [
      `Still ${spacesLeft} ${spacesLabel} for this game`,
      formatGameweekDate(gameDate),
    ].join("\n\n");
  }, [entries, gameDate]);

  if (!isUnlocked || !gameweekId) return null;

  const shareMessage = async (text: string) => {
    if (!text) return;

    try {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      const popup = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      if (popup) return;
    } catch {
      // Fall back to copying the share text below.
    }

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Ignore failures here; the share button should not surface a warning state.
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void shareMessage(shareText)}
        className="ui-btn ui-btn-primary inline-flex w-full items-center justify-center gap-2"
      >
        <WhatsAppIcon tone="light" />
        Share to WhatsApp
      </button>
      <button
        type="button"
        onClick={() => void shareMessage(nudgeText)}
        className="ui-btn ui-btn-secondary inline-flex w-full items-center justify-center gap-2"
      >
        <WhatsAppIcon tone="brand" />
        Nudge group
      </button>
    </div>
  );
}

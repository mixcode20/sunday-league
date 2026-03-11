"use client";

import { useMemo, useState } from "react";
import { MAIN_SLOT_CAPACITY } from "@/lib/slots";
import type { GameweekPlayer } from "@/lib/types";
import { formatGameweekDate, formatPlayerName } from "@/lib/utils";
import { useOrganiserMode } from "@/components/OrganiserModeProvider";

type ShareGameButtonProps = {
  gameweekId: string;
  gameDate: string;
  time?: string | null;
  location?: string | null;
  entries?: GameweekPlayer[];
};

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4 fill-current"
    >
      <path d="M18 16.08c-.76 0-1.44.3-1.96.77l-7.13-4.15a3.3 3.3 0 0 0 0-1.4l7.12-4.15A2.99 2.99 0 1 0 15 5a3 3 0 0 0 .05.54L7.93 9.7a3 3 0 1 0 0 4.6l7.12 4.16A3 3 0 1 0 18 16.08Z" />
    </svg>
  );
}

export default function ShareGameButton({
  gameweekId,
  gameDate,
  time,
  location,
  entries = [],
}: ShareGameButtonProps) {
  const { isUnlocked } = useOrganiserMode();
  const [message, setMessage] = useState("");

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

  if (!isUnlocked || !gameweekId) return null;

  const handleShare = async () => {
    if (!shareText) return;

    setMessage("");

    try {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      const popup = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      if (popup) return;
    } catch {
      // Fall back to copying the share text below.
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setMessage("WhatsApp could not be opened. The message was copied instead.");
    } catch {
      setMessage("Failed to open WhatsApp.");
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleShare}
        className="ui-btn ui-btn-primary inline-flex w-full items-center justify-center gap-2"
      >
        <ShareIcon />
        Share to WhatsApp
      </button>
      {message ? (
        <p className="ui-banner ui-banner-warning">{message}</p>
      ) : null}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { useOrganiserMode } from "@/components/OrganiserModeProvider";
import { formatGameweekDate } from "@/lib/utils";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import type { GameweekStatus } from "@/lib/types";

type CollectPotmVotesButtonProps = {
  gameweekId: string;
  gameDate: string;
  status?: GameweekStatus | null;
};

export default function CollectPotmVotesButton({
  gameweekId,
  gameDate,
  status,
}: CollectPotmVotesButtonProps) {
  const { isUnlocked } = useOrganiserMode();

  const shareText = useMemo(() => {
    if (typeof window === "undefined") return "";
    const origin = window.location.origin;
    const voteUrl = `${origin}/vote/${gameweekId}`;
    return [`Vote for your Player of the Match — ${formatGameweekDate(gameDate)}`, "", voteUrl].join(
      "\n"
    );
  }, [gameweekId, gameDate]);

  if (!isUnlocked || status !== "locked" || !gameweekId) return null;

  const shareMessage = async () => {
    if (!shareText) return;

    try {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      const popup = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      if (popup) return;
    } catch {
      // Fall back to copying the share text below.
    }

    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      // Ignore failures here; the share button should not surface a warning state.
    }
  };

  return (
    <button
      type="button"
      onClick={() => void shareMessage()}
      className="ui-btn ui-btn-primary inline-flex w-full items-center justify-center gap-2"
    >
      <WhatsAppIcon tone="light" />
      Collect MOTM votes
    </button>
  );
}

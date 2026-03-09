export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const getOrdinalSuffix = (day: number) => {
  if (day % 100 >= 11 && day % 100 <= 13) {
    return "th";
  }
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

export const formatGameweekDate = (dateString: string) => {
  const date = new Date(dateString);
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  return `${weekday}, ${month} ${day}${getOrdinalSuffix(day)}`;
};

export const getNextSundayISO = () => {
  const today = new Date();
  const day = today.getDay();
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + daysUntilSunday);
  return nextSunday.toISOString().slice(0, 10);
};

export const normalizePlayerJoin = <T extends { players: any }>(entry: T) => {
  const player = Array.isArray(entry.players) ? entry.players[0] : entry.players;
  return {
    ...entry,
    players: player,
    remove_requested: (entry as { remove_requested?: boolean }).remove_requested ?? false,
  };
};

export const parseGameTime = (timeString: string) => {
  const normalized = timeString.trim().toLowerCase();
  if (!normalized) return null;
  const ampmMatch = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (ampmMatch) {
    const hours = Number(ampmMatch[1]);
    const minutes = ampmMatch[2] ? Number(ampmMatch[2]) : 0;
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
    let adjustedHours = hours % 12;
    if (ampmMatch[3] === "pm") {
      adjustedHours += 12;
    }
    return { hours: adjustedHours, minutes };
  }
  const twentyFourMatch = normalized.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (twentyFourMatch) {
    const hours = Number(twentyFourMatch[1]);
    const minutes = twentyFourMatch[2] ? Number(twentyFourMatch[2]) : 0;
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return { hours, minutes };
  }
  return null;
};

export const getGameweekDateTime = (dateString: string, timeString?: string | null) => {
  if (!dateString) return null;
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const parsed = parseGameTime(timeString ?? "9:15am");
  if (!parsed) return null;
  date.setHours(parsed.hours, parsed.minutes, 0, 0);
  return date;
};

export const deriveWinnerFromScores = (
  darksScore: number | null,
  whitesScore: number | null
) => {
  if (typeof darksScore !== "number" || typeof whitesScore !== "number") {
    return null;
  }
  if (darksScore === whitesScore) return "draw" as const;
  return darksScore > whitesScore ? ("darks" as const) : ("whites" as const);
};

export const getGameweekWinner = (gameweek: {
  winner?: "darks" | "whites" | "draw" | null;
  darks_score: number | null;
  whites_score: number | null;
}) => {
  if (
    gameweek.winner === "darks" ||
    gameweek.winner === "whites" ||
    gameweek.winner === "draw"
  ) {
    return gameweek.winner;
  }
  return deriveWinnerFromScores(gameweek.darks_score, gameweek.whites_score);
};

export const getGameweekGoals = (
  gameweek: {
    darks_score: number | null;
    whites_score: number | null;
  },
  team: "darks" | "whites"
): { goalsFor: number; goalsAgainst: number } => {
  if (gameweek.darks_score === null || gameweek.whites_score === null) {
    return { goalsFor: 0, goalsAgainst: 0 };
  }

  const darksScore = gameweek.darks_score;
  const whitesScore = gameweek.whites_score;

  if (team === "darks") {
    return {
      goalsFor: darksScore,
      goalsAgainst: whitesScore,
    };
  }

  return {
    goalsFor: whitesScore,
    goalsAgainst: darksScore,
  };
};

export const winnerLabel = (winner: "darks" | "whites" | "draw" | null) => {
  if (winner === "darks") return "Darks won";
  if (winner === "whites") return "Whites won";
  if (winner === "draw") return "Draw";
  return "Result pending";
};

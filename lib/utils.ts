export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
  return { ...entry, players: player };
};

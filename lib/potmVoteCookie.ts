const COOKIE_NAME = "potmVotes";
const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
const STORAGE_KEY = "potmVotes";

export type PotmVoteRecord = {
  voterPlayerId: string;
  votedPlayerId: string;
  votedAt: number;
};

export type PotmVoteMap = Record<string, PotmVoteRecord>;

const isValidRecord = (value: unknown): value is PotmVoteRecord => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PotmVoteRecord>;
  return (
    typeof candidate.voterPlayerId === "string" &&
    candidate.voterPlayerId.length > 0 &&
    typeof candidate.votedPlayerId === "string" &&
    candidate.votedPlayerId.length > 0 &&
    typeof candidate.votedAt === "number" &&
    Number.isFinite(candidate.votedAt)
  );
};

export const getPotmVoteCookieName = () => COOKIE_NAME;

export const getPotmVoteCookieMaxAgeSeconds = () => COOKIE_MAX_AGE_SECONDS;

export const getPotmVoteStorageKey = () => STORAGE_KEY;

export const parsePotmVoteCookie = (rawValue?: string | null): PotmVoteMap => {
  if (!rawValue) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(rawValue)) as Record<string, unknown>;
    const next: PotmVoteMap = {};
    Object.entries(parsed).forEach(([gameweekId, record]) => {
      if (typeof gameweekId === "string" && gameweekId.length > 0 && isValidRecord(record)) {
        next[gameweekId] = record;
      }
    });
    return next;
  } catch {
    return {};
  }
};

export const serializePotmVoteCookie = (value: PotmVoteMap) =>
  encodeURIComponent(JSON.stringify(value));

export const mergePotmVoteMaps = (...values: PotmVoteMap[]): PotmVoteMap => {
  const next: PotmVoteMap = {};
  values.forEach((value) => {
    Object.entries(value).forEach(([gameweekId, record]) => {
      const existing = next[gameweekId];
      if (!existing || record.votedAt > existing.votedAt) {
        next[gameweekId] = record;
      }
    });
  });
  return next;
};

export const getPotmVoteRecord = (current: PotmVoteMap, gameweekId: string) =>
  current[gameweekId] ?? null;

export const setPotmVoteRecord = (
  current: PotmVoteMap,
  gameweekId: string,
  record: PotmVoteRecord
): PotmVoteMap => ({
  ...current,
  [gameweekId]: record,
});

export const removePotmVoteRecord = (current: PotmVoteMap, gameweekId: string): PotmVoteMap => {
  if (!(gameweekId in current)) return current;
  const next = { ...current };
  delete next[gameweekId];
  return next;
};

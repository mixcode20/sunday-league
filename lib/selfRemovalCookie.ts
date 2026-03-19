const COOKIE_NAME = "selfRemovalAccess";
const COOKIE_MAX_AGE_SECONDS = 8 * 24 * 60 * 60;
const STORAGE_KEY = "selfRemovalAccess";

export type SelfRemovalGrant = {
  playerIds: string[];
  joinedAtByPlayer?: Record<string, number>;
  expiresAt: number;
};

export type SelfRemovalGrantMap = Record<string, SelfRemovalGrant>;

const isValidGrant = (value: unknown): value is SelfRemovalGrant => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SelfRemovalGrant>;
  return (
    Array.isArray(candidate.playerIds) &&
    candidate.playerIds.length > 0 &&
    candidate.playerIds.every((playerId) => typeof playerId === "string" && playerId.length > 0) &&
    (candidate.joinedAtByPlayer === undefined ||
      (candidate.joinedAtByPlayer !== null &&
        typeof candidate.joinedAtByPlayer === "object" &&
        Object.entries(candidate.joinedAtByPlayer).every(
          ([playerId, joinedAt]) =>
            typeof playerId === "string" &&
            playerId.length > 0 &&
            typeof joinedAt === "number" &&
            Number.isFinite(joinedAt)
        ))) &&
    typeof candidate.expiresAt === "number" &&
    Number.isFinite(candidate.expiresAt)
  );
};

export const getSelfRemovalCookieName = () => COOKIE_NAME;

export const getSelfRemovalCookieMaxAgeSeconds = () => COOKIE_MAX_AGE_SECONDS;

export const getSelfRemovalStorageKey = () => STORAGE_KEY;

export const parseSelfRemovalCookie = (
  rawValue?: string | null,
  now = Date.now()
): SelfRemovalGrantMap => {
  if (!rawValue) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(rawValue)) as Record<string, unknown>;
    const next: SelfRemovalGrantMap = {};
    Object.entries(parsed).forEach(([gameweekId, grant]) => {
      if (
        typeof gameweekId === "string" &&
        gameweekId.length > 0 &&
        isValidGrant(grant) &&
        grant.expiresAt > now
      ) {
        next[gameweekId] = grant;
      }
    });
    return next;
  } catch {
    return {};
  }
};

export const serializeSelfRemovalCookie = (value: SelfRemovalGrantMap) =>
  encodeURIComponent(JSON.stringify(value));

export const mergeSelfRemovalAccess = (
  ...values: SelfRemovalGrantMap[]
): SelfRemovalGrantMap => {
  const next: SelfRemovalGrantMap = {};
  values.forEach((value) => {
    Object.entries(value).forEach(([gameweekId, grant]) => {
      const existing = next[gameweekId];
      if (!existing) {
        next[gameweekId] = {
          playerIds: [...grant.playerIds],
          joinedAtByPlayer: grant.joinedAtByPlayer
            ? { ...grant.joinedAtByPlayer }
            : undefined,
          expiresAt: grant.expiresAt,
        };
        return;
      }

      const playerIds = Array.from(new Set([...existing.playerIds, ...grant.playerIds]));
      const joinedAtByPlayer = {
        ...(existing.joinedAtByPlayer ?? {}),
        ...(grant.joinedAtByPlayer ?? {}),
      };

      next[gameweekId] = {
        playerIds,
        joinedAtByPlayer:
          Object.keys(joinedAtByPlayer).length > 0 ? joinedAtByPlayer : undefined,
        expiresAt: Math.max(existing.expiresAt, grant.expiresAt),
      };
    });
  });

  return next;
};

export const grantSelfRemovalAccess = (
  current: SelfRemovalGrantMap,
  gameweekId: string,
  playerId: string,
  now = Date.now()
): SelfRemovalGrantMap => {
  const existing = current[gameweekId];
  const playerIds = existing?.playerIds ?? [];
  const joinedAtByPlayer = {
    ...(existing?.joinedAtByPlayer ?? {}),
    [playerId]: now,
  };
  return {
    ...current,
    [gameweekId]: {
      playerIds: playerIds.includes(playerId) ? playerIds : [...playerIds, playerId],
      joinedAtByPlayer,
      expiresAt: now + COOKIE_MAX_AGE_SECONDS * 1000,
    },
  };
};

export const revokeSelfRemovalAccess = (
  current: SelfRemovalGrantMap,
  gameweekId: string,
  playerId?: string
): SelfRemovalGrantMap => {
  const existing = current[gameweekId];
  if (!existing) return current;
  if (!playerId) {
    const next = { ...current };
    delete next[gameweekId];
    return next;
  }
  if (!existing.playerIds.includes(playerId)) return current;
  const nextPlayerIds = existing.playerIds.filter((candidate) => candidate !== playerId);
  const nextJoinedAtByPlayer = { ...(existing.joinedAtByPlayer ?? {}) };
  delete nextJoinedAtByPlayer[playerId];
  const next = { ...current };
  if (nextPlayerIds.length === 0) {
    delete next[gameweekId];
  } else {
    next[gameweekId] = {
      ...existing,
      playerIds: nextPlayerIds,
      joinedAtByPlayer: nextJoinedAtByPlayer,
    };
  }
  return next;
};

export const hasSelfRemovalAccess = (
  current: SelfRemovalGrantMap,
  gameweekId: string,
  playerId: string
) => current[gameweekId]?.playerIds.includes(playerId) ?? false;

export const getSelfRemovalJoinedAt = (
  current: SelfRemovalGrantMap,
  gameweekId: string,
  playerId: string
) => current[gameweekId]?.joinedAtByPlayer?.[playerId] ?? null;

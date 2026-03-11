const COOKIE_NAME = "selfRemovalAccess";
const COOKIE_MAX_AGE_SECONDS = 20 * 24 * 60 * 60;

export type SelfRemovalGrant = {
  playerId: string;
  expiresAt: number;
};

export type SelfRemovalGrantMap = Record<string, SelfRemovalGrant>;

const isValidGrant = (value: unknown): value is SelfRemovalGrant => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SelfRemovalGrant>;
  return (
    typeof candidate.playerId === "string" &&
    candidate.playerId.length > 0 &&
    typeof candidate.expiresAt === "number" &&
    Number.isFinite(candidate.expiresAt)
  );
};

export const getSelfRemovalCookieName = () => COOKIE_NAME;

export const getSelfRemovalCookieMaxAgeSeconds = () => COOKIE_MAX_AGE_SECONDS;

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

export const grantSelfRemovalAccess = (
  current: SelfRemovalGrantMap,
  gameweekId: string,
  playerId: string,
  now = Date.now()
): SelfRemovalGrantMap => ({
  ...current,
  [gameweekId]: {
    playerId,
    expiresAt: now + COOKIE_MAX_AGE_SECONDS * 1000,
  },
});

export const revokeSelfRemovalAccess = (
  current: SelfRemovalGrantMap,
  gameweekId: string,
  playerId?: string
): SelfRemovalGrantMap => {
  const existing = current[gameweekId];
  if (!existing) return current;
  if (playerId && existing.playerId !== playerId) return current;
  const next = { ...current };
  delete next[gameweekId];
  return next;
};

export const getGrantedPlayerId = (
  current: SelfRemovalGrantMap,
  gameweekId: string
) => current[gameweekId]?.playerId ?? null;

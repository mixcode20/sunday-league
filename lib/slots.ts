import type { GameweekPlayer } from "@/lib/types";

export type GameFormat = "7s" | "5s";

export const DEFAULT_GAME_FORMAT: GameFormat = "7s";

/** Main slots per format: 7-a-side fields 14, 5-a-side fields 10. */
export const FORMAT_MAIN_SLOT_CAPACITY: Record<GameFormat, number> = {
  "7s": 14,
  "5s": 10,
};

/** Capacity for the default (7s) format. Fallback when a gameweek has no format set. */
export const MAIN_SLOT_CAPACITY = FORMAT_MAIN_SLOT_CAPACITY[DEFAULT_GAME_FORMAT];

export const parseGameFormat = (value: unknown): GameFormat =>
  value === "5s" ? "5s" : DEFAULT_GAME_FORMAT;

export const capacityForFormat = (value: unknown): number =>
  FORMAT_MAIN_SLOT_CAPACITY[parseGameFormat(value)];

export const formatLabel = (value: unknown): string =>
  parseGameFormat(value) === "5s" ? "5-a-side" : "7-a-side";

export const buildEntryPositionMap = (
  entries: GameweekPlayer[]
): {
  positionMap: Record<number, GameweekPlayer>;
  diagnostics: {
    invalidEntries: GameweekPlayer[];
    duplicatePositions: number[];
  };
} => {
  const positionMap: Record<number, GameweekPlayer> = {};
  const invalidEntries: GameweekPlayer[] = [];
  const duplicatePositions: number[] = [];
  const duplicateSet = new Set<number>();

  entries.forEach((entry) => {
    const position = entry.position;
    if (typeof position !== "number" || Number.isNaN(position) || position < 1) {
      invalidEntries.push(entry);
      return;
    }
    if (positionMap[position]) {
      if (!duplicateSet.has(position)) {
        duplicatePositions.push(position);
        duplicateSet.add(position);
      }
      return;
    }
    positionMap[position] = entry;
  });

  return { positionMap, diagnostics: { invalidEntries, duplicatePositions } };
};

export const getSlotCounts = (
  positionMap: Record<number, GameweekPlayer>,
  capacity: number = MAIN_SLOT_CAPACITY
) => {
  let main = 0;
  let subs = 0;
  Object.keys(positionMap).forEach((key) => {
    const position = Number(key);
    if (position >= 1 && position <= capacity) {
      main += 1;
    } else if (position > capacity) {
      subs += 1;
    }
  });
  return { main, subs };
};

export const getSubSlotPositions = (
  positionMap: Record<number, GameweekPlayer>,
  capacity: number = MAIN_SLOT_CAPACITY
) => {
  const startPosition = capacity + 1;
  const subPositions = Object.keys(positionMap)
    .map(Number)
    .filter((position) => position > capacity);
  const maxSubPosition =
    subPositions.length > 0 ? Math.max(...subPositions) : startPosition;
  let hasGap = false;
  for (let position = startPosition; position <= maxSubPosition; position += 1) {
    if (!positionMap[position]) {
      hasGap = true;
      break;
    }
  }
  const endPosition = hasGap ? maxSubPosition : maxSubPosition + 1;
  return Array.from(
    { length: endPosition - startPosition + 1 },
    (_, index) => startPosition + index
  );
};

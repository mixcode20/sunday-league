import type { GameweekPlayer } from "@/lib/types";

export const MAIN_SLOT_CAPACITY = 14;

type SlotDiagnostics = {
  invalidEntries: GameweekPlayer[];
  duplicatePositions: number[];
};

export const buildEntryPositionMap = (entries: GameweekPlayer[]) => {
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

export const getSlotCounts = (positionMap: Record<number, GameweekPlayer>) => {
  let main = 0;
  let subs = 0;
  Object.keys(positionMap).forEach((key) => {
    const position = Number(key);
    if (position >= 1 && position <= MAIN_SLOT_CAPACITY) {
      main += 1;
    } else if (position > MAIN_SLOT_CAPACITY) {
      subs += 1;
    }
  });
  return { main, subs };
};

export const getSubSlotPositions = (positionMap: Record<number, GameweekPlayer>) => {
  const startPosition = MAIN_SLOT_CAPACITY + 1;
  const subPositions = Object.keys(positionMap)
    .map(Number)
    .filter((position) => position > MAIN_SLOT_CAPACITY);
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

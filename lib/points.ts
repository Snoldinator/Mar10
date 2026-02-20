const POINTS_TABLE: Record<number, number> = {
  1: 15,
  2: 12,
  3: 10,
  4: 8,
  5: 7,
  6: 6,
  7: 5,
  8: 4,
  9: 3,
  10: 2,
  11: 1,
  12: 0,
};

export function getPoints(position: number): number {
  return POINTS_TABLE[position] ?? 0;
}

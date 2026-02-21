export interface TrackInfo {
  name: string;
  cup: string;
}

export const TRACKS: TrackInfo[] = [
  // Mushroom Cup
  { name: "Mario Bros. Circuit", cup: "Mushroom Cup" },
  { name: "Crown City", cup: "Mushroom Cup" },
  { name: "Whistlestop Summit", cup: "Mushroom Cup" },
  { name: "DK Spaceport", cup: "Mushroom Cup" },
  // Flower Cup
  { name: "Desert Hills", cup: "Flower Cup" },
  { name: "Shy Guy Bazaar", cup: "Flower Cup" },
  { name: "Wario Stadium", cup: "Flower Cup" },
  { name: "Airship Fortress", cup: "Flower Cup" },
  // Star Cup
  { name: "DK Pass", cup: "Star Cup" },
  { name: "Starview Peak", cup: "Star Cup" },
  { name: "Sky-High Sundae", cup: "Star Cup" },
  { name: "Wario's Galleon", cup: "Star Cup" },
  // Shell Cup
  { name: "Koopa Troopa Beach", cup: "Shell Cup" },
  { name: "Faraway Oasis", cup: "Shell Cup" },
  { name: "Peach Stadium", cup: "Shell Cup" },
  // Banana Cup
  { name: "Peach Beach", cup: "Banana Cup" },
  { name: "Salty Salty Speedway", cup: "Banana Cup" },
  { name: "Dino Dino Jungle", cup: "Banana Cup" },
  { name: "Great ? Block Ruins", cup: "Banana Cup" },
  // Leaf Cup
  { name: "Cheep Cheep Falls", cup: "Leaf Cup" },
  { name: "Dandelion Depths", cup: "Leaf Cup" },
  { name: "Boo Cinema", cup: "Leaf Cup" },
  { name: "Dry Bones Burnout", cup: "Leaf Cup" },
  // Lightning Cup
  { name: "Moo Moo Meadows", cup: "Lightning Cup" },
  { name: "Choco Mountain", cup: "Lightning Cup" },
  { name: "Toad's Factory", cup: "Lightning Cup" },
  { name: "Bowser's Castle", cup: "Lightning Cup" },
  // Special Cup
  { name: "Acorn Heights", cup: "Special Cup" },
  { name: "Mario Circuit", cup: "Special Cup" },
  { name: "Rainbow Road", cup: "Special Cup" },
];

/** Fisher-Yates shuffle */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Returns a list of randomly assigned tracks for n matchups.
 * Shuffles the full track list; cycles through if more matchups than tracks.
 */
export function assignTracks(n: number): TrackInfo[] {
  const pool = shuffle(TRACKS);
  return Array.from({ length: n }, (_, i) => pool[i % pool.length]);
}

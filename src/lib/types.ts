export type ScreenName = 'home' | 'game' | 'leaderboard';

export const TILE_TYPES = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'] as const;
export type TileType = (typeof TILE_TYPES)[number];

export interface GridPos {
  row: number;
  col: number;
}

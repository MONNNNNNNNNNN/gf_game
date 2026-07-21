import type { Grid, Cell } from './grid';
import type { GridPos, TileType } from '../lib/types';

export interface MatchResult {
  positions: GridPos[];
  tile: TileType;
}

function scanRuns(length: number, getCell: (i: number) => Cell): { start: number; length: number; tile: TileType }[] {
  const runs: { start: number; length: number; tile: TileType }[] = [];
  let i = 0;
  while (i < length) {
    const tile = getCell(i);
    if (tile === null) {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < length && getCell(j) === tile) j++;
    if (j - i >= 3) runs.push({ start: i, length: j - i, tile });
    i = j;
  }
  return runs;
}

export function findMatches(grid: Grid): MatchResult[] {
  const results: MatchResult[] = [];

  for (let row = 0; row < grid.height; row++) {
    for (const run of scanRuns(grid.width, (col) => grid.get(row, col))) {
      const positions: GridPos[] = [];
      for (let c = run.start; c < run.start + run.length; c++) positions.push({ row, col: c });
      results.push({ positions, tile: run.tile });
    }
  }

  for (let col = 0; col < grid.width; col++) {
    for (const run of scanRuns(grid.height, (row) => grid.get(row, col))) {
      const positions: GridPos[] = [];
      for (let r = run.start; r < run.start + run.length; r++) positions.push({ row: r, col });
      results.push({ positions, tile: run.tile });
    }
  }

  return results;
}

export function hasMatchAt(grid: Grid, pos: GridPos): boolean {
  const tile = grid.get(pos.row, pos.col);
  if (tile === null) return false;

  let count = 1;
  for (let c = pos.col - 1; c >= 0 && grid.get(pos.row, c) === tile; c--) count++;
  for (let c = pos.col + 1; c < grid.width && grid.get(pos.row, c) === tile; c++) count++;
  if (count >= 3) return true;

  count = 1;
  for (let r = pos.row - 1; r >= 0 && grid.get(r, pos.col) === tile; r--) count++;
  for (let r = pos.row + 1; r < grid.height && grid.get(r, pos.col) === tile; r++) count++;
  return count >= 3;
}

export function isValidSwap(grid: Grid, a: GridPos, b: GridPos): boolean {
  if (!grid.isAdjacent(a, b)) return false;
  grid.swap(a, b);
  const valid = hasMatchAt(grid, a) || hasMatchAt(grid, b);
  grid.swap(a, b);
  return valid;
}

export function hasAnyValidMove(grid: Grid): boolean {
  for (let row = 0; row < grid.height; row++) {
    for (let col = 0; col < grid.width; col++) {
      if (col + 1 < grid.width && isValidSwap(grid, { row, col }, { row, col: col + 1 })) return true;
      if (row + 1 < grid.height && isValidSwap(grid, { row, col }, { row: row + 1, col })) return true;
    }
  }
  return false;
}

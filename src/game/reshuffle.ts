import type { Grid } from './grid';
import { findMatches, hasAnyValidMove } from './matchLogic';

const MAX_SHUFFLE_ATTEMPTS = 50;

export function shuffleGrid(grid: Grid, rng: () => number = Math.random): void {
  let attempts = 0;
  do {
    fisherYatesShuffle(grid, rng);
    attempts++;
  } while ((findMatches(grid).length > 0 || !hasAnyValidMove(grid)) && attempts < MAX_SHUFFLE_ATTEMPTS);
}

function fisherYatesShuffle(grid: Grid, rng: () => number): void {
  const cells = grid.cells.slice();
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  grid.cells = cells;
}

import type { Grid } from './grid';
import { findMatches, hasAnyValidMove } from './matchLogic';
import { detectSquares } from './specialTiles';

const MAX_SHUFFLE_ATTEMPTS = 200;

export function shuffleGrid(grid: Grid, rng: () => number = Math.random): void {
  let attempts = 0;
  do {
    fisherYatesShuffle(grid, rng);
    attempts++;
  } while (
    (findMatches(grid).length > 0 || detectSquares(grid).length > 0 || !hasAnyValidMove(grid)) &&
    attempts < MAX_SHUFFLE_ATTEMPTS
  );
  // if we somehow exhausted attempts, the board may still hold a match/square - the
  // caller-side safety sweep in BoardScene.finishTurn resolves any leftovers, so this
  // can never strand un-clearable matches on a settled board
}

function fisherYatesShuffle(grid: Grid, rng: () => number): void {
  const cells = grid.cells.slice();
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  grid.cells = cells;
}

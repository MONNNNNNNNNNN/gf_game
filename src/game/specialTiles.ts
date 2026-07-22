import { Grid, isTileType, type SpecialKind } from './grid';
import type { MatchResult } from './matchLogic';
import type { GridPos, TileType } from '../lib/types';

export interface SpecialSpawn {
  pos: GridPos;
  kind: SpecialKind;
  baseTile: TileType;
}

export interface SpecialClassification {
  spawns: SpecialSpawn[];
  plainClearPositions: GridPos[];
}

export interface ActivatedTile {
  pos: GridPos;
  kind: SpecialKind;
}

function posKey(pos: GridPos): string {
  return `${pos.row},${pos.col}`;
}

export function detectSquares(grid: Grid): MatchResult[] {
  const results: MatchResult[] = [];
  for (let row = 0; row < grid.height - 1; row++) {
    for (let col = 0; col < grid.width - 1; col++) {
      const a = grid.get(row, col);
      const b = grid.get(row, col + 1);
      const c = grid.get(row + 1, col);
      const d = grid.get(row + 1, col + 1);
      if (isTileType(a) && a === b && a === c && a === d) {
        results.push({
          tile: a,
          positions: [
            { row, col },
            { row, col: col + 1 },
            { row: row + 1, col },
            { row: row + 1, col: col + 1 },
          ],
        });
      }
    }
  }
  return results;
}

function pickSpawnPos(match: MatchResult, swapTarget?: GridPos): GridPos {
  if (swapTarget && match.positions.some((p) => p.row === swapTarget.row && p.col === swapTarget.col)) {
    return swapTarget;
  }
  return match.positions[Math.floor(match.positions.length / 2)];
}

export function classifySpecialSpawns(
  matches: MatchResult[],
  squareMatches: MatchResult[],
  swapTarget?: GridPos,
  bombThreshold = 5,
): SpecialClassification {
  const claimed = new Set<string>();
  const spawns: SpecialSpawn[] = [];
  const plainClearPositions: GridPos[] = [];

  function claimPlain(pos: GridPos): void {
    const key = posKey(pos);
    if (claimed.has(key)) return;
    claimed.add(key);
    plainClearPositions.push(pos);
  }

  function tryClaimSpecial(match: MatchResult, kind: SpecialKind): boolean {
    const spawnPos = pickSpawnPos(match, swapTarget);
    const spawnKey = posKey(spawnPos);
    if (claimed.has(spawnKey)) return false;
    claimed.add(spawnKey);
    spawns.push({ pos: spawnPos, kind, baseTile: match.tile });
    for (const p of match.positions) {
      if (p.row !== spawnPos.row || p.col !== spawnPos.col) claimPlain(p);
    }
    return true;
  }

  for (const match of matches.filter((m) => m.positions.length >= bombThreshold)) {
    if (!tryClaimSpecial(match, 'bomb')) match.positions.forEach(claimPlain);
  }
  for (const match of squareMatches) {
    if (!tryClaimSpecial(match, 'butterfly')) match.positions.forEach(claimPlain);
  }
  for (const match of matches.filter((m) => m.positions.length === 4)) {
    const isRow = match.positions.every((p) => p.row === match.positions[0].row);
    if (!tryClaimSpecial(match, isRow ? 'lineRow' : 'lineCol')) match.positions.forEach(claimPlain);
  }
  for (const match of matches.filter((m) => m.positions.length === 3)) {
    match.positions.forEach(claimPlain);
  }

  return { spawns, plainClearPositions };
}

export function findBestComboTarget(grid: Grid, exclude: GridPos[] = []): GridPos | null {
  const counts = new Map<TileType, number>();
  for (const cell of grid.cells) {
    if (isTileType(cell)) counts.set(cell, (counts.get(cell) ?? 0) + 1);
  }
  if (counts.size === 0) return null;

  let bestColor: TileType | null = null;
  let bestCount = -1;
  for (const [color, count] of counts) {
    if (count > bestCount) {
      bestColor = color;
      bestCount = count;
    }
  }
  if (bestColor === null) return null;

  const centerRow = (grid.height - 1) / 2;
  const centerCol = (grid.width - 1) / 2;
  const excludedKeys = new Set(exclude.map(posKey));

  let best: GridPos | null = null;
  let bestDist = Infinity;
  for (let row = 0; row < grid.height; row++) {
    for (let col = 0; col < grid.width; col++) {
      if (grid.get(row, col) !== bestColor) continue;
      if (excludedKeys.has(posKey({ row, col }))) continue;
      const dist = Math.hypot(row - centerRow, col - centerCol);
      if (dist < bestDist) {
        bestDist = dist;
        best = { row, col };
      }
    }
  }
  return best;
}

function rowPositions(grid: Grid, row: number): GridPos[] {
  const positions: GridPos[] = [];
  for (let col = 0; col < grid.width; col++) positions.push({ row, col });
  return positions;
}

function colPositions(grid: Grid, col: number): GridPos[] {
  const positions: GridPos[] = [];
  for (let row = 0; row < grid.height; row++) positions.push({ row, col });
  return positions;
}

function squareAround(grid: Grid, center: GridPos, radius: number): GridPos[] {
  const positions: GridPos[] = [];
  for (let r = center.row - radius; r <= center.row + radius; r++) {
    for (let c = center.col - radius; c <= center.col + radius; c++) {
      if (r >= 0 && r < grid.height && c >= 0 && c < grid.width) positions.push({ row: r, col: c });
    }
  }
  return positions;
}

function dedupe(positions: GridPos[]): GridPos[] {
  const seen = new Set<string>();
  const result: GridPos[] = [];
  for (const p of positions) {
    const key = posKey(p);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(p);
    }
  }
  return result;
}

export function resolveSoloActivation(grid: Grid, tile: ActivatedTile, bombRadius = 1, butterflyExtraSnipes = 0): GridPos[] {
  switch (tile.kind) {
    case 'lineRow':
      return rowPositions(grid, tile.pos.row);
    case 'lineCol':
      return colPositions(grid, tile.pos.col);
    case 'bomb':
      return squareAround(grid, tile.pos, bombRadius);
    case 'butterfly': {
      const excluded = [tile.pos];
      for (let i = 0; i < 1 + butterflyExtraSnipes; i++) {
        const target = findBestComboTarget(grid, excluded);
        if (!target) break;
        excluded.push(target);
      }
      return dedupe(excluded);
    }
    default:
      return [tile.pos];
  }
}

export function resolveComboActivation(grid: Grid, a: ActivatedTile, b: ActivatedTile): GridPos[] {
  // both source tiles are always consumed by a combo, regardless of where its effect lands
  return dedupe([...resolveComboEffect(grid, a, b), a.pos, b.pos]);
}

function resolveComboEffect(grid: Grid, a: ActivatedTile, b: ActivatedTile): GridPos[] {
  const pairKey = [a.kind, b.kind].slice().sort().join('+');

  switch (pairKey) {
    case 'lineCol+lineRow': {
      const lineA = a.kind === 'lineRow' ? rowPositions(grid, a.pos.row) : colPositions(grid, a.pos.col);
      const lineB = b.kind === 'lineRow' ? rowPositions(grid, b.pos.row) : colPositions(grid, b.pos.col);
      return dedupe([...lineA, ...lineB]);
    }
    case 'lineRow+lineRow':
      return dedupe([
        ...rowPositions(grid, a.pos.row),
        ...rowPositions(grid, b.pos.row),
        ...colPositions(grid, a.pos.col),
        ...colPositions(grid, b.pos.col),
      ]);
    case 'lineCol+lineCol':
      return dedupe([
        ...colPositions(grid, a.pos.col),
        ...colPositions(grid, b.pos.col),
        ...rowPositions(grid, a.pos.row),
        ...rowPositions(grid, b.pos.row),
      ]);
    case 'bomb+bomb': {
      const center = { row: Math.round((a.pos.row + b.pos.row) / 2), col: Math.round((a.pos.col + b.pos.col) / 2) };
      return squareAround(grid, center, 2);
    }
    case 'bomb+lineCol':
    case 'bomb+lineRow': {
      const bombTile = a.kind === 'bomb' ? a : b;
      const lineTile = a.kind === 'bomb' ? b : a;
      const mainLine = lineTile.kind === 'lineRow' ? rowPositions(grid, lineTile.pos.row) : colPositions(grid, lineTile.pos.col);
      const extra: GridPos[] = [];
      if (lineTile.kind === 'lineRow') {
        if (lineTile.pos.row - 1 >= 0) extra.push(...rowPositions(grid, lineTile.pos.row - 1));
        if (lineTile.pos.row + 1 < grid.height) extra.push(...rowPositions(grid, lineTile.pos.row + 1));
      } else {
        if (lineTile.pos.col - 1 >= 0) extra.push(...colPositions(grid, lineTile.pos.col - 1));
        if (lineTile.pos.col + 1 < grid.width) extra.push(...colPositions(grid, lineTile.pos.col + 1));
      }
      return dedupe([...mainLine, ...extra, bombTile.pos]);
    }
    case 'bomb+butterfly': {
      const bombTile = a.kind === 'bomb' ? a : b;
      const target = findBestComboTarget(grid, [bombTile.pos]) ?? bombTile.pos;
      return dedupe([...squareAround(grid, target, 1), bombTile.pos]);
    }
    case 'butterfly+lineCol':
    case 'butterfly+lineRow': {
      // proposed fill-in (not specified by the request): line + butterfly upgrades the
      // butterfly's single-tile snipe into a full line at the best-combo-target position
      const lineTile = a.kind === 'lineRow' || a.kind === 'lineCol' ? a : b;
      const butterflyTile = lineTile === a ? b : a;
      const target = findBestComboTarget(grid, [butterflyTile.pos]) ?? butterflyTile.pos;
      const line = lineTile.kind === 'lineRow' ? rowPositions(grid, target.row) : colPositions(grid, target.col);
      return dedupe([...line, butterflyTile.pos]);
    }
    case 'butterfly+butterfly': {
      // proposed fill-in: two independent best-target snipes instead of one
      const firstTarget = findBestComboTarget(grid, [a.pos, b.pos]);
      const excluded = firstTarget ? [a.pos, b.pos, firstTarget] : [a.pos, b.pos];
      const secondTarget = findBestComboTarget(grid, excluded);
      const targets = [firstTarget, secondTarget].filter((t): t is GridPos => t !== null);
      return dedupe([a.pos, b.pos, ...targets]);
    }
    default:
      return dedupe([a.pos, b.pos]);
  }
}

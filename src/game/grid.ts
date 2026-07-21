import { TILE_TYPES, type TileType, type GridPos } from '../lib/types';

export const GRID_WIDTH = 8;
export const GRID_HEIGHT = 8;

export type Cell = TileType | null;

export class Grid {
  width: number;
  height: number;
  cells: Cell[];

  constructor(width: number, height: number, cells?: Cell[]) {
    this.width = width;
    this.height = height;
    this.cells = cells ?? new Array(width * height).fill(null);
  }

  index(row: number, col: number): number {
    return row * this.width + col;
  }

  get(row: number, col: number): Cell {
    return this.cells[this.index(row, col)];
  }

  set(row: number, col: number, tile: TileType): void {
    this.cells[this.index(row, col)] = tile;
  }

  setEmpty(row: number, col: number): void {
    this.cells[this.index(row, col)] = null;
  }

  isAdjacent(a: GridPos, b: GridPos): boolean {
    const dr = Math.abs(a.row - b.row);
    const dc = Math.abs(a.col - b.col);
    return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
  }

  swap(a: GridPos, b: GridPos): void {
    const ai = this.index(a.row, a.col);
    const bi = this.index(b.row, b.col);
    const tmp = this.cells[ai];
    this.cells[ai] = this.cells[bi];
    this.cells[bi] = tmp;
  }

  clone(): Grid {
    return new Grid(this.width, this.height, this.cells.slice());
  }
}

export function randomTile(rng: () => number = Math.random): TileType {
  return TILE_TYPES[Math.floor(rng() * TILE_TYPES.length)];
}

export function createGrid(width = GRID_WIDTH, height = GRID_HEIGHT, rng: () => number = Math.random): Grid {
  const grid = new Grid(width, height);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      let tile: TileType;
      do {
        tile = randomTile(rng);
      } while (createsImmediateMatch(grid, row, col, tile));
      grid.set(row, col, tile);
    }
  }
  return grid;
}

function createsImmediateMatch(grid: Grid, row: number, col: number, tile: TileType): boolean {
  if (col >= 2 && grid.get(row, col - 1) === tile && grid.get(row, col - 2) === tile) return true;
  if (row >= 2 && grid.get(row - 1, col) === tile && grid.get(row - 2, col) === tile) return true;
  return false;
}

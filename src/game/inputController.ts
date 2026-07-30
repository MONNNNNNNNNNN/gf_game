import type Phaser from 'phaser';
import type { GridPos } from '../lib/types';

export interface BoardLayout {
  originX: number;
  originY: number;
  cellSize: number;
}

interface InputControllerOptions {
  /** Read live rather than captured: the board re-lays-out on resize/orientation change,
   * and re-registering this controller would stack duplicate Phaser input listeners. */
  getLayout: () => BoardLayout;
  gridWidth: number;
  gridHeight: number;
  isBusy: () => boolean;
  onSwapAttempt: (a: GridPos, b: GridPos) => void;
  onSelectionChange?: (pos: GridPos | null) => void;
  isActivatable?: (pos: GridPos) => boolean;
  onActivate?: (pos: GridPos) => void;
}

const DRAG_COMMIT_RATIO = 0.3;

function isSameCell(a: GridPos, b: GridPos): boolean {
  return a.row === b.row && a.col === b.col;
}

function isAdjacentCell(a: GridPos, b: GridPos): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

export function createInputController(scene: Phaser.Scene, opts: InputControllerOptions): void {
  const { getLayout, gridWidth, gridHeight, isBusy, onSwapAttempt, onSelectionChange, isActivatable, onActivate } = opts;

  let downCell: GridPos | null = null;
  let downWorld: { x: number; y: number } | null = null;
  let selected: GridPos | null = null;
  let dragCommitted = false;

  function setSelected(pos: GridPos | null): void {
    selected = pos;
    onSelectionChange?.(pos);
  }

  function worldToCell(x: number, y: number): GridPos | null {
    const { originX, originY, cellSize } = getLayout();
    const col = Math.floor((x - originX + cellSize / 2) / cellSize);
    const row = Math.floor((y - originY + cellSize / 2) / cellSize);
    if (row < 0 || row >= gridHeight || col < 0 || col >= gridWidth) return null;
    return { row, col };
  }

  scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    if (isBusy()) return;
    const cell = worldToCell(pointer.worldX, pointer.worldY);
    if (!cell) return;
    downCell = cell;
    downWorld = { x: pointer.worldX, y: pointer.worldY };
    dragCommitted = false;
  });

  scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
    if (isBusy() || !downCell || !downWorld || dragCommitted) return;
    const dx = pointer.worldX - downWorld.x;
    const dy = pointer.worldY - downWorld.y;
    const threshold = getLayout().cellSize * DRAG_COMMIT_RATIO;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

    const target: GridPos =
      Math.abs(dx) > Math.abs(dy)
        ? { row: downCell.row, col: downCell.col + (dx > 0 ? 1 : -1) }
        : { row: downCell.row + (dy > 0 ? 1 : -1), col: downCell.col };

    dragCommitted = true;
    const origin = downCell;
    downCell = null;
    downWorld = null;
    setSelected(null);

    if (target.row >= 0 && target.row < gridHeight && target.col >= 0 && target.col < gridWidth) {
      onSwapAttempt(origin, target);
    }
  });

  scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
    if (dragCommitted) {
      dragCommitted = false;
      return;
    }
    if (isBusy() || !downCell) return;
    const origin = downCell;
    downCell = null;
    downWorld = null;

    const cell = worldToCell(pointer.worldX, pointer.worldY);
    if (!cell || !isSameCell(origin, cell)) return;

    if (selected && isSameCell(selected, cell)) {
      setSelected(null);
      return;
    }
    if (selected && isAdjacentCell(selected, cell)) {
      const from = selected;
      setSelected(null);
      onSwapAttempt(from, cell);
      return;
    }
    if (!selected && isActivatable?.(cell)) {
      onActivate?.(cell);
      return;
    }
    setSelected(cell);
  });
}

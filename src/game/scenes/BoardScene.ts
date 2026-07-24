import Phaser from 'phaser';
import { Grid, createGrid, isTileType, isSpecialTile, GRID_WIDTH, GRID_HEIGHT } from '../grid';
import { findMatches, hasAnyValidMove, isValidSwap } from '../matchLogic';
import { resolveBoard, type CascadeStep } from '../cascade';
import { detectSquares, resolveSoloActivation, resolveComboActivation, type ActivatedTile } from '../specialTiles';
import { ComboTracker } from '../scoring';
import { TileSprite } from '../tileSprite';
import { SpecialTileSprite } from '../specialTileSprite';
import { createInputController } from '../inputController';
import { shuffleGrid } from '../reshuffle';
import { RunController } from '../run/RunController';
import { eventBus } from '../../app/eventBus';
import * as storage from '../../lib/storage';
import { submitScore } from '../../lib/leaderboard';
import { logRunEnded } from '../../lib/analytics';
import type { GridPos, TileType } from '../../lib/types';

type BoardSprite = TileSprite | SpecialTileSprite;

export class BoardScene extends Phaser.Scene {
  private grid!: Grid;
  private sprites: (BoardSprite | null)[] = [];
  private cellSize = 0;
  private originX = 0;
  private originY = 0;
  private busy = false;
  private combo = new ComboTracker();
  private score = 0;
  private highlightedIndex: number | null = null;
  private run!: RunController;
  private runEndHandled = false;
  private colorblindMode = storage.getColorblindMode();
  private pendingAction: { type: 'swap'; a: GridPos; b: GridPos } | { type: 'activate'; pos: GridPos } | null = null;

  constructor() {
    super('BoardScene');
  }

  create(): void {
    this.setupRun();
    this.setupBoard();
    this.setupInput();
    eventBus.on('game:restart', () => this.restart());
    eventBus.on('run:choiceMade', ({ itemId }) => this.run.applyItemChoice(itemId));
    eventBus.on('run:rerollRequested', () => this.run.rerollChoices());
    eventBus.on('settings:colorblind', ({ enabled }) => {
      this.colorblindMode = enabled;
      this.sprites.forEach((s) => s?.setColorblindMode(enabled));
    });

    if (import.meta.env.DEV) {
      // test hook: lets automated checks assert grid/sprite consistency programmatically
      (window as unknown as Record<string, unknown>).__boardDump = () => this.dumpBoardState();
    }
  }

  private dumpBoardState(): {
    busy: boolean;
    cells: { row: number; col: number; cell: string | null; spriteX: number | null; spriteY: number | null; expectedX: number; expectedY: number }[];
  } {
    const cells = [];
    for (let row = 0; row < this.grid.height; row++) {
      for (let col = 0; col < this.grid.width; col++) {
        const cell = this.grid.get(row, col);
        const sprite = this.sprites[this.grid.index(row, col)];
        const world = this.cellToWorld({ row, col });
        const pos = sprite?.getPosition() ?? null;
        cells.push({
          row,
          col,
          cell: cell === null ? null : typeof cell === 'string' ? cell : `special:${cell.kind}`,
          spriteX: pos?.x ?? null,
          spriteY: pos?.y ?? null,
          expectedX: world.x,
          expectedY: world.y,
        });
      }
    }
    return { busy: this.busy, cells };
  }

  update(_time: number, delta: number): void {
    this.run.tick(delta / 1000);
    if (this.run.hasEnded() && !this.runEndHandled) {
      void this.handleRunEnd();
    }
  }

  private setupRun(): void {
    this.run = new RunController();
    this.runEndHandled = false;
  }

  private setupBoard(): void {
    const { width, height } = this.scale;
    this.cellSize = Math.floor(Math.min(width / GRID_WIDTH, height / GRID_HEIGHT));
    const boardWidth = this.cellSize * GRID_WIDTH;
    const boardHeight = this.cellSize * GRID_HEIGHT;
    this.originX = (width - boardWidth) / 2 + this.cellSize / 2;
    this.originY = (height - boardHeight) / 2 + this.cellSize / 2;

    this.grid = createGrid(GRID_WIDTH, GRID_HEIGHT);
    if (!hasAnyValidMove(this.grid)) shuffleGrid(this.grid);
    this.renderAllTiles();
  }

  private cellToWorld(pos: GridPos): { x: number; y: number } {
    return { x: this.originX + pos.col * this.cellSize, y: this.originY + pos.row * this.cellSize };
  }

  private createSpriteAt(pos: GridPos): BoardSprite | null {
    const cell = this.grid.get(pos.row, pos.col);
    const { x, y } = this.cellToWorld(pos);
    const radius = this.cellSize * 0.38;
    if (isTileType(cell)) return new TileSprite(this, x, y, radius, cell, this.colorblindMode);
    if (isSpecialTile(cell)) return new SpecialTileSprite(this, x, y, radius, cell.kind, cell.baseTile);
    return null;
  }

  private renderAllTiles(): void {
    this.sprites = new Array(this.grid.width * this.grid.height).fill(null);
    for (let row = 0; row < this.grid.height; row++) {
      for (let col = 0; col < this.grid.width; col++) {
        const sprite = this.createSpriteAt({ row, col });
        if (sprite) this.sprites[this.grid.index(row, col)] = sprite;
      }
    }
  }

  private setupInput(): void {
    createInputController(this, {
      originX: this.originX,
      originY: this.originY,
      cellSize: this.cellSize,
      gridWidth: this.grid.width,
      gridHeight: this.grid.height,
      isBusy: () => this.busy || this.run.isPaused,
      onSwapAttempt: (a, b) => this.attemptSwap(a, b),
      onSelectionChange: (pos) => this.handleSelectionChange(pos),
      isActivatable: (pos) => isSpecialTile(this.grid.get(pos.row, pos.col)),
      onActivate: (pos) => void this.activateSpecialTileAlone(pos),
    });
  }

  private handleSelectionChange(pos: GridPos | null): void {
    if (this.highlightedIndex !== null) {
      this.sprites[this.highlightedIndex]?.setHighlighted(false);
      this.highlightedIndex = null;
    }
    if (pos) {
      const idx = this.grid.index(pos.row, pos.col);
      this.sprites[idx]?.setHighlighted(true);
      this.highlightedIndex = idx;
    }
  }

  private restart(): void {
    this.pendingAction = null;
    this.sprites.forEach((s) => s?.destroy());
    this.combo.reset();
    this.score = 0;
    eventBus.emit('score:update', { score: 0 });
    eventBus.emit('combo:update', { combo: 0 });
    this.setupRun();
    this.setupBoard();
  }

  private async attemptSwap(a: GridPos, b: GridPos): Promise<void> {
    if (this.run.isPaused) return;
    if (this.busy) {
      // real rapid touch-swiping outpaces animation duration - queue the latest gesture
      // instead of silently dropping it (which felt like "some tiles won't move")
      this.pendingAction = { type: 'swap', a, b };
      return;
    }

    const cellA = this.grid.get(a.row, a.col);
    const cellB = this.grid.get(b.row, b.col);
    const involvesSpecial = isSpecialTile(cellA) || isSpecialTile(cellB);

    if (!involvesSpecial && !isValidSwap(this.grid, a, b)) {
      // must hold `busy` for the shake too - otherwise a valid swap starting mid-shake
      // tweens the same sprite, and the shake's snap-back then parks it at a stale
      // position, leaving two sprites overlapping one cell (seen on a real device)
      this.busy = true;
      try {
        await this.animateInvalidSwap(a, b);
      } finally {
        this.busy = false;
        this.consumePendingAction();
      }
      return;
    }

    this.busy = true;
    try {
      if (involvesSpecial) {
        // a special-tile swap is a UI gesture that triggers activation, not a real
        // relocation - animate the sprites sliding together but leave the grid (and
        // the sprite array's index-to-position bookkeeping) alone, so `a`/`b` still
        // correctly identify where each special tile actually is
        await this.slideSpritesTogether(a, b);

        const modifiers = this.run.getModifiers();
        const activated: ActivatedTile[] = [];
        if (isSpecialTile(cellA)) activated.push({ pos: a, kind: cellA.kind });
        if (isSpecialTile(cellB)) activated.push({ pos: b, kind: cellB.kind });
        const affected =
          activated.length === 2
            ? resolveComboActivation(this.grid, activated[0], activated[1])
            : resolveSoloActivation(this.grid, activated[0], 1 + modifiers.bombBlastRadiusBonus, modifiers.butterflyExtraSnipes);
        const baseTile = (isSpecialTile(cellA) ? cellA.baseTile : (cellB as { baseTile: TileType }).baseTile) ?? 'red';
        await this.detonate(affected, baseTile);
      } else {
        this.grid.swap(a, b);
        await this.swapSprites(a, b);
        this.combo.reset(this.run.getModifiers().softComboReset);
        const steps = resolveBoard(this.grid, b, 5 - this.run.getModifiers().bombThresholdReduction);
        await this.animateSteps(steps);
      }

      await this.finishTurn();
    } catch (err) {
      // never leave the board permanently frozen because one animation step threw
      console.error('attemptSwap failed, recovering board state', err);
    } finally {
      this.busy = false;
      this.consumePendingAction();
    }
  }

  private async activateSpecialTileAlone(pos: GridPos): Promise<void> {
    if (this.run.isPaused) return;
    if (this.busy) {
      this.pendingAction = { type: 'activate', pos };
      return;
    }
    const cell = this.grid.get(pos.row, pos.col);
    if (!isSpecialTile(cell)) return;

    this.busy = true;
    try {
      const modifiers = this.run.getModifiers();
      const affected = resolveSoloActivation(
        this.grid,
        { pos, kind: cell.kind },
        1 + modifiers.bombBlastRadiusBonus,
        modifiers.butterflyExtraSnipes,
      );
      await this.detonate(affected, cell.baseTile);
      await this.finishTurn();
    } catch (err) {
      console.error('activateSpecialTileAlone failed, recovering board state', err);
    } finally {
      this.busy = false;
      this.consumePendingAction();
    }
  }

  private consumePendingAction(): void {
    if (!this.pendingAction) return;
    const action = this.pendingAction;
    this.pendingAction = null;
    if (action.type === 'swap') void this.attemptSwap(action.a, action.b);
    else void this.activateSpecialTileAlone(action.pos);
  }

  /** Clears an arbitrary set of positions (a special-tile blast), scores it like any other
   * match, then hands off to resolveBoard for the resulting gravity/refill/re-match cascade. */
  private async detonate(positions: GridPos[], baseTile: TileType): Promise<void> {
    if (positions.length === 0) return;

    const clearPromises: Promise<void>[] = [];
    for (const pos of positions) {
      const idx = this.grid.index(pos.row, pos.col);
      const sprite = this.sprites[idx];
      if (sprite) {
        clearPromises.push(sprite.clear(this));
        this.sprites[idx] = null;
      }
      this.grid.setEmpty(pos.row, pos.col);
    }
    await Promise.all(clearPromises);

    this.combo.reset(this.run.getModifiers().softComboReset);
    const detonationStep: CascadeStep = {
      matches: [{ positions, tile: baseTile }],
      spawnedSpecials: [],
      fallMoves: [],
      spawned: [],
    };
    this.scoreStep(detonationStep);

    const steps = resolveBoard(this.grid, undefined, 5 - this.run.getModifiers().bombThresholdReduction);
    await this.animateSteps(steps);
  }

  private async finishTurn(): Promise<void> {
    // safety sweep: a settled board must NEVER hold an unresolved match or 2x2 square.
    // Whatever path produced one (shuffle giving up, an unforeseen race), resolve it
    // now rather than leaving matched tiles sitting inert on screen.
    const leftover = findMatches(this.grid).length > 0 || detectSquares(this.grid).length > 0;
    if (leftover) {
      const steps = resolveBoard(this.grid, undefined, 5 - this.run.getModifiers().bombThresholdReduction);
      await this.animateSteps(steps);
    }

    this.resyncSprites();
    if (!hasAnyValidMove(this.grid)) {
      const instant = Math.random() < this.run.getModifiers().freeReshuffleChance;
      if (!instant) {
        eventBus.emit('board:stuck', undefined);
        await this.delay(1400);
      }
      shuffleGrid(this.grid);
      await this.reshuffleAnimation();
      // shuffle re-rolls until clean, but if it hit its attempt cap the board may
      // still hold a match - sweep once more so it clears instead of sitting inert
      const steps = findMatches(this.grid).length > 0 ? resolveBoard(this.grid) : [];
      if (steps.length > 0) await this.animateSteps(steps);
      this.resyncSprites();
      if (!instant) eventBus.emit('board:reshuffled', undefined);
    }
  }

  /** Hard reconciliation between grid state and rendered sprites, run after every settled
   * turn. Animation races (interrupted tweens, the special-swap slide gesture, anything
   * unforeseen on a slow device) can leave a sprite parked at the wrong cell or missing
   * entirely - visually "overlapping balls". Rather than trusting every animation path to
   * be perfect, snap every sprite to its true cell and rebuild any missing/orphaned ones. */
  private resyncSprites(): void {
    for (let row = 0; row < this.grid.height; row++) {
      for (let col = 0; col < this.grid.width; col++) {
        const idx = this.grid.index(row, col);
        const cell = this.grid.get(row, col);
        const sprite = this.sprites[idx];

        if (cell === null) {
          if (sprite) {
            sprite.destroy();
            this.sprites[idx] = null;
          }
          continue;
        }

        if (!sprite) {
          this.sprites[idx] = this.createSpriteAt({ row, col });
          continue;
        }

        // sprite kind must match cell kind (plain vs special) - rebuild if mismatched
        const isSpecialSprite = sprite instanceof SpecialTileSprite;
        if (isSpecialSprite !== isSpecialTile(cell)) {
          sprite.destroy();
          this.sprites[idx] = this.createSpriteAt({ row, col });
          continue;
        }

        const { x, y } = this.cellToWorld({ row, col });
        sprite.snapTo(x, y);
      }
    }
  }

  private async animateInvalidSwap(a: GridPos, b: GridPos): Promise<void> {
    const spriteA = this.sprites[this.grid.index(a.row, a.col)];
    const spriteB = this.sprites[this.grid.index(b.row, b.col)];
    await Promise.all([spriteA?.shake(this), spriteB?.shake(this)]);
  }

  private async slideSpritesTogether(a: GridPos, b: GridPos): Promise<void> {
    const spriteA = this.sprites[this.grid.index(a.row, a.col)];
    const spriteB = this.sprites[this.grid.index(b.row, b.col)];
    const worldA = this.cellToWorld(a);
    const worldB = this.cellToWorld(b);
    await Promise.all([spriteA?.moveTo(this, worldB.x, worldB.y), spriteB?.moveTo(this, worldA.x, worldA.y)]);
  }

  private async swapSprites(a: GridPos, b: GridPos): Promise<void> {
    const ai = this.grid.index(a.row, a.col);
    const bi = this.grid.index(b.row, b.col);
    const spriteA = this.sprites[ai];
    const spriteB = this.sprites[bi];
    const worldA = this.cellToWorld(a);
    const worldB = this.cellToWorld(b);
    await Promise.all([spriteA?.moveTo(this, worldB.x, worldB.y), spriteB?.moveTo(this, worldA.x, worldA.y)]);
    this.sprites[ai] = spriteB;
    this.sprites[bi] = spriteA;
  }

  private scoreStep(step: CascadeStep): void {
    const modifiers = this.run.getModifiers();
    const scoreEvent = this.combo.scoreStep(step, {
      scoreMultiplier: modifiers.scoreMultiplier,
      cascadeStepBonus: modifiers.cascadeStepBonus,
      longMatchBonusMultiplier: modifiers.longMatchBonusMultiplier,
    });
    this.score += scoreEvent.points;
    eventBus.emit('score:update', { score: this.score });
    eventBus.emit('combo:update', { combo: scoreEvent.combo });

    this.run.registerCascadeStep(step, scoreEvent);

    if (storage.setHighScoreIfBeaten(this.score)) {
      eventBus.emit('highscore:beaten', { score: this.score });
    }
  }

  private async animateSteps(steps: CascadeStep[]): Promise<void> {
    for (const step of steps) {
      const clearPromises: Promise<void>[] = [];
      for (const match of step.matches) {
        for (const pos of match.positions) {
          const idx = this.grid.index(pos.row, pos.col);
          const sprite = this.sprites[idx];
          if (sprite) {
            clearPromises.push(sprite.clear(this));
            this.sprites[idx] = null;
          }
        }
      }
      await Promise.all(clearPromises);

      for (const spawn of step.spawnedSpecials) {
        const idx = this.grid.index(spawn.pos.row, spawn.pos.col);
        this.sprites[idx] = new SpecialTileSprite(
          this,
          this.cellToWorld(spawn.pos).x,
          this.cellToWorld(spawn.pos).y,
          this.cellSize * 0.38,
          spawn.kind,
          spawn.baseTile,
        );
      }

      const fallPromises: Promise<void>[] = [];
      for (const move of step.fallMoves) {
        const fromIdx = this.grid.index(move.from.row, move.from.col);
        const toIdx = this.grid.index(move.to.row, move.to.col);
        const sprite = this.sprites[fromIdx];
        this.sprites[fromIdx] = null;
        this.sprites[toIdx] = sprite;
        if (sprite) {
          const world = this.cellToWorld(move.to);
          fallPromises.push(sprite.moveTo(this, world.x, world.y, 220));
        }
      }
      await Promise.all(fallPromises);

      const spawnPromises: Promise<void>[] = [];
      for (const spawn of step.spawned) {
        const idx = this.grid.index(spawn.pos.row, spawn.pos.col);
        const tile = this.grid.get(spawn.pos.row, spawn.pos.col);
        if (!isTileType(tile)) continue; // refill only ever spawns plain tiles
        const world = this.cellToWorld(spawn.pos);
        const startY = world.y - this.cellSize * (spawn.pos.row + 1);
        const sprite = new TileSprite(this, world.x, startY, this.cellSize * 0.38, tile, this.colorblindMode);
        this.sprites[idx] = sprite;
        spawnPromises.push(sprite.dropIn(this, startY, world.y));
      }
      await Promise.all(spawnPromises);

      // a step with zero matches (pure gravity/refill after a special-tile detonation) has
      // nothing meaningful to score - scoring for the detonation itself already happened in detonate()
      if (step.matches.length > 0 && step.matches.some((m) => m.positions.length > 0)) {
        this.scoreStep(step);
      }
    }
  }

  private async reshuffleAnimation(): Promise<void> {
    await Promise.all(this.sprites.map((s) => s?.fadeOut(this) ?? Promise.resolve()));
    this.sprites.forEach((s) => s?.destroy());
    this.renderAllTiles();
  }

  private async handleRunEnd(): Promise<void> {
    this.runEndHandled = true;
    const nickname = storage.getNickname() ?? 'Player';
    const finalScore = this.score;
    const level = this.run.getLevel();
    const durationSec = this.run.getElapsed();

    eventBus.emit('run:ended', { finalScore, level, durationSec });
    void submitScore(nickname, finalScore);
    void logRunEnded({ nickname, finalScore, level, durationSec, itemsPicked: this.run.getPickHistory() });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, () => resolve()));
  }
}

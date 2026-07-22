import Phaser from 'phaser';
import { Grid, createGrid, GRID_WIDTH, GRID_HEIGHT } from '../grid';
import { hasAnyValidMove, isValidSwap } from '../matchLogic';
import { resolveBoard } from '../cascade';
import { ComboTracker } from '../scoring';
import { TileSprite } from '../tileSprite';
import { createInputController } from '../inputController';
import { shuffleGrid } from '../reshuffle';
import { RunController } from '../run/RunController';
import { eventBus } from '../../app/eventBus';
import * as storage from '../../lib/storage';
import { submitScore } from '../../lib/leaderboard';
import { logRunEnded } from '../../lib/analytics';
import type { GridPos } from '../../lib/types';

export class BoardScene extends Phaser.Scene {
  private grid!: Grid;
  private sprites: (TileSprite | null)[] = [];
  private cellSize = 0;
  private originX = 0;
  private originY = 0;
  private busy = false;
  private combo = new ComboTracker();
  private score = 0;
  private highlightedIndex: number | null = null;
  private run!: RunController;
  private runEndHandled = false;

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

  private renderAllTiles(): void {
    this.sprites = new Array(this.grid.width * this.grid.height).fill(null);
    for (let row = 0; row < this.grid.height; row++) {
      for (let col = 0; col < this.grid.width; col++) {
        const tile = this.grid.get(row, col);
        if (!tile) continue;
        const { x, y } = this.cellToWorld({ row, col });
        this.sprites[this.grid.index(row, col)] = new TileSprite(this, x, y, this.cellSize * 0.38, tile);
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
    this.sprites.forEach((s) => s?.destroy());
    this.combo.reset();
    this.score = 0;
    eventBus.emit('score:update', { score: 0 });
    eventBus.emit('combo:update', { combo: 0 });
    this.setupRun();
    this.setupBoard();
  }

  private async attemptSwap(a: GridPos, b: GridPos): Promise<void> {
    if (this.busy || this.run.isPaused) return;
    if (!isValidSwap(this.grid, a, b)) {
      await this.animateInvalidSwap(a, b);
      return;
    }

    this.busy = true;
    this.grid.swap(a, b);
    await this.swapSprites(a, b);
    this.combo.reset(this.run.getModifiers().softComboReset);
    await this.resolveAndAnimate();

    if (!hasAnyValidMove(this.grid)) {
      const instant = Math.random() < this.run.getModifiers().freeReshuffleChance;
      if (!instant) {
        eventBus.emit('board:stuck', undefined);
        await this.delay(1400);
      }
      shuffleGrid(this.grid);
      await this.reshuffleAnimation();
      if (!instant) eventBus.emit('board:reshuffled', undefined);
    }
    this.busy = false;
  }

  private async animateInvalidSwap(a: GridPos, b: GridPos): Promise<void> {
    const spriteA = this.sprites[this.grid.index(a.row, a.col)];
    const spriteB = this.sprites[this.grid.index(b.row, b.col)];
    await Promise.all([spriteA?.shake(this), spriteB?.shake(this)]);
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

  private async resolveAndAnimate(): Promise<void> {
    const steps = resolveBoard(this.grid);

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
        if (!tile) continue;
        const world = this.cellToWorld(spawn.pos);
        const startY = world.y - this.cellSize * (spawn.pos.row + 1);
        const sprite = new TileSprite(this, world.x, startY, this.cellSize * 0.38, tile);
        this.sprites[idx] = sprite;
        spawnPromises.push(sprite.dropIn(this, startY, world.y));
      }
      await Promise.all(spawnPromises);

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

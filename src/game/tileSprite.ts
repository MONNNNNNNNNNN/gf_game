import Phaser from 'phaser';
import type { TileType } from '../lib/types';
import { ensureTileTexture } from './tileTextures';

export class TileSprite {
  readonly gameObject: Phaser.GameObjects.Image;
  private readonly scene: Phaser.Scene;
  private readonly tile: TileType;
  private readonly radius: number;

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number, tile: TileType, colorblindMode = false) {
    this.scene = scene;
    this.tile = tile;
    this.radius = radius;
    const key = ensureTileTexture(scene, tile, colorblindMode, radius);
    this.gameObject = scene.add.image(x, y, key);
  }

  setColorblindMode(active: boolean): void {
    const key = ensureTileTexture(this.scene, this.tile, active, this.radius);
    this.gameObject.setTexture(key);
  }

  snapTo(x: number, y: number): void {
    this.gameObject.setPosition(x, y);
    this.gameObject.setScale(1);
    this.gameObject.setAlpha(1);
  }

  getPosition(): { x: number; y: number } {
    return { x: this.gameObject.x, y: this.gameObject.y };
  }

  /** Every display object this sprite owns - used to detect untracked orphans. */
  getGameObjects(): Phaser.GameObjects.GameObject[] {
    return [this.gameObject];
  }

  moveTo(scene: Phaser.Scene, x: number, y: number, duration = 180): Promise<void> {
    return new Promise((resolve) => {
      scene.tweens.add({
        targets: this.gameObject,
        x,
        y,
        duration,
        ease: 'Cubic.easeInOut',
        onComplete: () => resolve(),
      });
    });
  }

  shake(scene: Phaser.Scene): Promise<void> {
    const originalX = this.gameObject.x;
    return new Promise((resolve) => {
      scene.tweens.add({
        targets: this.gameObject,
        x: originalX + 6,
        duration: 60,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          this.gameObject.x = originalX;
          resolve();
        },
      });
    });
  }

  clear(scene: Phaser.Scene): Promise<void> {
    return new Promise((resolve) => {
      scene.tweens.add({
        targets: this.gameObject,
        scale: 0,
        alpha: 0,
        duration: 150,
        ease: 'Back.easeIn',
        onComplete: () => {
          this.gameObject.destroy();
          resolve();
        },
      });
    });
  }

  dropIn(scene: Phaser.Scene, fromY: number, toY: number, duration = 220): Promise<void> {
    this.gameObject.y = fromY;
    return new Promise((resolve) => {
      scene.tweens.add({
        targets: this.gameObject,
        y: toY,
        duration,
        ease: 'Bounce.easeOut',
        onComplete: () => resolve(),
      });
    });
  }

  setHighlighted(active: boolean): void {
    this.gameObject.setScale(active ? 1.15 : 1);
  }

  fadeOut(scene: Phaser.Scene, duration = 200): Promise<void> {
    return new Promise((resolve) => {
      scene.tweens.add({
        targets: this.gameObject,
        alpha: 0,
        duration,
        onComplete: () => resolve(),
      });
    });
  }

  destroy(): void {
    this.gameObject.destroy();
  }
}

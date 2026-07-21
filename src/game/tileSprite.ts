import Phaser from 'phaser';
import type { TileType } from '../lib/types';

const TILE_COLORS: Record<TileType, number> = {
  red: 0xef4444,
  blue: 0x3b82f6,
  green: 0x22c55e,
  yellow: 0xeab308,
  purple: 0xa855f7,
  orange: 0xf97316,
};

export class TileSprite {
  readonly gameObject: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number, tile: TileType) {
    this.gameObject = scene.add.circle(x, y, radius, TILE_COLORS[tile]);
    this.gameObject.setStrokeStyle(2, 0xffffff, 0.35);
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
    this.gameObject.setStrokeStyle(active ? 4 : 2, 0xffffff, active ? 0.9 : 0.35);
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

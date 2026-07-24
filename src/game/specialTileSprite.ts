import Phaser from 'phaser';
import type { SpecialKind } from './grid';
import type { TileType } from '../lib/types';
import { ensureSpecialTexture } from './tileTextures';

export class SpecialTileSprite {
  private readonly main: Phaser.GameObjects.Image;
  private readonly ring: Phaser.GameObjects.Arc | null = null;
  private ringTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number, kind: SpecialKind, baseTile: TileType) {
    const key = ensureSpecialTexture(scene, kind, baseTile, radius);
    this.main = scene.add.image(x, y, key);

    if (kind === 'bomb') {
      this.ring = scene.add.circle(x, y, radius * 1.15);
      this.ring.setStrokeStyle(3, 0xffffff, 0.6);
      this.ringTween = scene.tweens.add({
        targets: this.ring,
        scale: 1.12,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private get targets(): (Phaser.GameObjects.Image | Phaser.GameObjects.Arc)[] {
    return this.ring ? [this.main, this.ring] : [this.main];
  }

  setColorblindMode(_active: boolean): void {
    // special tiles already read visually distinct from plain tiles (shape/glyph/pulse) - no-op
  }

  setHighlighted(active: boolean): void {
    this.main.setScale(active ? 1.15 : 1);
  }

  moveTo(scene: Phaser.Scene, x: number, y: number, duration = 180): Promise<void> {
    return new Promise((resolve) => {
      scene.tweens.add({
        targets: this.targets,
        x,
        y,
        duration,
        ease: 'Cubic.easeInOut',
        onComplete: () => resolve(),
      });
    });
  }

  shake(scene: Phaser.Scene): Promise<void> {
    const originalX = this.main.x;
    return new Promise((resolve) => {
      scene.tweens.add({
        targets: this.targets,
        x: originalX + 6,
        duration: 60,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          this.targets.forEach((t) => {
            t.x = originalX;
          });
          resolve();
        },
      });
    });
  }

  clear(scene: Phaser.Scene): Promise<void> {
    return new Promise((resolve) => {
      scene.tweens.add({
        targets: this.targets,
        scale: 0,
        alpha: 0,
        duration: 200,
        ease: 'Back.easeIn',
        onComplete: () => {
          this.destroy();
          resolve();
        },
      });
    });
  }

  dropIn(scene: Phaser.Scene, fromY: number, toY: number, duration = 220): Promise<void> {
    this.targets.forEach((t) => {
      t.y = fromY;
    });
    return new Promise((resolve) => {
      scene.tweens.add({
        targets: this.targets,
        y: toY,
        duration,
        ease: 'Bounce.easeOut',
        onComplete: () => resolve(),
      });
    });
  }

  fadeOut(scene: Phaser.Scene, duration = 200): Promise<void> {
    return new Promise((resolve) => {
      scene.tweens.add({
        targets: this.targets,
        alpha: 0,
        duration,
        onComplete: () => resolve(),
      });
    });
  }

  destroy(): void {
    this.ringTween?.stop();
    this.main.destroy();
    this.ring?.destroy();
  }
}

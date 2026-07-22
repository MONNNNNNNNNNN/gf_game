import Phaser from 'phaser';
import type { TileType } from '../lib/types';

const TILE_COLORS: Record<TileType, number> = {
  red: 0xe6553c,
  blue: 0x3d8ce8,
  green: 0x2e9e6b,
  yellow: 0xf2c14e,
  purple: 0xa06bd6,
  orange: 0xf2894e,
};

const TILE_GLYPHS: Record<TileType, string> = {
  red: '●', // ●
  blue: '■', // ■
  green: '▲', // ▲
  yellow: '★', // ★
  purple: '◆', // ◆
  orange: '✦', // ✦
};

export class TileSprite {
  readonly gameObject: Phaser.GameObjects.Arc;
  private glyph: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number, tile: TileType, colorblindMode = false) {
    this.gameObject = scene.add.circle(x, y, radius, TILE_COLORS[tile]);
    this.gameObject.setStrokeStyle(2, 0xffffff, 0.35);

    this.glyph = scene.add.text(x, y, TILE_GLYPHS[tile], {
      fontSize: `${Math.round(radius * 0.9)}px`,
      color: '#ffffff',
    });
    this.glyph.setOrigin(0.5, 0.5);
    this.glyph.setAlpha(0.85);
    this.glyph.setVisible(colorblindMode);
  }

  setColorblindMode(active: boolean): void {
    this.glyph.setVisible(active);
  }

  moveTo(scene: Phaser.Scene, x: number, y: number, duration = 180): Promise<void> {
    return new Promise((resolve) => {
      scene.tweens.add({
        targets: [this.gameObject, this.glyph],
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
        targets: [this.gameObject, this.glyph],
        x: originalX + 6,
        duration: 60,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          this.gameObject.x = originalX;
          this.glyph.x = originalX;
          resolve();
        },
      });
    });
  }

  clear(scene: Phaser.Scene): Promise<void> {
    return new Promise((resolve) => {
      scene.tweens.add({
        targets: [this.gameObject, this.glyph],
        scale: 0,
        alpha: 0,
        duration: 150,
        ease: 'Back.easeIn',
        onComplete: () => {
          this.gameObject.destroy();
          this.glyph.destroy();
          resolve();
        },
      });
    });
  }

  dropIn(scene: Phaser.Scene, fromY: number, toY: number, duration = 220): Promise<void> {
    this.gameObject.y = fromY;
    this.glyph.y = fromY;
    return new Promise((resolve) => {
      scene.tweens.add({
        targets: [this.gameObject, this.glyph],
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
    this.glyph.setScale(active ? 1.15 : 1);
  }

  fadeOut(scene: Phaser.Scene, duration = 200): Promise<void> {
    return new Promise((resolve) => {
      scene.tweens.add({
        targets: [this.gameObject, this.glyph],
        alpha: 0,
        duration,
        onComplete: () => resolve(),
      });
    });
  }

  destroy(): void {
    this.gameObject.destroy();
    this.glyph.destroy();
  }
}

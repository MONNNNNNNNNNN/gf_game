import Phaser from 'phaser';
import type { SpecialKind } from './grid';
import type { TileType } from '../lib/types';

const TILE_COLORS: Record<TileType, number> = {
  red: 0xe6553c,
  blue: 0x3d8ce8,
  green: 0x2e9e6b,
  yellow: 0xf2c14e,
  purple: 0xa06bd6,
  orange: 0xf2894e,
};

const KIND_GLYPHS: Record<SpecialKind, string> = {
  lineRow: '↔', // left-right arrow
  lineCol: '↕', // up-down arrow
  butterfly: '🦋', // butterfly emoji
  bomb: '💥', // collision/explosion emoji
};

export class SpecialTileSprite {
  private readonly main: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Arc;
  private readonly glyph: Phaser.GameObjects.Text;
  private readonly ring: Phaser.GameObjects.Arc | null = null;
  private ringTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number, kind: SpecialKind, baseTile: TileType) {
    const color = TILE_COLORS[baseTile];

    if (kind === 'lineRow' || kind === 'lineCol') {
      const long = radius * 2.1;
      const short = radius * 1.1;
      const width = kind === 'lineRow' ? long : short;
      const height = kind === 'lineRow' ? short : long;
      this.main = scene.add.rectangle(x, y, width, height, color);
      this.main.setStrokeStyle(2, 0xffffff, 0.45);
    } else {
      this.main = scene.add.circle(x, y, radius, color);
      this.main.setStrokeStyle(2, 0xffffff, 0.45);
    }

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

    this.glyph = scene.add.text(x, y, KIND_GLYPHS[kind], {
      fontSize: `${Math.round(radius * (kind === 'lineRow' || kind === 'lineCol' ? 0.75 : 1.1))}px`,
    });
    this.glyph.setOrigin(0.5, 0.5);
  }

  private get targets(): (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Arc | Phaser.GameObjects.Text)[] {
    return this.ring ? [this.main, this.glyph, this.ring] : [this.main, this.glyph];
  }

  setColorblindMode(_active: boolean): void {
    // special tiles already read visually distinct from plain tiles (shape/glyph/pulse) - no-op
  }

  setHighlighted(active: boolean): void {
    this.main.setScale(active ? 1.15 : 1);
    this.glyph.setScale(active ? 1.15 : 1);
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
    this.glyph.destroy();
    this.ring?.destroy();
  }
}

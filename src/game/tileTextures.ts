import Phaser from 'phaser';
import type { SpecialKind } from './grid';
import type { TileType } from '../lib/types';

export const TILE_COLORS: Record<TileType, number> = {
  red: 0xe6553c,
  blue: 0x3d8ce8,
  green: 0x2e9e6b,
  yellow: 0xf2c14e,
  purple: 0xa06bd6,
  orange: 0xf2894e,
};

const TILE_GLYPHS: Record<TileType, string> = {
  red: '●',
  blue: '■',
  green: '▲',
  yellow: '★',
  purple: '◆',
  orange: '✦',
};

const KIND_GLYPHS: Record<SpecialKind, string> = {
  lineRow: '↔',
  lineCol: '↕',
  butterfly: '🦋',
  bomb: '💥',
};

function hexToCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

/** Textures are baked once per unique (shape, color, glyph, size) combo using plain Canvas 2D
 * drawing and reused via `scene.add.image()` for every tile - this avoids creating a fresh
 * vector-drawn circle plus a Text GameObject (expensive to rasterize) for every single tile on
 * every match/cascade/reshuffle, which was the main source of jank on a full 8x8 board.
 * Uses `scene.textures.createCanvas` + raw 2D context drawing rather than Phaser's
 * RenderTexture, since RenderTexture.draw()+saveTexture() produced a blank/invisible result
 * under the installed Phaser 4.2.1 (this project was built assuming Phaser 3 APIs - `phaser`
 * was never pinned to a major version in package.json). Canvas 2D texture baking is a
 * simpler, more fundamental primitive that behaves the same across Phaser versions. */
function bakeTexture(scene: Phaser.Scene, key: string, size: number, draw: (ctx: CanvasRenderingContext2D, center: number) => void): string {
  if (scene.textures.exists(key)) return key;
  const canvasTexture = scene.textures.createCanvas(key, size, size);
  if (!canvasTexture) return key;
  const ctx = canvasTexture.getContext();
  draw(ctx, size / 2);
  canvasTexture.refresh();
  return key;
}

export function ensureTileTexture(scene: Phaser.Scene, tile: TileType, showGlyph: boolean, radius: number): string {
  const key = `tile-${tile}-${showGlyph ? 'glyph' : 'plain'}-${radius}`;
  const size = Math.ceil(radius * 2 + 4);
  return bakeTexture(scene, key, size, (ctx, center) => {
    ctx.fillStyle = hexToCss(TILE_COLORS[tile]);
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.stroke();

    if (showGlyph) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `${Math.round(radius * 0.9)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(TILE_GLYPHS[tile], center, center);
    }
  });
}

export function ensureSpecialTexture(scene: Phaser.Scene, kind: SpecialKind, baseTile: TileType, radius: number): string {
  const key = `special-${kind}-${baseTile}-${radius}`;
  const size = Math.ceil(radius * 2.4 + 4);
  return bakeTexture(scene, key, size, (ctx, center) => {
    ctx.fillStyle = hexToCss(TILE_COLORS[baseTile]);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2;

    if (kind === 'lineRow' || kind === 'lineCol') {
      const long = radius * 2.1;
      const short = radius * 1.1;
      const width = kind === 'lineRow' ? long : short;
      const height = kind === 'lineRow' ? short : long;
      ctx.fillRect(center - width / 2, center - height / 2, width, height);
      ctx.strokeRect(center - width / 2, center - height / 2, width, height);
    } else {
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    const fontSize = kind === 'lineRow' || kind === 'lineCol' ? radius * 0.75 : radius * 1.1;
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.round(fontSize)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(KIND_GLYPHS[kind], center, center);
  });
}

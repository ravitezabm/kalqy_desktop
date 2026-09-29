import Phaser from "phaser";

export interface TintOptions {
  /** Only pixels less saturated than this are recolored (petals/wings, not outlines/leaves). */
  maxSaturation: number;
  /** ...and brighter than this (0-255). */
  minBrightness: number;
}

/**
 * Recolors only the near-white parts of a supplied texture by multiplying
 * them with `color`, so highlights/shadows survive while saturated details
 * (stems, outlines, faces) are left exactly as drawn. One white source
 * image serves every logical color id (PROMPT section 39).
 * Returns the key of the new canvas texture.
 */
export function createTintedTexture(
  textures: Phaser.Textures.TextureManager,
  sourceKey: string,
  color: number,
  newKey: string,
  options: TintOptions
): string {
  if (textures.exists(newKey)) return newKey;

  const source = textures.get(sourceKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const canvasTexture = textures.createCanvas(newKey, source.width, source.height)!;
  const ctx = canvasTexture.getContext();
  ctx.drawImage(source, 0, 0);

  const image = ctx.getImageData(0, 0, source.width, source.height);
  const data = image.data;
  const tr = (color >> 16) & 255;
  const tg = (color >> 8) & 255;
  const tb = color & 255;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const saturation = max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
    if (saturation < options.maxSaturation && max > options.minBrightness) {
      data[i] = (r * tr) / 255;
      data[i + 1] = (g * tg) / 255;
      data[i + 2] = (b * tb) / 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  canvasTexture.refresh();
  return newKey;
}

/** Same as createTintedTexture, but keeps every named atlas frame of the source. */
export function createTintedAtlas(
  textures: Phaser.Textures.TextureManager,
  sourceKey: string,
  color: number,
  newKey: string,
  options: TintOptions
): string {
  if (textures.exists(newKey)) return newKey;
  createTintedTexture(textures, sourceKey, color, newKey, options);

  const source = textures.get(sourceKey);
  const tinted = textures.get(newKey);
  source.getFrameNames().forEach((name) => {
    const frame = source.get(name);
    tinted.add(name, 0, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight);
  });
  return newKey;
}

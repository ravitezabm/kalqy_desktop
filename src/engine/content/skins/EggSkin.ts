import type Phaser from "phaser";
import { drawContent } from "../ContentRenderer";
import { createRng } from "../random";
import type { ContentItem } from "../types";
import type { OptionSkin, OptionSkinStyle, RenderedSkin } from "./OptionSkin";

const W = 200;
const H = 250;

function eggPath(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.moveTo(100, 14);
  ctx.bezierCurveTo(154, 14, 184, 118, 184, 160);
  ctx.bezierCurveTo(184, 214, 146, 240, 100, 240);
  ctx.bezierCurveTo(54, 240, 16, 214, 16, 160);
  ctx.bezierCurveTo(16, 118, 46, 14, 100, 14);
  ctx.closePath();
}

/** A polished, procedurally drawn egg with the content on its front. One code path for every colour and every subject. */
export const EggSkin: OptionSkin = {
  id: "egg",

  render(textures: Phaser.Textures.TextureManager, content: ContentItem, style: OptionSkinStyle): RenderedSkin {
    const key = `egg:${content.type}:${content.value}:${style.primaryColor}:${style.secondaryColor}`;
    const result: RenderedSkin = { textureKey: key, width: W, height: H, bodyRadiusRatio: 0.45 };
    if (textures.exists(key)) return result;

    const texture = textures.createCanvas(key, W, H)!;
    const ctx = texture.getContext();

    // Body: soft vertical gradient.
    eggPath(ctx);
    const body = ctx.createLinearGradient(0, 14, 0, 240);
    body.addColorStop(0, style.secondaryColor);
    body.addColorStop(0.55, style.primaryColor);
    body.addColorStop(1, style.primaryColor);
    ctx.fillStyle = body;
    ctx.fill();

    ctx.save();
    eggPath(ctx);
    ctx.clip();

    // Inner glow along the rim.
    const rim = ctx.createRadialGradient(100, 140, 60, 100, 140, 120);
    rim.addColorStop(0, "rgba(255,255,255,0)");
    rim.addColorStop(1, "rgba(255,255,255,0.28)");
    ctx.fillStyle = rim;
    ctx.fillRect(0, 0, W, H);

    // Shading toward the bottom-right so it reads as round.
    const shade = ctx.createLinearGradient(40, 60, 190, 240);
    shade.addColorStop(0, "rgba(0,0,0,0)");
    shade.addColorStop(1, "rgba(40,0,70,0.22)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, H);

    // Speckles (seeded per egg, so each looks the same every time).
    const rng = createRng(hash(key));
    ctx.fillStyle = style.speckleColor ?? "rgba(255,255,255,0.4)";
    for (let i = 0; i < 26; i++) {
      ctx.globalAlpha = 0.2 + rng.next() * 0.35;
      ctx.beginPath();
      ctx.arc(30 + rng.next() * 140, 30 + rng.next() * 200, 1.4 + rng.next() * 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Glossy highlight.
    const gloss = ctx.createRadialGradient(68, 84, 4, 68, 84, 54);
    gloss.addColorStop(0, style.highlightColor ?? "rgba(255,255,255,0.75)");
    gloss.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gloss;
    ctx.beginPath();
    ctx.ellipse(70, 86, 34, 52, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Outline.
    eggPath(ctx);
    ctx.lineWidth = 4;
    ctx.strokeStyle = style.outlineColor ?? "rgba(70,20,110,0.35)";
    ctx.stroke();

    drawContent(ctx, content, 100, 150, H * (style.glyphScale ?? 0.42), style.glyph);
    texture.refresh();
    return result;
  },
};

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Skins a level may ask for by name — backend picks from this list, it never supplies drawing code. */
export const OPTION_SKINS: Record<string, OptionSkin> = { egg: EggSkin };

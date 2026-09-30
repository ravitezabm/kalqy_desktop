import type { ContentItem, ContentType } from "./types";

export interface GlyphStyle {
  font: string;
  fontWeight: string;
  color: string;
  stroke: string;
  strokeWidth: number;
  shadow: string;
}

export const DEFAULT_GLYPH_STYLE: GlyphStyle = {
  font: '"Baloo 2", "Nunito", system-ui, sans-serif',
  fontWeight: "800",
  color: "#ffffff",
  stroke: "rgba(60,20,90,0.35)",
  strokeWidth: 6,
  shadow: "rgba(40,10,70,0.45)",
};

/** Draws one piece of content centred at (cx, cy) filling roughly `size` px. */
export type ContentDrawer = (ctx: CanvasRenderingContext2D, item: ContentItem, cx: number, cy: number, size: number, style: GlyphStyle) => void;

function drawText(ctx: CanvasRenderingContext2D, item: ContentItem, cx: number, cy: number, size: number, style: GlyphStyle): void {
  ctx.save();
  ctx.font = `${style.fontWeight} ${size}px ${style.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.shadowColor = style.shadow;
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  ctx.lineWidth = style.strokeWidth;
  ctx.strokeStyle = style.stroke;
  const text = String(item.value);
  ctx.strokeText(text, cx, cy);
  ctx.shadowColor = "transparent";
  ctx.fillStyle = style.color;
  ctx.fillText(text, cx, cy);
  ctx.restore();
}

function drawShape(ctx: CanvasRenderingContext2D, item: ContentItem, cx: number, cy: number, size: number, style: GlyphStyle): void {
  const r = size / 2;
  ctx.save();
  ctx.fillStyle = style.color;
  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = style.strokeWidth;
  ctx.lineJoin = "round";
  ctx.beginPath();
  switch (String(item.value).toLowerCase()) {
    case "square":
      ctx.rect(cx - r * 0.8, cy - r * 0.8, r * 1.6, r * 1.6);
      break;
    case "triangle":
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy + r * 0.8);
      ctx.lineTo(cx - r, cy + r * 0.8);
      ctx.closePath();
      break;
    case "star":
      for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? r : r * 0.45;
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        ctx[i === 0 ? "moveTo" : "lineTo"](cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      }
      ctx.closePath();
      break;
    default:
      ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

const drawers = new Map<ContentType, ContentDrawer>([
  ["text", drawText],
  ["number", drawText],
  ["shape", drawShape],
]);

/** Only registered drawers can render content — backend config picks from these, never supplies code. */
export function registerContentDrawer(type: ContentType, drawer: ContentDrawer): void {
  drawers.set(type, drawer);
}

export function canRender(item: ContentItem): boolean {
  return drawers.has(item.type);
}

export function drawContent(
  ctx: CanvasRenderingContext2D,
  item: ContentItem,
  cx: number,
  cy: number,
  size: number,
  style: Partial<GlyphStyle> = {}
): void {
  // Unknown types fall back to their text so a bad config still shows something sensible.
  (drawers.get(item.type) ?? drawText)(ctx, item, cx, cy, size, { ...DEFAULT_GLYPH_STYLE, ...style });
}

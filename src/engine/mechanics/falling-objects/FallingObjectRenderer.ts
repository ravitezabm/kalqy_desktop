import type Phaser from "phaser";
import type { ObjectDefinition } from "./ObjectDefinition";

export interface RenderedObject {
  textureKey: string;
  /** Texture pixel height, so callers can scale to `displayHeight`. */
  frameHeight: number;
}

/**
 * Turns an ObjectDefinition's visual into a texture. Sprites use what the
 * preload scene loaded; text and shapes are drawn once and cached — so a
 * backend that sends "the number 4" needs no art at all. `custom` renderers
 * fall back to text until a game registers a better one.
 */
export function renderObject(scene: Phaser.Scene, definition: ObjectDefinition): RenderedObject | null {
  const { visual } = definition;
  const textures = scene.textures;

  if ((visual.renderer === "sprite" || visual.renderer === "icon") && visual.textureKey) {
    if (!textures.exists(visual.textureKey)) return null;
    return { textureKey: visual.textureKey, frameHeight: textures.get(visual.textureKey).getSourceImage().height };
  }

  const size = 160;
  if (visual.renderer === "shape") {
    const key = `obj-shape-${visual.shape ?? "circle"}-${visual.color ?? "#ffb703"}`;
    if (!textures.exists(key)) drawShape(scene, key, size, visual.shape ?? "circle", visual.color ?? "#ffb703");
    return { textureKey: key, frameHeight: size };
  }

  const text = visual.text ?? String(definition.value ?? definition.id);
  const key = `obj-text-${text}-${visual.color ?? "#ffffff"}`;
  if (!textures.exists(key)) drawText(scene, key, size, text, visual.color ?? "#ffb703");
  return { textureKey: key, frameHeight: size };
}

function bubble(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  const grad = ctx.createRadialGradient(size * 0.38, size * 0.32, size * 0.05, size / 2, size / 2, size * 0.5);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.25, color);
  grad.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.55;
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2);
  ctx.stroke();
}

function drawText(scene: Phaser.Scene, key: string, size: number, text: string, color: string): void {
  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) return;
  const ctx = tex.getContext();
  bubble(ctx, size, color);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(40,20,0,0.55)";
  ctx.lineWidth = 9;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${text.length > 2 ? 62 : 92}px "Baloo 2", "Nunito", system-ui, sans-serif`;
  ctx.strokeText(text, size / 2, size / 2 + 4);
  ctx.fillText(text, size / 2, size / 2 + 4);
  tex.refresh();
}

function drawShape(scene: Phaser.Scene, key: string, size: number, shape: string, color: string): void {
  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 7;
  ctx.beginPath();
  const c = size / 2;
  const r = size * 0.42;
  if (shape === "square") ctx.roundRect(c - r, c - r, r * 2, r * 2, 18);
  else if (shape === "triangle") {
    ctx.moveTo(c, c - r);
    ctx.lineTo(c + r, c + r * 0.85);
    ctx.lineTo(c - r, c + r * 0.85);
    ctx.closePath();
  } else if (shape === "star") {
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 === 0 ? r : r * 0.45;
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      ctx.lineTo(c + Math.cos(angle) * radius, c + Math.sin(angle) * radius);
    }
    ctx.closePath();
  } else ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  tex.refresh();
}

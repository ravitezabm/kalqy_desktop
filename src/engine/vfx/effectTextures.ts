/** Soft textures shared by every game's shadows, trails and celebrations — generated, no extra asset files. */
export function createEffectTextures(textures: Phaser.Textures.TextureManager): void {
  if (!textures.exists("shadow")) {
    const tex = textures.createCanvas("shadow", 256, 96);
    const ctx = tex!.getContext();
    ctx.save();
    ctx.translate(128, 48);
    ctx.scale(1, 96 / 256);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 128);
    g.addColorStop(0, "rgba(0,0,0,0.55)");
    g.addColorStop(0.6, "rgba(0,0,0,0.28)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 128, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    tex!.refresh();
  }
  if (!textures.exists("spark")) {
    const tex = textures.createCanvas("spark", 64, 64);
    const ctx = tex!.getContext();
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.3, "rgba(255,255,255,0.7)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    tex!.refresh();
  }
  if (!textures.exists("droplet")) {
    const tex = textures.createCanvas("droplet", 32, 48);
    const ctx = tex!.getContext();
    const g = ctx.createRadialGradient(13, 30, 2, 16, 28, 16);
    g.addColorStop(0, "rgba(230,248,255,0.95)");
    g.addColorStop(0.6, "rgba(120,200,255,0.85)");
    g.addColorStop(1, "rgba(60,150,240,0.7)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(16, 2);
    ctx.bezierCurveTo(28, 20, 30, 28, 30, 32);
    ctx.arc(16, 32, 14, 0, Math.PI, false);
    ctx.bezierCurveTo(2, 28, 4, 20, 16, 2);
    ctx.fill();
    tex!.refresh();
  }
  if (!textures.exists("puff")) {
    const tex = textures.createCanvas("puff", 96, 96);
    const ctx = tex!.getContext();
    const g = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
    g.addColorStop(0, "rgba(255,255,255,0.75)");
    g.addColorStop(0.5, "rgba(255,255,255,0.3)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 96, 96);
    tex!.refresh();
  }
}


import Phaser from "phaser";

/** Soft textures shared by the shadows, trail and celebration — generated, no extra asset files. */
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
}

const CONFETTI_COLORS = [0xff4f4f, 0x00aeef, 0xffd166, 0xa855c9, 0x7cb928, 0xff9ecb];

/** Confetti + sparkle burst + expanding rings, centered on (x, y). */
export function playCelebration(scene: Phaser.Scene, x: number, y: number, accent: number): void {
  for (let r = 0; r < 2; r++) {
    const ring = scene.add.circle(x, y, 30, accent, 0).setStrokeStyle(8 - r * 3, r ? 0xffffff : 0xffd166, 0.9).setDepth(45);
    scene.tweens.add({
      targets: ring,
      scale: 5 + r * 2,
      alpha: 0,
      duration: 800 + r * 250,
      delay: r * 140,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });
  }

  for (let i = 0; i < 46; i++) {
    const angle = Phaser.Math.FloatBetween(-Math.PI * 0.95, -Math.PI * 0.05);
    const speed = Phaser.Math.Between(180, 420);
    const piece = scene.add
      .rectangle(x, y, Phaser.Math.Between(8, 14), Phaser.Math.Between(14, 22), Phaser.Utils.Array.GetRandom(CONFETTI_COLORS))
      .setDepth(46)
      .setRotation(Math.random() * Math.PI);
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed;
    scene.tweens.add({
      targets: piece,
      x: x + dx * 1.1,
      y: [y + dy, y + dy + 380],
      angle: piece.angle + Phaser.Math.Between(-540, 540),
      scaleX: { from: 1, to: 0.15 },
      alpha: { from: 1, to: 0 },
      duration: Phaser.Math.Between(1200, 1900),
      ease: "Sine.easeOut",
      onComplete: () => piece.destroy(),
    });
  }

  for (let i = 0; i < 18; i++) {
    const spark = scene.add.image(x, y, "spark").setDepth(47).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff2a8);
    const angle = (i / 18) * Math.PI * 2;
    const dist = Phaser.Math.Between(90, 200);
    scene.tweens.add({
      targets: spark,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      scale: { from: 1, to: 0 },
      alpha: { from: 1, to: 0 },
      duration: 900,
      ease: "Cubic.easeOut",
      onComplete: () => spark.destroy(),
    });
  }
}

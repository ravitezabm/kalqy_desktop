import type Phaser from "phaser";

interface Layer {
  object: Phaser.GameObjects.Components.Transform;
  baseX: number;
  baseY: number;
  /** Max pixel shift at full input. Nearer layers get a bigger number. */
  strength: number;
}

/**
 * Depth-based camera parallax (PROMPT section 36): each layer slides by its
 * own strength so far scenery barely moves and the foreground sweeps past.
 * Input is -1..1 per axis (e.g. the hand's position around screen center);
 * with no input it drifts gently so the world never looks frozen. Layers
 * must be over-scaled by at least their strength so edges never show.
 */
export class ParallaxSystem {
  private layers: Layer[] = [];
  private current = { x: 0, y: 0 };
  private elapsed = 0;

  add(object: Phaser.GameObjects.Components.Transform, strength: number): void {
    this.layers.push({ object, baseX: object.x, baseY: object.y, strength });
  }

  remove(object: Phaser.GameObjects.Components.Transform): void {
    this.layers = this.layers.filter((layer) => layer.object !== object);
  }

  /** Re-reads each layer's rest position (call after moving a layer on purpose). */
  rebase(): void {
    this.layers.forEach((layer) => {
      layer.baseX = layer.object.x;
      layer.baseY = layer.object.y;
    });
  }

  update(deltaMs: number, input: { x: number; y: number } | null): void {
    this.elapsed += deltaMs / 1000;

    const target = input ?? {
      x: Math.sin(this.elapsed * 0.35) * 0.45,
      y: Math.sin(this.elapsed * 0.27 + 1.3) * 0.2,
    };

    const ease = 1 - Math.pow(0.001, deltaMs / 1000);
    this.current.x += (target.x - this.current.x) * ease * 0.35;
    this.current.y += (target.y - this.current.y) * ease * 0.35;

    for (const layer of this.layers) {
      layer.object.x = layer.baseX - this.current.x * layer.strength;
      layer.object.y = layer.baseY - this.current.y * layer.strength * 0.4;
    }
  }
}

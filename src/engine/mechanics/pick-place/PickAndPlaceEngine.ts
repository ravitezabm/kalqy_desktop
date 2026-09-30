import { validateAnswer, type AnswerVerdict } from "../answer/AnswerValidator";
import type { AnswerOption, ContentItem } from "../../content/types";

export type PickState = "ground" | "dragging" | "returning" | "placed";

export interface PickItem {
  id: string;
  option: AnswerOption;
  x: number;
  y: number;
  /** How close the hand has to be to grab it (px). */
  radius: number;
  /** Where it goes back to after a miss. */
  homeX: number;
  homeY: number;
  state: PickState;
  /** Drag-start offset from the hand, so it never jumps to the fingertip. */
  offsetX: number;
  offsetY: number;
}

export interface DropZone {
  id: string;
  x: number;
  y: number;
  /** Release within this distance counts as a drop on the zone (px). */
  dropRadius: number;
  /** A correct option is gently pulled in from this far away (px). */
  magnetRadius: number;
  expected: ContentItem;
}

export interface HandInput {
  visible: boolean;
  confidence: number;
  x: number;
  y: number;
  /** The configured grab gesture is being held (fist / pinch). */
  grabbing: boolean;
}

export interface PickPlaceConfig {
  confidenceThreshold: number;
  /** 0..1 per 60fps frame — how quickly a dragged item catches up to the hand. */
  dragFollow: number;
  /** 0..1 — how strongly a correct option is drawn toward a nearby zone. */
  magnetStrength: number;
  /** Keep holding an item this long if the hand briefly disappears, then let go. */
  handLostGraceMs: number;
  returnDurationMs: number;
}

export const DEFAULT_PICK_PLACE: PickPlaceConfig = {
  confidenceThreshold: 0.55,
  dragFollow: 0.4,
  magnetStrength: 0.45,
  handLostGraceMs: 500,
  returnDurationMs: 420,
};

export type PickPlaceEvent =
  | { type: "hover"; itemId: string | null }
  | { type: "picked"; item: PickItem }
  | { type: "dropped"; item: PickItem; zone: DropZone | null; verdict: AnswerVerdict | "none" }
  | { type: "correct"; item: PickItem; zone: DropZone }
  | { type: "incorrect"; item: PickItem; zone: DropZone }
  | { type: "missed"; item: PickItem }
  | { type: "returned"; item: PickItem }
  | { type: "handLost"; item: PickItem }
  | { type: "handRecovered"; item: PickItem };

/**
 * Subject-blind pick → drag → drop logic. It knows items, zones and a hand
 * sample in plain pixels; it doesn't know about Phaser, eggs, letters or
 * MediaPipe. The game feeds it the hand each frame and renders the result.
 *
 * Picking needs a grab *gesture starting* while hovering with a confident
 * hand, so a hand that is already closed when it drifts over an item (or a
 * noisy frame) can't grab it.
 */
export class PickAndPlaceEngine {
  private hoveredId: string | null = null;
  private draggingId: string | null = null;
  private wasGrabbing = false;
  private lostForMs = 0;
  private returns = new Map<string, { fromX: number; fromY: number; elapsed: number }>();

  constructor(
    readonly items: PickItem[],
    readonly zones: DropZone[],
    private readonly config: PickPlaceConfig = DEFAULT_PICK_PLACE
  ) {}

  get dragging(): PickItem | null {
    return this.items.find((i) => i.id === this.draggingId) ?? null;
  }

  get hovered(): string | null {
    return this.hoveredId;
  }

  /** 0..1: how close the dragged, correct item is to being pulled into a zone (for target glow). */
  approach(): { zone: DropZone; amount: number } | null {
    const item = this.dragging;
    if (!item) return null;
    let best: { zone: DropZone; amount: number } | null = null;
    for (const zone of this.zones) {
      const amount = Math.max(0, 1 - Math.hypot(item.x - zone.x, item.y - zone.y) / zone.magnetRadius);
      if (amount > 0 && (!best || amount > best.amount)) best = { zone, amount };
    }
    return best;
  }

  update(hand: HandInput, deltaMs: number): PickPlaceEvent[] {
    const events: PickPlaceEvent[] = [];
    this.stepReturns(deltaMs, events);

    const usable = hand.visible && hand.confidence >= this.config.confidenceThreshold;
    const dragging = this.dragging;

    if (dragging) {
      this.updateDrag(dragging, hand, usable, deltaMs, events);
    } else {
      const hovered = usable ? this.nearestGrabbable(hand) : null;
      if (hovered?.id !== this.hoveredId) {
        this.hoveredId = hovered?.id ?? null;
        events.push({ type: "hover", itemId: this.hoveredId });
      }
      if (hovered && hand.grabbing && !this.wasGrabbing) this.startDrag(hovered, hand, events);
    }

    this.wasGrabbing = hand.grabbing && usable;
    return events;
  }

  /** Put everything back to its starting state (level restart). */
  reset(): void {
    this.hoveredId = null;
    this.draggingId = null;
    this.wasGrabbing = false;
    this.lostForMs = 0;
    this.returns.clear();
    this.items.forEach((i) => {
      i.state = "ground";
      i.x = i.homeX;
      i.y = i.homeY;
    });
  }

  private nearestGrabbable(hand: HandInput): PickItem | null {
    let best: PickItem | null = null;
    let bestDistance = Infinity;
    for (const item of this.items) {
      if (item.state !== "ground") continue;
      const d = Math.hypot(hand.x - item.x, hand.y - item.y);
      if (d <= item.radius && d < bestDistance) {
        best = item;
        bestDistance = d;
      }
    }
    return best;
  }

  private startDrag(item: PickItem, hand: HandInput, events: PickPlaceEvent[]): void {
    this.draggingId = item.id;
    item.state = "dragging";
    // A wrong drop sends it back to exactly where it was picked up.
    item.homeX = item.x;
    item.homeY = item.y;
    item.offsetX = item.x - hand.x;
    item.offsetY = item.y - hand.y;
    this.lostForMs = 0;
    this.hoveredId = null;
    events.push({ type: "picked", item });
  }

  private updateDrag(item: PickItem, hand: HandInput, usable: boolean, deltaMs: number, events: PickPlaceEvent[]): void {
    if (!usable) {
      // Hold still for a moment — a tracking blip must never teleport or drop the egg.
      if (this.lostForMs === 0) events.push({ type: "handLost", item });
      this.lostForMs += deltaMs;
      if (this.lostForMs >= this.config.handLostGraceMs) this.release(item, events);
      return;
    }
    if (this.lostForMs > 0) events.push({ type: "handRecovered", item });
    this.lostForMs = 0;

    const follow = 1 - Math.pow(1 - this.config.dragFollow, deltaMs / (1000 / 60));
    let targetX = hand.x + item.offsetX;
    let targetY = hand.y + item.offsetY;

    // Only a correct option feels the pull — guessing is never made easier for wrong ones.
    for (const zone of this.zones) {
      if (validateAnswer(item.option, zone) !== "correct") continue;
      const d = Math.hypot(targetX - zone.x, targetY - zone.y);
      if (d < zone.magnetRadius) {
        const pull = this.config.magnetStrength * (1 - d / zone.magnetRadius);
        targetX += (zone.x - targetX) * pull;
        targetY += (zone.y - targetY) * pull;
      }
    }
    item.x += (targetX - item.x) * follow;
    item.y += (targetY - item.y) * follow;

    if (!hand.grabbing) this.release(item, events);
  }

  private release(item: PickItem, events: PickPlaceEvent[]): void {
    this.draggingId = null;
    this.lostForMs = 0;

    let zone: DropZone | null = null;
    let best = Infinity;
    for (const z of this.zones) {
      const d = Math.hypot(item.x - z.x, item.y - z.y);
      if (d <= z.dropRadius && d < best) {
        zone = z;
        best = d;
      }
    }

    if (!zone) {
      events.push({ type: "dropped", item, zone: null, verdict: "none" });
      events.push({ type: "missed", item });
      this.beginReturn(item);
      return;
    }
    const verdict = validateAnswer(item.option, zone);
    events.push({ type: "dropped", item, zone, verdict });
    if (verdict === "correct") {
      item.state = "placed";
      item.x = zone.x;
      item.y = zone.y;
      events.push({ type: "correct", item, zone });
    } else {
      events.push({ type: "incorrect", item, zone });
      this.beginReturn(item);
    }
  }

  private beginReturn(item: PickItem): void {
    item.state = "returning";
    this.returns.set(item.id, { fromX: item.x, fromY: item.y, elapsed: 0 });
  }

  private stepReturns(deltaMs: number, events: PickPlaceEvent[]): void {
    for (const [id, r] of this.returns) {
      const item = this.items.find((i) => i.id === id);
      if (!item) continue;
      r.elapsed += deltaMs;
      const t = Math.min(1, r.elapsed / this.config.returnDurationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      item.x = r.fromX + (item.homeX - r.fromX) * eased;
      item.y = r.fromY + (item.homeY - r.fromY) * eased;
      if (t >= 1) {
        item.state = "ground";
        this.returns.delete(id);
        events.push({ type: "returned", item });
      }
    }
  }
}

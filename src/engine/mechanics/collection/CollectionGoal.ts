import type { ObjectDefinition } from "../falling-objects/ObjectDefinition";
import { ruleMatches, type CollectionRule } from "./CollectionRule";

export interface GoalTarget {
  rule: CollectionRule;
  count: number;
  label: string;
  iconUrl?: string;
}

export interface CatchResult {
  /** The object matches some target of this goal. */
  matched: boolean;
  /** It matched and that target still needed one, so progress moved. */
  accepted: boolean;
  targetIndex: number;
  /** This catch filled its target. */
  targetDone: boolean;
  allDone: boolean;
}

/** "Collect 3 apples and 2 bananas" — each target progresses on its own. */
export class CollectionGoal {
  private readonly collected: number[];

  constructor(readonly targets: readonly GoalTarget[]) {
    this.collected = targets.map(() => 0);
  }

  record(definition: ObjectDefinition): CatchResult {
    const targetIndex = this.targets.findIndex((target) => ruleMatches(target.rule, definition));
    if (targetIndex < 0) return { matched: false, accepted: false, targetIndex, targetDone: false, allDone: this.isComplete() };

    const accepted = this.remaining(targetIndex) > 0;
    if (accepted) this.collected[targetIndex] += 1;
    return { matched: true, accepted, targetIndex, targetDone: accepted && this.remaining(targetIndex) === 0, allDone: this.isComplete() };
  }

  remaining(index: number): number {
    return Math.max(0, this.targets[index].count - this.collected[index]);
  }

  /** Index of a target this object would still advance, or -1. */
  wants(definition: ObjectDefinition): number {
    return this.targets.findIndex((target, i) => this.remaining(i) > 0 && ruleMatches(target.rule, definition));
  }

  isComplete(): boolean {
    return this.targets.every((_, i) => this.remaining(i) === 0);
  }

  /** 0..1 over every target's required count. */
  progress(): number {
    const total = this.targets.reduce((sum, t) => sum + t.count, 0);
    const done = this.targets.reduce((sum, t, i) => sum + Math.min(t.count, this.collected[i]), 0);
    return total === 0 ? 1 : done / total;
  }

  rows(): { id: string; label: string; value: number; target: number; image?: string }[] {
    return this.targets.map((target, i) => ({ id: `goal-${i}`, label: target.label, value: this.collected[i], target: target.count, image: target.iconUrl }));
  }
}

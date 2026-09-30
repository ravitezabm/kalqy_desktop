import type { ObjectDefinition } from "../falling-objects/ObjectDefinition";

export type RuleOperator = "equals" | "notEquals" | "greaterThan" | "lessThan" | "in";

/**
 * "Which objects count?" as data. Levels (or a backend) pick a rule; the
 * engine evaluates it against ObjectDefinitions — it never contains
 * fruit-specific or subject-specific comparisons.
 */
export type CollectionRule =
  | { type: "objectId"; objectId: string }
  | { type: "category"; category: string }
  | { type: "tag"; tag: string }
  | { type: "value"; op: RuleOperator; value: number | string | (number | string)[] }
  /** A rule registered in code via registerCollectionRule — config can only name it, never ship code. */
  | { type: "custom"; name: string };

const customRules = new Map<string, (definition: ObjectDefinition) => boolean>();

export function registerCollectionRule(name: string, test: (definition: ObjectDefinition) => boolean): void {
  customRules.set(name, test);
}

function compare(actual: number | string | undefined, op: RuleOperator, expected: number | string | (number | string)[]): boolean {
  if (actual === undefined) return false;
  switch (op) {
    case "equals":
      return actual === expected;
    case "notEquals":
      return actual !== expected;
    case "greaterThan":
      return typeof expected !== "object" && actual > expected;
    case "lessThan":
      return typeof expected !== "object" && actual < expected;
    case "in":
      return Array.isArray(expected) && expected.includes(actual);
  }
}

export function ruleMatches(rule: CollectionRule, definition: ObjectDefinition): boolean {
  switch (rule.type) {
    case "objectId":
      return definition.id === rule.objectId;
    case "category":
      return definition.category === rule.category;
    case "tag":
      return definition.tags?.includes(rule.tag) ?? false;
    case "value":
      return compare(definition.value, rule.op, rule.value);
    case "custom":
      return customRules.get(rule.name)?.(definition) ?? false;
  }
}

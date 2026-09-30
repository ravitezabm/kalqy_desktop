import type { ObjectDefinition } from "./ObjectDefinition";

/** The catalogue of everything a game may drop. Levels refer to objects by id only. */
export class ObjectRegistry {
  private readonly items = new Map<string, ObjectDefinition>();

  constructor(definitions: readonly ObjectDefinition[] = []) {
    definitions.forEach((definition) => this.register(definition));
  }

  register(definition: ObjectDefinition): void {
    this.items.set(definition.id, definition);
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  get(id: string): ObjectDefinition | undefined {
    return this.items.get(id);
  }

  all(): ObjectDefinition[] {
    return [...this.items.values()];
  }

  /** Problems that would make an object unsafe to spawn (empty = fine). */
  validate(id: string, assetExists: (textureKey: string) => boolean = () => true): string[] {
    const definition = this.items.get(id);
    if (!definition) return [`unknown object "${id}"`];
    const problems: string[] = [];
    if (!Number.isFinite(definition.score)) problems.push(`${id}: score is not a number`);
    if (!(definition.visual.displayHeight > 0)) problems.push(`${id}: displayHeight must be positive`);
    const { renderer, textureKey, text } = definition.visual;
    if ((renderer === "sprite" || renderer === "icon") && (!textureKey || !assetExists(textureKey))) problems.push(`${id}: texture "${textureKey}" is not loaded`);
    if (renderer === "text" && !text) problems.push(`${id}: text renderer needs text`);
    return problems;
  }
}

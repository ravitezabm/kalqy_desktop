import type { CharacterState, CharacterStateMachine } from "./CharacterStateMachine";

export type ReactionEvent = "correctCatch" | "wrongCatch" | "hazardCatch" | "levelComplete" | "storyComplete";

/** For each event, which state each named character enters (missing = no reaction). */
export type ReactionTable<Role extends string> = Record<ReactionEvent, Partial<Record<Role, CharacterState>>>;

/**
 * Several characters reacting to gameplay events from one table, so "what
 * does the lion do when the kid catches a rotten fruit?" is data, not code.
 */
export class CharacterReactionManager<Role extends string> {
  private readonly machines = new Map<Role, CharacterStateMachine>();

  constructor(private readonly table: ReactionTable<Role>) {}

  register(role: Role, machine: CharacterStateMachine): void {
    this.machines.set(role, machine);
  }

  fire(event: ReactionEvent): void {
    const reactions = this.table[event];
    for (const [role, state] of Object.entries(reactions) as [Role, CharacterState][]) this.machines.get(role)?.enter(state);
  }

  update(deltaMs: number): void {
    this.machines.forEach((machine) => machine.update(deltaMs));
  }

  reset(): void {
    this.machines.forEach((machine) => machine.reset());
  }
}

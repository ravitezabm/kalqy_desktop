import { describe, expect, it } from "vitest";
import { CharacterReactionManager, type ReactionTable } from "./CharacterReactionManager";
import { CharacterStateMachine } from "./CharacterStateMachine";

const TABLE: ReactionTable<"kid" | "lion"> = {
  correctCatch: { kid: "happy", lion: "happy" },
  wrongCatch: { kid: "fail" },
  hazardCatch: { kid: "fail", lion: "fail" },
  levelComplete: { kid: "happy" },
  storyComplete: { kid: "celebrate", lion: "celebrate" },
};

describe("CharacterReactionManager", () => {
  it("drives each registered character from the table", () => {
    const kid = new CharacterStateMachine();
    const lion = new CharacterStateMachine();
    const reactions = new CharacterReactionManager(TABLE);
    reactions.register("kid", kid);
    reactions.register("lion", lion);

    reactions.fire("wrongCatch");
    expect(kid.state).toBe("fail");
    expect(lion.state).toBe("idle");

    reactions.fire("correctCatch");
    expect(kid.state).toBe("happy");
    expect(lion.state).toBe("happy");
  });

  it("lets transient reactions expire back to idle", () => {
    const kid = new CharacterStateMachine();
    const reactions = new CharacterReactionManager(TABLE);
    reactions.register("kid", kid);
    reactions.fire("hazardCatch");
    reactions.update(5000);
    expect(kid.state).toBe("idle");
  });
});

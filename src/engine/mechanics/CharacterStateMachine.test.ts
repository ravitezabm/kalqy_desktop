import { describe, expect, it } from "vitest";
import { CharacterStateMachine, type CharacterState } from "./CharacterStateMachine";

function machine() {
  const m = new CharacterStateMachine();
  const changes: CharacterState[] = [];
  m.onChange((state) => changes.push(state));
  return { m, changes };
}

describe("CharacterStateMachine", () => {
  it("only notifies on a real change", () => {
    const { m, changes } = machine();
    m.setMoving(false);
    m.setMoving(false);
    m.setMoving(true);
    m.setMoving(true);
    expect(changes).toEqual(["moving"]);
  });

  it("plays happy once then returns to its resting state", () => {
    const { m, changes } = machine();
    m.setMoving(true);
    m.enter("happy");
    m.update(2000);
    expect(changes).toEqual(["moving", "happy", "moving"]);
  });

  it("fail expires back to idle", () => {
    const { m } = machine();
    m.enter("fail");
    expect(m.state).toBe("fail");
    m.update(1500);
    expect(m.state).toBe("idle");
  });

  it("celebrate is sticky until reset", () => {
    const { m } = machine();
    m.enter("celebrate");
    m.enter("fail");
    m.update(5000);
    expect(m.state).toBe("celebrate");
    m.reset();
    expect(m.state).toBe("idle");
  });
});

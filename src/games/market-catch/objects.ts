import { ObjectRegistry } from "../../engine/mechanics/falling-objects/ObjectRegistry";
import type { ObjectDefinition } from "../../engine/mechanics/falling-objects/ObjectDefinition";
import { FRUIT_IDS, MARKET_ASSETS, type FruitId } from "./assets";

/** On-screen height (px) of each fruit at scale 1 — sized so every one is easy to see and catch. */
const FRUIT_HEIGHT: Record<FruitId, number> = {
  apple: 135,
  orange: 130,
  banana: 153,
  watermelon: 146,
  strawberry: 130,
  coconut: 130,
  pear: 143,
  grape: 146,
};

export const fruitTexture = (id: string) => `fruit_${id}`;

/** Fresh fruit is collectible; rotten fruit is a hazard. Points here are defaults — a level's scoring overrides them. */
export function fruitDefinitions(): ObjectDefinition[] {
  return FRUIT_IDS.flatMap((fruit) =>
    (["fresh", "rotten"] as const).map((variant): ObjectDefinition => {
      const id = `${fruit}_${variant}`;
      return {
        id,
        type: "fruit",
        category: "fruit",
        tags: [fruit, variant],
        value: fruit,
        visual: { renderer: "sprite", textureKey: fruitTexture(id), displayHeight: FRUIT_HEIGHT[fruit], iconUrl: MARKET_ASSETS.fruits[id] },
        behavior: { collectible: variant === "fresh", hazard: variant === "rotten" },
        score: variant === "fresh" ? 10 : -10,
      };
    })
  );
}

export const FRUIT_REGISTRY = new ObjectRegistry(fruitDefinitions());

/**
 * What a falling thing *is*, separate from how it looks. A fruit, a number, a
 * shape or a science object are all the same kind of record — the engine never
 * branches on "apple", only on these fields (and on CollectionRules over them).
 */
export interface ObjectVisual {
  renderer: "sprite" | "text" | "shape" | "icon" | "custom";
  /** sprite/icon: a texture already loaded by the game's preload scene. */
  textureKey?: string;
  /** text renderer. */
  text?: string;
  /** text/shape fill, CSS color. */
  color?: string;
  shape?: "circle" | "square" | "triangle" | "star";
  /** Height on screen at scale 1, in game pixels. */
  displayHeight: number;
  /** Small picture for HUD goal rows. */
  iconUrl?: string;
}

export interface ObjectDefinition {
  id: string;
  /** Free-form kind: "fruit", "number", "letter", "animal"... */
  type: string;
  category: string;
  tags?: string[];
  /** Whatever a rule may compare: 4, "apple", ... */
  value?: number | string;
  visual: ObjectVisual;
  behavior: { collectible: boolean; hazard: boolean };
  /** Default points; a level's scoring config may override per outcome. */
  score: number;
  /** Relative spawn weight inside its pool. */
  weight?: number;
}

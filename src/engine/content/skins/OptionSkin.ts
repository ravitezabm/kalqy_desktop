import type Phaser from "phaser";
import type { ContentItem } from "../types";
import type { GlyphStyle } from "../ContentRenderer";

/** How an option looks, separate from WHAT it is. Egg today; card / circle / sprite skins plug in here. */
export interface OptionSkinStyle {
  primaryColor: string;
  secondaryColor: string;
  highlightColor?: string;
  speckleColor?: string;
  outlineColor?: string;
  glyph?: Partial<GlyphStyle>;
  /** Letter size relative to the skin's height (0..1). */
  glyphScale?: number;
}

export interface RenderedSkin {
  textureKey: string;
  width: number;
  height: number;
  /** Radius for physics/hit area, as a fraction of width. */
  bodyRadiusRatio: number;
}

export interface OptionSkin {
  id: string;
  /** Draws `content` inside the skin into a cached canvas texture. */
  render(textures: Phaser.Textures.TextureManager, content: ContentItem, style: OptionSkinStyle): RenderedSkin;
}

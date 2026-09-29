import type { FlowerColorId } from "../config/levels.config";

/**
 * Matching is by logical color id, never by how a color happens to render
 * (PROMPT section 42), so shapes/patterns can replace color later without
 * touching this.
 */
export function isMatch(butterflyColorId: FlowerColorId, targetColorId: FlowerColorId): boolean {
  return butterflyColorId === targetColorId;
}

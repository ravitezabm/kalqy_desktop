import Phaser from "phaser";

/**
 * Builds a Phaser animation from an atlas, using the frame duration stored
 * in the atlas's own JSON (Phaser drops that field, so games load the JSON a
 * second time under `${atlasKey}-data`). Built once at preload — never per frame.
 */
export function createAtlasAnimation(
  scene: Phaser.Scene,
  animKey: string,
  textureKey: string,
  dataKey: string,
  loop: boolean
): void {
  if (scene.anims.exists(animKey)) return;
  const frames = scene.textures.get(textureKey).getFrameNames().sort();
  const data = scene.cache.json.get(dataKey) as { frames: Record<string, { duration?: number }> } | undefined;
  const frameDuration = data?.frames[frames[0]]?.duration ?? 100;
  scene.anims.create({
    key: animKey,
    frames: frames.map((frame) => ({ key: textureKey, frame })),
    frameRate: 1000 / frameDuration,
    repeat: loop ? -1 : 0,
  });
}

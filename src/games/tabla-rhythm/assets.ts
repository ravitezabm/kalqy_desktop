const BASE = "/games/tabla-rhythm";

/** The four supplied drums, left to right by default. */
export const TABLA_SKINS = [
  { id: "blue", image: `${BASE}/tablas/tabla-blue.webp`, glow: 0x5aa8ff },
  { id: "green", image: `${BASE}/tablas/tabla-green.webp`, glow: 0x6fe39a },
  { id: "orange", image: `${BASE}/tablas/tabla-orange.webp`, glow: 0xffb347 },
  { id: "red", image: `${BASE}/tablas/tabla-red.webp`, glow: 0xff6b6b },
] as const;

/** Stroke samples actually used (the supplied bank has 17; only these are decoded for this game). */
export const STROKES = ["ga", "na", "tin", "dha", "dhin", "tun", "tak", "ka"] as const;
export type StrokeId = (typeof STROKES)[number];

const samples: Record<string, string> = {};
for (const id of STROKES) samples[id] = `${BASE}/audio/${id}.wav`;

const atlas = (name: string) => ({ image: `${BASE}/characters/${name}.webp`, data: `${BASE}/characters/${name}.json` });

/** Every Tabla Rhythm asset by ID — gameplay code never contains raw paths. */
export const TABLA_ASSETS = {
  images: { background: `${BASE}/background.webp`, ...Object.fromEntries(TABLA_SKINS.map((s) => [`tabla-${s.id}`, s.image])) } as Record<string, string>,
  atlases: { kidIdle: atlas("kid-idle"), kidWin: atlas("kid-win") },
  samples,
  /** The first story episode is shared with the other games. */
  episodeVideo: "/games/butterfly/episode/episode1.mp4",
  /** No track: the game makes its own music (drone, bells, the pattern itself). */
  musicTrack: "",
} as const;

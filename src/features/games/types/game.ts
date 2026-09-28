import type {
  AgeRangeId,
  DevelopmentAreaId,
  DifficultyId,
  GameTypeId,
  InputTypeId,
  SkillId,
  SubjectId,
} from "./taxonomy";

/**
 * The canonical game entity — shared by the Games explorer and the World
 * dashboard's "Continue Playing" so there is only ever one game model.
 * All taxonomy fields hold canonical IDs, never display labels.
 */
export interface Game {
  id: string;
  slug: string;

  title: string;
  description: string;

  image?: string;
  accent?: string;

  subjects: SubjectId[];
  skills: SkillId[];
  developmentAreas: DevelopmentAreaId[];
  gameTypes: GameTypeId[];
  inputTypes: InputTypeId[];

  ageRange: { min: number; max: number };
  difficulty: DifficultyId;

  /** Per-profile progress; absent when the child hasn't started the game. */
  level?: number;
  progress?: number;

  popularity?: number;
  /** ISO date — drives "Recently Added" sorting. */
  addedAt?: string;
  featured?: boolean;

  playable: boolean;
  route?: string;
}

/**
 * Centralised filter state. Within a group the values are OR'd; between
 * groups they are AND'd (see filterGames).
 */
export interface GameFilters {
  subjects: SubjectId[];
  skills: SkillId[];
  developmentAreas: DevelopmentAreaId[];
  gameTypes: GameTypeId[];
  inputTypes: InputTypeId[];
  ageRanges: AgeRangeId[];
  difficulties: DifficultyId[];
}

export const EMPTY_FILTERS: GameFilters = {
  subjects: [],
  skills: [],
  developmentAreas: [],
  gameTypes: [],
  inputTypes: [],
  ageRanges: [],
  difficulties: [],
};

export type GameFilterGroup = keyof GameFilters;

export const FILTER_GROUPS: GameFilterGroup[] = [
  "subjects",
  "skills",
  "developmentAreas",
  "gameTypes",
  "inputTypes",
  "ageRanges",
  "difficulties",
];

export function countActiveFilters(filters: GameFilters): number {
  return FILTER_GROUPS.reduce((total, group) => total + filters[group].length, 0);
}

export type GameSortOption = "popular" | "recent" | "a-z" | "progress" | "difficulty";

export const SORT_OPTIONS: { id: GameSortOption; label: string }[] = [
  { id: "popular", label: "Popular" },
  { id: "recent", label: "Recently Added" },
  { id: "a-z", label: "A–Z" },
  { id: "progress", label: "Progress" },
  { id: "difficulty", label: "Difficulty" },
];

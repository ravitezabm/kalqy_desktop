/**
 * Canonical Kalqy game taxonomy.
 *
 * Every dimension is a separate axis on purpose: a game's SUBJECT (what it
 * teaches), its SKILLS (what thinking it exercises), its DEVELOPMENT AREAS
 * (what it grows physically/cognitively/socially) and its INPUT TYPES (how
 * the child interacts) vary independently. Combinations like
 * "Mathematics + Motor Skills" therefore fall out of the metadata instead of
 * needing their own category.
 *
 * IDs are the stable identity — labels are display-only and localisable.
 * Never use a label as a key.
 */

export interface TaxonomyTerm {
  id: string;
  label: string;
}

export const SUBJECTS = [
  { id: "mathematics", label: "Mathematics" },
  { id: "english-literacy", label: "English / Literacy" },
  { id: "science", label: "Science" },
  { id: "music", label: "Music" },
  { id: "art-creativity", label: "Art & Creativity" },
  { id: "life-skills", label: "Life Skills" },
  { id: "social-emotional", label: "Social & Emotional Learning" },
] as const satisfies readonly TaxonomyTerm[];

export const SKILLS = [
  { id: "problem-solving", label: "Problem Solving" },
  { id: "logic", label: "Logic" },
  { id: "memory", label: "Memory" },
  { id: "observation", label: "Observation" },
  { id: "creativity", label: "Creativity" },
  { id: "vocabulary", label: "Vocabulary" },
  { id: "reading", label: "Reading" },
  { id: "counting", label: "Counting" },
  { id: "pattern-recognition", label: "Pattern Recognition" },
  { id: "spatial-awareness", label: "Spatial Awareness" },
  { id: "attention", label: "Attention" },
  { id: "focus", label: "Focus" },
  { id: "reasoning", label: "Reasoning" },
  { id: "rhythm", label: "Rhythm" },
  { id: "communication", label: "Communication" },
] as const satisfies readonly TaxonomyTerm[];

export const DEVELOPMENT_AREAS = [
  { id: "physical-development", label: "Physical Development" },
  { id: "motor-skills", label: "Motor Skills" },
  { id: "fine-motor-skills", label: "Fine Motor Skills" },
  { id: "gross-motor-skills", label: "Gross Motor Skills" },
  { id: "hand-eye-coordination", label: "Hand-Eye Coordination" },
  { id: "spatial-awareness", label: "Spatial Awareness" },
  { id: "cognitive-skills", label: "Cognitive Skills" },
  { id: "social-skills", label: "Social Skills" },
  { id: "emotional-development", label: "Emotional Development" },
  { id: "language-development", label: "Language Development" },
  { id: "creative-development", label: "Creative Development" },
] as const satisfies readonly TaxonomyTerm[];

export const GAME_TYPES = [
  { id: "brain-game", label: "Brain Game" },
  { id: "puzzle", label: "Puzzle" },
  { id: "adventure", label: "Adventure" },
  { id: "movement", label: "Movement" },
  { id: "creativity", label: "Creativity" },
  { id: "memory", label: "Memory" },
  { id: "rhythm", label: "Rhythm" },
  { id: "tracing", label: "Tracing" },
  { id: "matching", label: "Matching" },
  { id: "drag-and-drop", label: "Drag & Drop" },
  { id: "exploration", label: "Exploration" },
  { id: "educational-adventure", label: "Educational Adventure" },
] as const satisfies readonly TaxonomyTerm[];

export const INPUT_TYPES = [
  { id: "finger-tracking", label: "Finger Tracking" },
  { id: "hand-tracking", label: "Hand Tracking" },
  { id: "drag-and-drop", label: "Drag & Drop" },
  { id: "full-body-movement", label: "Full Body Movement" },
  { id: "jumping", label: "Jumping" },
  { id: "squatting", label: "Squatting" },
  { id: "reaching", label: "Reaching" },
  { id: "stepping", label: "Stepping" },
  { id: "balance", label: "Balance" },
  { id: "gesture", label: "Gesture" },
  { id: "mouse-touch", label: "Mouse / Touch" },
  { id: "keyboard", label: "Keyboard" },
  { id: "controller", label: "Controller" },
] as const satisfies readonly TaxonomyTerm[];

export const DIFFICULTIES = [
  { id: "beginner", label: "Beginner" },
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "advanced", label: "Advanced" },
] as const satisfies readonly TaxonomyTerm[];

export interface AgeRangeTerm extends TaxonomyTerm {
  min: number;
  max: number;
}

/** Age filters match by *overlap* with a game's supported range. */
export const AGE_RANGES: readonly AgeRangeTerm[] = [
  { id: "3-4", label: "3–4", min: 3, max: 4 },
  { id: "4-5", label: "4–5", min: 4, max: 5 },
  { id: "5-6", label: "5–6", min: 5, max: 6 },
  { id: "6-7", label: "6–7", min: 6, max: 7 },
  { id: "7-8", label: "7–8", min: 7, max: 8 },
  { id: "8-10", label: "8–10", min: 8, max: 10 },
];

export type SubjectId = (typeof SUBJECTS)[number]["id"];
export type SkillId = (typeof SKILLS)[number]["id"];
export type DevelopmentAreaId = (typeof DEVELOPMENT_AREAS)[number]["id"];
export type GameTypeId = (typeof GAME_TYPES)[number]["id"];
export type InputTypeId = (typeof INPUT_TYPES)[number]["id"];
export type DifficultyId = (typeof DIFFICULTIES)[number]["id"];
export type AgeRangeId = (typeof AGE_RANGES)[number]["id"];

function toLookup(terms: readonly TaxonomyTerm[]): Record<string, string> {
  return Object.fromEntries(terms.map((term) => [term.id, term.label]));
}

/** id → label, for rendering badges/chips without duplicating strings. */
export const TAXONOMY_LABELS: Record<string, string> = {
  ...toLookup(SUBJECTS),
  ...toLookup(SKILLS),
  ...toLookup(DEVELOPMENT_AREAS),
  ...toLookup(GAME_TYPES),
  ...toLookup(INPUT_TYPES),
  ...toLookup(DIFFICULTIES),
  ...toLookup(AGE_RANGES),
};

export function labelFor(id: string): string {
  return TAXONOMY_LABELS[id] ?? id;
}

export function ageRangeById(id: string): AgeRangeTerm | undefined {
  return AGE_RANGES.find((range) => range.id === id);
}

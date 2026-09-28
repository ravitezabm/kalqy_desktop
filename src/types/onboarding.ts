import avatar1 from "../assets/onboarding/avatars/avatar-1.svg";
import avatar2 from "../assets/onboarding/avatars/avatar-2.svg";
import avatar3 from "../assets/onboarding/avatars/avatar-3.svg";

export type FamilyRelationship =
  | "mother"
  | "father"
  | "grandmother"
  | "grandfather"
  | "aunt"
  | "uncle"
  | "sibling"
  | "legalGuardian"
  | "otherFamilyMember";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export const FAMILY_RELATIONSHIP_OPTIONS: SelectOption<FamilyRelationship>[] = [
  { value: "mother", label: "Mother" },
  { value: "father", label: "Father" },
  { value: "grandmother", label: "Grandmother" },
  { value: "grandfather", label: "Grandfather" },
  { value: "aunt", label: "Aunt" },
  { value: "uncle", label: "Uncle" },
  { value: "sibling", label: "Sibling" },
  { value: "legalGuardian", label: "Legal Guardian" },
  { value: "otherFamilyMember", label: "Other Family Member" },
];

export type Occupation =
  | "self-employed"
  | "business-owner"
  | "entrepreneur"
  | "software-it"
  | "engineer"
  | "healthcare"
  | "teacher"
  | "government"
  | "private-sector"
  | "finance"
  | "legal"
  | "creative"
  | "freelancer"
  | "homemaker"
  | "student"
  | "retired"
  | "other";

export const OCCUPATION_OPTIONS: SelectOption<Occupation>[] = [
  { value: "self-employed", label: "Self Employed" },
  { value: "business-owner", label: "Business Owner" },
  { value: "entrepreneur", label: "Entrepreneur" },
  { value: "software-it", label: "Software / IT Professional" },
  { value: "engineer", label: "Engineer" },
  { value: "healthcare", label: "Doctor / Healthcare Professional" },
  { value: "teacher", label: "Teacher / Educator" },
  { value: "government", label: "Government Employee" },
  { value: "private-sector", label: "Private Sector Employee" },
  { value: "finance", label: "Finance / Banking" },
  { value: "legal", label: "Legal Professional" },
  { value: "creative", label: "Designer / Creative Professional" },
  { value: "freelancer", label: "Freelancer" },
  { value: "homemaker", label: "Homemaker" },
  { value: "student", label: "Student" },
  { value: "retired", label: "Retired" },
  { value: "other", label: "Other" },
];

export const CHILD_AGE_MIN = 2;
export const CHILD_AGE_MAX = 12;

// Native <select> options require string values; ChildAgePage converts
// to/from the numeric `child.age` state at its boundary.
export const CHILD_AGE_OPTIONS: SelectOption<string>[] = Array.from(
  { length: CHILD_AGE_MAX - CHILD_AGE_MIN + 1 },
  (_, index) => {
    const age = CHILD_AGE_MIN + index;
    return { value: String(age), label: `${age} Years` };
  }
);

export type SchoolStatus =
  | "home-school"
  | "preschool"
  | "kindergarten"
  | "primary-school"
  | "middle-school"
  | "secondary-school"
  | "special-education"
  | "not-enrolled"
  | "other";

export const SCHOOL_STATUS_OPTIONS: SelectOption<SchoolStatus>[] = [
  { value: "home-school", label: "Home School" },
  { value: "preschool", label: "Preschool" },
  { value: "kindergarten", label: "Kindergarten" },
  { value: "primary-school", label: "Primary School" },
  { value: "middle-school", label: "Middle School" },
  { value: "secondary-school", label: "Secondary School" },
  { value: "special-education", label: "Special Education" },
  { value: "not-enrolled", label: "Not Currently Enrolled" },
  { value: "other", label: "Other" },
];

export type ChildGender = "boy" | "girl" | "other" | "prefer-not-to-say";

export const CHILD_GENDER_OPTIONS: SelectOption<ChildGender>[] = [
  { value: "boy", label: "Boy" },
  { value: "girl", label: "Girl" },
  { value: "other", label: "Other" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];

export type ChildPhoto =
  | { type: "uploaded"; localPath: string; previewUrl: string }
  | { type: "avatar"; avatarId: string };

export interface AvatarOption {
  id: string;
  label: string;
  src: string;
}

// Temporary local placeholders — swap the .svg files in
// src/assets/onboarding/avatars/ for final Kalqy artwork.
export const CHILD_PHOTO_AVATARS: AvatarOption[] = [
  { id: "avatar-1", label: "Select blue shirt avatar", src: avatar1 },
  { id: "avatar-2", label: "Select yellow shirt avatar", src: avatar2 },
  { id: "avatar-3", label: "Select striped shirt avatar", src: avatar3 },
];

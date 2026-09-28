import {
  FAMILY_RELATIONSHIP_OPTIONS,
  OCCUPATION_OPTIONS,
  CHILD_AGE_OPTIONS,
  SCHOOL_STATUS_OPTIONS,
  CHILD_GENDER_OPTIONS,
} from "../../types/onboarding";
import type { FamilyRelationship, Occupation, SchoolStatus, ChildGender } from "../../types/onboarding";
import type { OnboardingStepConfig } from "../../types/onboardingStep";
import onboardingWriting from "../../assets/illustrations/onboarding-writing.webp";
import relationshipIllustration from "../../assets/illustrations/onboarding-relationship.webp";
import childNameIllustration from "../../assets/illustrations/onboarding-child-name.webp";
import occupationIllustration from "../../assets/illustrations/onboarding-occupation.webp";
import childAgeIllustration from "../../assets/illustrations/onboarding-child-age.webp";
import schoolStatusIllustration from "../../assets/illustrations/onboarding-school-status.webp";
import childGenderIllustration from "../../assets/illustrations/onboarding-child-gender.webp";
import childPhotoIllustration from "../../assets/illustrations/onboarding-child-photo.webp";

const REPORTS_PRIVACY_NOTE = (
  <>
    We use this to personalise your reports
    <br />— never shared.
  </>
);

export const ONBOARDING_STEPS: OnboardingStepConfig[] = [
  {
    path: "profile",
    step: 1,
    totalSteps: 8,
    backPath: "/parent/mobile-connect",
    nextPath: "/parent/onboarding/relationship",
    illustrationSrc: onboardingWriting,
    illustrationAlt: "A friendly wild-boar character sitting at a desk, writing in a notebook",
    illustrationMaxWidth: 420,
    heading: "Tell us about you",
    description: REPORTS_PRIVACY_NOTE,
    requiredChecks: [],
    field: {
      kind: "text",
      label: "Name",
      placeholder: "your full name",
      maxLength: 100,
      requiredMessage: "Please enter your name.",
      getValue: (ctx) => ctx.parent.name,
      setValue: (value, ctx) => ctx.updateParent({ name: value }),
    },
  },
  {
    path: "relationship",
    step: 2,
    totalSteps: 8,
    backPath: "/parent/onboarding/profile",
    nextPath: "/parent/onboarding/child-name",
    illustrationSrc: relationshipIllustration,
    illustrationAlt:
      "A friendly wild-boar character video-calling family from a laptop, with a framed family photo nearby",
    illustrationMaxWidth: 420,
    heading: "You are the..........",
    description: (
      <>
        Select your relation with the child
        <br />— should be from family
      </>
    ),
    requiredChecks: [{ isSatisfied: (ctx) => Boolean(ctx.parent.name), redirectTo: "/parent/onboarding/profile" }],
    field: {
      kind: "select",
      ariaLabel: "Select your relation with the child",
      options: FAMILY_RELATIONSHIP_OPTIONS,
      defaultValue: "mother",
      getValue: (ctx) => ctx.parent.relationship,
      setValue: (value, ctx) => ctx.updateParent({ relationship: value as FamilyRelationship }),
    },
  },
  {
    path: "child-name",
    step: 3,
    totalSteps: 8,
    backPath: "/parent/onboarding/relationship",
    nextPath: "/parent/onboarding/occupation",
    illustrationSrc: childNameIllustration,
    illustrationAlt:
      "A cute lion cub sitting front-facing, wearing an orange scarf, surrounded by decorative leaves and stars",
    illustrationMaxWidth: 460,
    heading: "What is your childs name",
    description: REPORTS_PRIVACY_NOTE,
    requiredChecks: [
      { isSatisfied: (ctx) => Boolean(ctx.parent.name), redirectTo: "/parent/onboarding/profile" },
      { isSatisfied: (ctx) => Boolean(ctx.parent.relationship), redirectTo: "/parent/onboarding/relationship" },
    ],
    field: {
      kind: "text",
      label: "Child Name",
      placeholder: "Child’s full name",
      maxLength: 100,
      requiredMessage: "Please enter your child's name.",
      getValue: (ctx) => ctx.child.name ?? "",
      setValue: (value, ctx) => ctx.updateChild({ name: value }),
    },
  },
  {
    path: "occupation",
    step: 4,
    totalSteps: 8,
    backPath: "/parent/onboarding/child-name",
    nextPath: "/parent/onboarding/child-age",
    illustrationSrc: occupationIllustration,
    illustrationAlt:
      "A friendly wild-boar character at a laptop with coffee, surrounded by icons for ideas, reports, and tasks",
    illustrationMaxWidth: 460,
    heading: "What you do......",
    description: (
      <>
        Tell us about your occupation – you
        <br />
        can select from dropdown
      </>
    ),
    requiredChecks: [
      { isSatisfied: (ctx) => Boolean(ctx.parent.name), redirectTo: "/parent/onboarding/profile" },
      { isSatisfied: (ctx) => Boolean(ctx.parent.relationship), redirectTo: "/parent/onboarding/relationship" },
      { isSatisfied: (ctx) => Boolean(ctx.child.name), redirectTo: "/parent/onboarding/child-name" },
    ],
    field: {
      kind: "select",
      ariaLabel: "Select your occupation",
      options: OCCUPATION_OPTIONS,
      defaultValue: "self-employed",
      getValue: (ctx) => ctx.parent.occupation,
      setValue: (value, ctx) => ctx.updateParent({ occupation: value as Occupation }),
    },
  },
  {
    path: "child-age",
    step: 5,
    totalSteps: 8,
    backPath: "/parent/onboarding/occupation",
    nextPath: "/parent/onboarding/school-status",
    illustrationSrc: childAgeIllustration,
    illustrationAlt: "A cute lion cub sitting front-facing, wearing an orange scarf, surrounded by stars and leaves",
    illustrationMaxWidth: 460,
    heading: "How old is your child",
    description: REPORTS_PRIVACY_NOTE,
    requiredChecks: [
      { isSatisfied: (ctx) => Boolean(ctx.parent.name), redirectTo: "/parent/onboarding/profile" },
      { isSatisfied: (ctx) => Boolean(ctx.parent.relationship), redirectTo: "/parent/onboarding/relationship" },
      { isSatisfied: (ctx) => Boolean(ctx.child.name), redirectTo: "/parent/onboarding/child-name" },
      { isSatisfied: (ctx) => Boolean(ctx.parent.occupation), redirectTo: "/parent/onboarding/occupation" },
    ],
    field: {
      kind: "select",
      ariaLabel: "Select your child's age",
      options: CHILD_AGE_OPTIONS,
      defaultValue: "4",
      getValue: (ctx) => (ctx.child.age !== undefined ? String(ctx.child.age) : undefined),
      setValue: (value, ctx) => ctx.updateChild({ age: Number(value) }),
    },
  },
  {
    path: "school-status",
    step: 6,
    totalSteps: 8,
    backPath: "/parent/onboarding/child-age",
    nextPath: "/parent/onboarding/child-gender",
    illustrationSrc: schoolStatusIllustration,
    illustrationAlt:
      "A cute lion cub standing beside a school chalkboard drawing, surrounded by a star and leaves",
    illustrationMaxWidth: 480,
    heading: "What’s their school status",
    description: REPORTS_PRIVACY_NOTE,
    requiredChecks: [
      { isSatisfied: (ctx) => Boolean(ctx.parent.name), redirectTo: "/parent/onboarding/profile" },
      { isSatisfied: (ctx) => Boolean(ctx.parent.relationship), redirectTo: "/parent/onboarding/relationship" },
      { isSatisfied: (ctx) => Boolean(ctx.child.name), redirectTo: "/parent/onboarding/child-name" },
      { isSatisfied: (ctx) => Boolean(ctx.parent.occupation), redirectTo: "/parent/onboarding/occupation" },
      { isSatisfied: (ctx) => ctx.child.age !== undefined, redirectTo: "/parent/onboarding/child-age" },
    ],
    field: {
      kind: "select",
      ariaLabel: "Select their school status",
      options: SCHOOL_STATUS_OPTIONS,
      defaultValue: "home-school",
      getValue: (ctx) => ctx.child.schoolStatus,
      setValue: (value, ctx) => ctx.updateChild({ schoolStatus: value as SchoolStatus }),
    },
  },
  {
    path: "child-gender",
    step: 7,
    totalSteps: 8,
    backPath: "/parent/onboarding/school-status",
    nextPath: "/parent/onboarding/child-photo",
    illustrationSrc: childGenderIllustration,
    illustrationAlt: "A cute lion cub standing and waving, surrounded by a heart, a star, and leaves",
    illustrationMaxWidth: 480,
    heading: "What’s their Gender",
    description: REPORTS_PRIVACY_NOTE,
    requiredChecks: [
      { isSatisfied: (ctx) => Boolean(ctx.parent.name), redirectTo: "/parent/onboarding/profile" },
      { isSatisfied: (ctx) => Boolean(ctx.parent.relationship), redirectTo: "/parent/onboarding/relationship" },
      { isSatisfied: (ctx) => Boolean(ctx.child.name), redirectTo: "/parent/onboarding/child-name" },
      { isSatisfied: (ctx) => Boolean(ctx.parent.occupation), redirectTo: "/parent/onboarding/occupation" },
      { isSatisfied: (ctx) => ctx.child.age !== undefined, redirectTo: "/parent/onboarding/child-age" },
      { isSatisfied: (ctx) => Boolean(ctx.child.schoolStatus), redirectTo: "/parent/onboarding/school-status" },
    ],
    field: {
      kind: "select",
      ariaLabel: "Select their gender",
      options: CHILD_GENDER_OPTIONS,
      defaultValue: "boy",
      getValue: (ctx) => ctx.child.gender,
      setValue: (value, ctx) => ctx.updateChild({ gender: value as ChildGender }),
    },
  },
  {
    path: "child-photo",
    step: 8,
    totalSteps: 8,
    backPath: "/parent/onboarding/child-gender",
    nextPath: "/parent/onboarding/complete",
    illustrationSrc: childPhotoIllustration,
    illustrationAlt:
      "A cute lion cub winking and holding up a polaroid photo, with a camera icon, heart, and star nearby",
    illustrationMaxWidth: 480,
    heading: "Add their Photo",
    description: REPORTS_PRIVACY_NOTE,
    requiredChecks: [
      { isSatisfied: (ctx) => Boolean(ctx.parent.name), redirectTo: "/parent/onboarding/profile" },
      { isSatisfied: (ctx) => Boolean(ctx.parent.relationship), redirectTo: "/parent/onboarding/relationship" },
      { isSatisfied: (ctx) => Boolean(ctx.child.name), redirectTo: "/parent/onboarding/child-name" },
      { isSatisfied: (ctx) => Boolean(ctx.parent.occupation), redirectTo: "/parent/onboarding/occupation" },
      { isSatisfied: (ctx) => ctx.child.age !== undefined, redirectTo: "/parent/onboarding/child-age" },
      { isSatisfied: (ctx) => Boolean(ctx.child.schoolStatus), redirectTo: "/parent/onboarding/school-status" },
      { isSatisfied: (ctx) => Boolean(ctx.child.gender), redirectTo: "/parent/onboarding/child-gender" },
    ],
    onNext: (ctx) => ctx.markCompleted(),
    field: {
      kind: "photo",
      getValue: (ctx) => ctx.child.photo ?? null,
      setValue: (value, ctx) => ctx.updateChild({ photo: value }),
    },
  },
];

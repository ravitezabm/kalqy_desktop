import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { OnboardingLayout } from "../../layouts/OnboardingLayout";
import { OnboardingIllustration } from "../../components/OnboardingIllustration";
import { OnboardingQuestion } from "../../components/OnboardingQuestion";
import { OnboardingSelect } from "../../components/OnboardingSelect";
import { OnboardingNavigation } from "../../components/OnboardingNavigation";
import { FormInput } from "../../components/FormInput";
import { ChildPhotoPicker } from "../../components/ChildPhotoPicker";
import { useOnboarding } from "../../context/OnboardingContext";
import type { ChildPhoto } from "../../types/onboarding";
import type { OnboardingStepConfig } from "../../types/onboardingStep";
import styles from "./OnboardingStepPage.module.css";

const SAVE_DELAY_MS = 400;

type FieldValue = string | ChildPhoto | null;

function getInitialValue(config: OnboardingStepConfig, ctx: ReturnType<typeof useOnboarding>): FieldValue {
  if (config.field.kind === "select") {
    return config.field.getValue(ctx) ?? config.field.defaultValue;
  }
  return config.field.getValue(ctx);
}

/**
 * The single reusable "screen" for every field-collection step in the
 * onboarding wizard (name/relationship/occupation/age/school/gender/photo).
 * Each step is declared as data (see onboardingSteps.tsx) rather than as
 * its own page component — only the config differs per step.
 */
export function OnboardingStepPage({ config }: { config: OnboardingStepConfig }) {
  const navigate = useNavigate();
  const onboarding = useOnboarding();
  const reduceMotion = Boolean(useReducedMotion());

  const [value, setValue] = useState<FieldValue>(() => getInitialValue(config, onboarding));
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleBack = () => navigate(config.backPath);

  useEffect(() => {
    for (const check of config.requiredChecks) {
      if (!check.isSatisfied(onboarding)) {
        navigate(check.redirectTo, { replace: true });
        return;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- check once on mount, per step config
  }, [config.path]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) {
        handleBack();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable navigation target
  }, [submitting]);

  const isTextField = config.field.kind === "text";
  const textValue = typeof value === "string" ? value : "";
  const isValid = isTextField ? textValue.trim().length > 0 : true;
  const error =
    isTextField && touched && textValue.trim().length === 0 && config.field.kind === "text"
      ? config.field.requiredMessage
      : null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isTextField && config.field.kind === "text") {
      const trimmed = textValue.trim();
      if (!trimmed || submitting) {
        setTouched(true);
        return;
      }
      setSubmitting(true);
      await new Promise((resolve) => setTimeout(resolve, SAVE_DELAY_MS));
      config.field.setValue(trimmed, onboarding);
    } else {
      if (submitting) return;
      setSubmitting(true);
      await new Promise((resolve) => setTimeout(resolve, SAVE_DELAY_MS));
      if (config.field.kind === "select") {
        config.field.setValue(value as string, onboarding);
      } else if (config.field.kind === "photo") {
        config.field.setValue(value as ChildPhoto | null, onboarding);
      }
    }

    onboarding.setCurrentStep(config.step + 1);
    config.onNext?.(onboarding);
    navigate(config.nextPath);
  };

  const contentVariants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  };

  return (
    <OnboardingLayout currentStep={config.step} totalSteps={config.totalSteps} onBack={handleBack}>
      <OnboardingIllustration
        src={config.illustrationSrc}
        alt={config.illustrationAlt}
        maxWidth={config.illustrationMaxWidth}
      />

      <motion.div
        className={styles.formBlock}
        variants={contentVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <OnboardingQuestion heading={config.heading} description={config.description} />
        </motion.div>

        <motion.form
          className={styles.form}
          data-field-kind={config.field.kind}
          variants={itemVariants}
          onSubmit={handleSubmit}
          noValidate={isTextField}
        >
          {config.field.kind === "text" && (
            <FormInput
              label={config.field.label}
              name={config.path}
              placeholder={config.field.placeholder}
              value={textValue}
              onChange={setValue}
              onBlur={() => setTouched(true)}
              error={error}
              accent="purple"
              autoFocus
              maxLength={config.field.maxLength}
            />
          )}

          {config.field.kind === "select" && (
            <OnboardingSelect
              label={config.field.ariaLabel}
              name={config.path}
              value={typeof value === "string" ? value : config.field.defaultValue}
              onChange={setValue}
              options={config.field.options}
              hideLabel
            />
          )}

          {config.field.kind === "photo" && (
            <ChildPhotoPicker
              value={value as ChildPhoto | null}
              onChange={(photo) => setValue(photo)}
            />
          )}

          <OnboardingNavigation disabled={!isValid} loading={submitting} />
        </motion.form>
      </motion.div>
    </OnboardingLayout>
  );
}

import { useId } from "react";
import styles from "./OnboardingSelect.module.css";

interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface OnboardingSelectProps<T extends string> {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  name?: string;
  hideLabel?: boolean;
}

export function OnboardingSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  name,
  hideLabel = false,
}: OnboardingSelectProps<T>) {
  const selectId = useId();

  return (
    <div className={styles.wrapper}>
      <label className={hideLabel ? styles.labelHidden : styles.label} htmlFor={selectId}>
        {label}
      </label>
      <div className={styles.shell}>
        <select
          id={selectId}
          name={name}
          className={styles.select}
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          className={styles.chevron}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

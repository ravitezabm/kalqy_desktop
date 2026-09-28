import { useId } from "react";
import type { ChangeEvent, FocusEvent } from "react";
import styles from "./FormInput.module.css";

interface FormInputProps {
  label?: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  autoFocus?: boolean;
  name?: string;
  maxLength?: number;
  accent?: "pink" | "purple";
}

export function FormInput({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  autoFocus,
  name,
  maxLength,
  accent = "pink",
}: FormInputProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  const handleBlur = (_event: FocusEvent<HTMLInputElement>) => {
    onBlur?.();
  };

  return (
    <div className={styles.wrapper}>
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        type={type}
        className={styles.input}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        autoFocus={autoFocus}
        maxLength={maxLength}
        data-invalid={Boolean(error)}
        data-accent={accent}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

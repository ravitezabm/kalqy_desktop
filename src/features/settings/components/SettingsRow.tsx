import { ChevronRight } from "lucide-react";
import { Toggle } from "./Toggle";
import type { SettingsRowConfig, SettingsRowContext } from "../types";
import styles from "./SettingsRow.module.css";

interface SettingsRowProps {
  row: SettingsRowConfig;
  context: SettingsRowContext;
}

export function SettingsRow({ row, context }: SettingsRowProps) {
  const Icon = row.icon;

  const content = (
    <>
      <span className={styles.iconSlot}>
        <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
      </span>

      <span className={styles.textBlock}>
        <span className={styles.label}>{row.label}</span>
        {row.description && <span className={styles.description}>{row.description}</span>}
      </span>

      {row.kind === "toggle" && (
        <Toggle
          checked={context.settings[row.key]}
          onChange={(value) => context.settings.setSetting(row.key, value)}
          label={row.label}
        />
      )}

      {row.kind === "select" && (
        <select
          className={styles.select}
          value={context.settings[row.key]}
          onChange={(event) => context.settings.setSetting(row.key, event.target.value as never)}
          onClick={(event) => event.stopPropagation()}
          aria-label={row.label}
        >
          {row.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {row.kind === "info" && <span className={styles.value}>{row.getValue(context)}</span>}

      {row.kind === "action" && (
        <ChevronRight className={styles.chevron} size={18} strokeWidth={2} aria-hidden="true" />
      )}
    </>
  );

  if (row.kind === "action") {
    return (
      <button type="button" className={`${styles.row} ${styles.rowAction}`} onClick={() => row.onSelect(context)}>
        {content}
      </button>
    );
  }

  return <div className={styles.row}>{content}</div>;
}

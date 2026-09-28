import { SettingsRow } from "./SettingsRow";
import type { SettingsCategory, SettingsRowContext } from "../types";
import styles from "./SettingsCategoryCard.module.css";

interface SettingsCategoryCardProps {
  category: SettingsCategory;
  context: SettingsRowContext;
}

export function SettingsCategoryCard({ category, context }: SettingsCategoryCardProps) {
  const Icon = category.icon;

  return (
    <section className={styles.card} aria-labelledby={`settings-${category.id}`}>
      <header className={styles.header}>
        <span className={styles.iconSlot}>
          <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <h2 className={styles.title} id={`settings-${category.id}`}>
          {category.title}
        </h2>
      </header>

      <div className={styles.rows}>
        {category.rows.map((row) => (
          <SettingsRow key={row.id} row={row} context={context} />
        ))}
      </div>
    </section>
  );
}

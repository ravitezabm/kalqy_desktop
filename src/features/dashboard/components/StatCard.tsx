import { memo } from "react";
import { Gamepad2, Star, ShieldCheck, Clock } from "lucide-react";
import type { DashboardStat, StatIconName } from "../types/dashboard";
import styles from "./StatCard.module.css";

const ICONS: Record<StatIconName, typeof Gamepad2> = {
  games: Gamepad2,
  progress: Star,
  achievements: ShieldCheck,
  playTime: Clock,
};

interface StatCardProps {
  stat: DashboardStat;
}

function StatCardComponent({ stat }: StatCardProps) {
  const Icon = ICONS[stat.icon];

  return (
    <article className={styles.card}>
      <span className={styles.iconSlot} data-icon={stat.icon}>
        <Icon size={22} strokeWidth={1.9} aria-hidden="true" />
      </span>
      <div className={styles.body}>
        <p className={styles.label}>{stat.label}</p>
        <p className={styles.valueRow}>
          <span className={styles.value}>
            {stat.value}
            {stat.unit}
          </span>
          {stat.change && <span className={styles.change}>{stat.change}</span>}
        </p>
      </div>
    </article>
  );
}

export const StatCard = memo(StatCardComponent);

import { motion, useReducedMotion } from "framer-motion";
import { StatCard } from "./StatCard";
import type { DashboardStat } from "../types/dashboard";
import styles from "./StatsGrid.module.css";

interface StatsGridProps {
  stats: DashboardStat[];
}

export function StatsGrid({ stats }: StatsGridProps) {
  const reduceMotion = Boolean(useReducedMotion());

  return (
    <div className={styles.grid}>
      {stats.map((stat, index) => (
        <motion.div
          key={stat.id}
          initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: reduceMotion ? 0 : index * 0.05, ease: "easeOut" }}
        >
          <StatCard stat={stat} />
        </motion.div>
      ))}
    </div>
  );
}

import { motion } from "framer-motion";
import type { Profile } from "../../types/profile";
import styles from "./ProfileTile.module.css";

interface ProfileTileProps {
  profile: Profile;
  leftPercent: number;
  topPercent: number;
  sizePercent: number;
  zIndex: number;
  isCenter: boolean;
  onSelect: (id: string) => void;
}

export function ProfileTile({
  profile,
  leftPercent,
  topPercent,
  sizePercent,
  zIndex,
  isCenter,
  onSelect,
}: ProfileTileProps) {
  return (
    <motion.button
      type="button"
      layout
      className={styles.tile}
      data-center={isCenter}
      style={{
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
        width: `${sizePercent}%`,
        // Centre the avatar on its orbit point with margins, not a CSS
        // transform: Framer Motion's `layout` animation writes its own
        // transform on this element and would clobber a translate(-50%,-50%).
        // Percentage margins resolve against the field's width in both axes,
        // which centres correctly because the field is square.
        marginLeft: `-${sizePercent / 2}%`,
        marginTop: `-${sizePercent / 2}%`,
        zIndex,
      }}
      onClick={() => onSelect(profile.id)}
      aria-label={`Select ${profile.name} profile`}
      aria-pressed={isCenter}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className={styles.avatarSlot}>
        <span className={styles.imageWrap}>
          <img src={profile.image} alt="" className={styles.image} />
        </span>
      </span>
      <span className={styles.name}>{profile.name}</span>
    </motion.button>
  );
}

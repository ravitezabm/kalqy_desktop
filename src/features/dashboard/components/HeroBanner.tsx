import { Play } from "lucide-react";
import heroArtwork from "../../../assets/dashboard/hero-world.webp";
import styles from "./HeroBanner.module.css";

interface HeroBannerProps {
  onExplore: () => void;
}

export function HeroBanner({ onExplore }: HeroBannerProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.copy}>
        <h2 className={styles.title}>Level up your skills!</h2>
        <p className={styles.text}>
          Play fun games, learn new things
          <br />
          and collect awesome rewards.
        </p>
        <button type="button" className={styles.cta} onClick={onExplore}>
          <Play size={18} strokeWidth={2.4} fill="currentColor" aria-hidden="true" />
          Explore Games
        </button>
      </div>

      <img className={styles.artwork} src={heroArtwork} alt="" />
    </section>
  );
}

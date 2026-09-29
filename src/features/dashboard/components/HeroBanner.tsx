import { Play } from "lucide-react";
import heroBanner from "../../../assets/dashboard/hero-banner.webp";
import styles from "./HeroBanner.module.css";

interface HeroBannerProps {
  onExplore: () => void;
}

/**
 * The banner artwork is used as-is (see the supplied PNG) — no part of the
 * headline/CTA is baked into the image, it's all a real HTML overlay so it
 * stays readable, translatable and responsive.
 */
export function HeroBanner({ onExplore }: HeroBannerProps) {
  return (
    <section className={styles.hero}>
      <img className={styles.artwork} src={heroBanner} alt="" fetchPriority="high" decoding="async" />
      <span className={styles.scrim} aria-hidden="true" />

      <div className={styles.copy}>
        <h2 className={styles.title}>
          Level up your
          <br />
          skills!
        </h2>
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
    </section>
  );
}

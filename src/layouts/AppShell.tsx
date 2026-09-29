import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Home, Palmtree, Puzzle, Settings, LifeBuoy, ChevronRight } from "lucide-react";
import { KalqyLogo } from "../components/KalqyLogo";
import sidebarEnvironment from "../assets/dashboard/sidebar-environment.webp";
import type { Profile } from "../types/profile";
import styles from "./AppShell.module.css";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
}

/** Reports and Store are intentionally absent; World has no standalone screen. */
const PRIMARY_NAV: NavItem[] = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/endeavour", label: "Endeavour", icon: Palmtree },
  { to: "/games", label: "Games", icon: Puzzle },
];

const SECONDARY_NAV: NavItem[] = [
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/support", label: "Support", icon: LifeBuoy },
];

interface AppShellProps {
  children: ReactNode;
  profile: Profile | null;
  /**
   * Rendered as a sibling of the scrollable content area, outside the
   * page-transition wrapper — so `position: fixed` inside it truly stays
   * pinned to the viewport instead of scrolling with the page (a `transform`
   * on an ancestor, which PageTransition sets for its enter/exit animation,
   * would otherwise become the containing block for `fixed` descendants).
   */
  bottomDecoration?: ReactNode;
}

export function AppShell({ children, profile, bottomDecoration }: AppShellProps) {
  const navigate = useNavigate();
  const reduceMotion = Boolean(useReducedMotion());

  const renderNavItem = ({ to, label, icon: Icon }: NavItem) => (
    <NavLink
      key={to}
      to={to}
      className={({ isActive }) => (isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem)}
    >
      <span className={styles.navIcon}>
        <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className={styles.navLabel}>{label}</span>
    </NavLink>
  );

  return (
    <div className={styles.shell}>
      <motion.aside
        className={styles.sidebar}
        initial={{ opacity: 0, x: reduceMotion ? 0 : -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={styles.logoSlot}>
          <KalqyLogo size="md" />
        </div>

        <nav className={styles.nav} aria-label="Main">
          <div className={styles.navGroup}>{PRIMARY_NAV.map(renderNavItem)}</div>
          <div className={styles.navGroup}>{SECONDARY_NAV.map(renderNavItem)}</div>
        </nav>

        <img className={styles.sidebarArtwork} src={sidebarEnvironment} alt="" aria-hidden="true" />

        <button
          type="button"
          className={styles.profileButton}
          onClick={() => navigate("/profile-selection")}
          aria-label={profile ? `Switch profile, currently ${profile.name}` : "Choose a profile"}
        >
          {profile ? (
            <img className={styles.profileAvatar} src={profile.image} alt="" />
          ) : (
            <span className={styles.profileAvatarFallback} aria-hidden="true" />
          )}
          <span className={styles.profileText}>
            <span className={styles.profileGreeting}>Welcome back</span>
            <span className={styles.profileName}>{profile?.name ?? "Choose profile"}</span>
          </span>
          <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" className={styles.profileChevron} />
        </button>
      </motion.aside>

      <main className={styles.content}>{children}</main>

      {bottomDecoration}
    </div>
  );
}

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { KalqyLogo } from "../components/KalqyLogo";
import { FormInput } from "../components/FormInput";
import { PrimaryButton } from "../components/PrimaryButton";
import { BottomBadge } from "../components/BottomBadge";
import { BackButton } from "../components/BackButton";
import { AuthSplitLayout } from "../layouts/AuthSplitLayout";
import { useAuth } from "../context/AuthContext";
import loginHero from "../assets/illustrations/login-hero.webp";
import sharedStyles from "../styles/authText.module.css";
import styles from "./LoginEmailPage.module.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_REQUEST_DELAY_MS = 650;

const leftVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

function getEmailError(value: string): string | null {
  if (value.trim().length === 0) return "Email is required.";
  if (!EMAIL_PATTERN.test(value)) return "Please enter a valid email address.";
  return null;
}

export function LoginEmailPage() {
  const navigate = useNavigate();
  const { setEmail: setAuthEmail } = useAuth();

  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isValid = EMAIL_PATTERN.test(email);
  const error = touched ? getEmailError(email) : null;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        navigate("/login");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, OTP_REQUEST_DELAY_MS));
    setAuthEmail(email);
    navigate("/login/otp");
  };

  return (
    <AuthSplitLayout
      illustrationSrc={loginHero}
      illustrationAlt="Kalqy characters — a boy, a wise turtle, a lion cub and friends welcoming you to sign in"
      topSlot={<BackButton onClick={() => navigate("/login")} />}
    >
      <motion.div variants={leftVariants} initial="hidden" animate="visible" style={{ width: "100%" }}>
        <motion.div variants={itemVariants}>
          <KalqyLogo size="md" />
        </motion.div>

        <motion.p className={sharedStyles.tagline} variants={itemVariants}>
          Learn, Play and Grow
        </motion.p>

        <motion.h1 className={sharedStyles.heading} variants={itemVariants}>
          Welcome back
        </motion.h1>
        <motion.p className={sharedStyles.subtitle} variants={itemVariants}>
          Login to continue
        </motion.p>

        <motion.form
          className={styles.form}
          variants={itemVariants}
          onSubmit={handleSubmit}
          noValidate
        >
          <FormInput
            type="email"
            name="email"
            placeholder="Email"
            value={email}
            onChange={setEmail}
            onBlur={() => setTouched(true)}
            error={error}
            autoFocus
          />

          <PrimaryButton type="submit" disabled={!isValid} loading={submitting}>
            LOGIN
          </PrimaryButton>
        </motion.form>

        <motion.div className={sharedStyles.badgeSlot} variants={itemVariants}>
          <BottomBadge label="AI-Powered Learning Revolution" />
        </motion.div>
      </motion.div>
    </AuthSplitLayout>
  );
}

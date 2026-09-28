import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { KalqyLogo } from "../components/KalqyLogo";
import { BackButton } from "../components/BackButton";
import { OtpInput } from "../components/OtpInput";
import { PrimaryButton } from "../components/PrimaryButton";
import { BottomBadge } from "../components/BottomBadge";
import { Modal } from "../components/Modal";
import { AuthSplitLayout } from "../layouts/AuthSplitLayout";
import { useAuth } from "../context/AuthContext";
import loginHero from "../assets/illustrations/login-hero.webp";
import sharedStyles from "../styles/authText.module.css";
import styles from "./LoginOtpPage.module.css";

const OTP_LENGTH = 6;
const VALID_OTP = "123456";
const VERIFY_DELAY_MS = 650;
const SUCCESS_HOLD_MS = 600;

type Status = "idle" | "verifying" | "success" | "error";

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

export function LoginOtpPage() {
  const navigate = useNavigate();
  const { email, setAuthenticated, setOtpVerified } = useAuth();

  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [helpOpen, setHelpOpen] = useState(false);

  const isComplete = otp.length === OTP_LENGTH;
  const isBusy = status === "verifying" || status === "success";

  useEffect(() => {
    if (!email) {
      navigate("/login", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only check once on mount
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isBusy) {
        navigate("/login/email");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, isBusy]);

  const handleOtpChange = (value: string) => {
    setOtp(value);
    if (status === "error") {
      setStatus("idle");
    }
  };

  const handleVerify = async () => {
    if (!isComplete || isBusy) return;

    setStatus("verifying");
    await new Promise((resolve) => setTimeout(resolve, VERIFY_DELAY_MS));

    if (otp === VALID_OTP) {
      setStatus("success");
      setAuthenticated(true);
      setOtpVerified(true);
      await new Promise((resolve) => setTimeout(resolve, SUCCESS_HOLD_MS));
      navigate("/parent/mobile-connect", { replace: true });
    } else {
      setStatus("error");
    }
  };

  return (
    <AuthSplitLayout
      illustrationSrc={loginHero}
      illustrationAlt="A child and a friendly robot working on a security lock illustration"
      topSlot={<BackButton onClick={() => navigate("/login/email")} />}
    >
      <motion.div variants={leftVariants} initial="hidden" animate="visible" style={{ width: "100%" }}>
        <motion.div className={styles.notice} variants={itemVariants}>
          Please check your spam folder if you can&apos;t find the email.
        </motion.div>

        <motion.div variants={itemVariants}>
          <KalqyLogo size="md" />
        </motion.div>

        <motion.p className={sharedStyles.tagline} variants={itemVariants}>
          Learn, Play and Grow
        </motion.p>

        <motion.h1 className={sharedStyles.heading} variants={itemVariants}>
          OTP
        </motion.h1>
        <motion.p className={sharedStyles.subtitle} variants={itemVariants}>
          Enter the code sent to your email
        </motion.p>

        <motion.div className={styles.form} variants={itemVariants}>
          <OtpInput
            length={OTP_LENGTH}
            value={otp}
            onChange={handleOtpChange}
            onSubmit={handleVerify}
            disabled={isBusy}
            invalid={status === "error"}
          />

          <div className={styles.statusRow}>
            {status === "error" ? (
              <p className={styles.errorText} role="alert">
                Incorrect OTP. Please try again.
              </p>
            ) : (
              <span />
            )}

            <button
              type="button"
              className={styles.issueLink}
              onClick={() => setHelpOpen(true)}
            >
              Found any issue?
            </button>
          </div>

          <PrimaryButton
            disabled={!isComplete}
            loading={status === "verifying"}
            success={status === "success"}
            onClick={handleVerify}
            aria-label="Verify one-time passcode"
          >
            NEXT
          </PrimaryButton>
        </motion.div>

        <motion.div className={sharedStyles.badgeSlot} variants={itemVariants}>
          <BottomBadge label="AI-Powered Learning Revolution" />
        </motion.div>
      </motion.div>

      <Modal open={helpOpen} title="Need help?" onClose={() => setHelpOpen(false)}>
        Need help? Please contact Kalqy support.
      </Modal>
    </AuthSplitLayout>
  );
}

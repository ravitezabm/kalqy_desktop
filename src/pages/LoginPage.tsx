import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { KalqyLogo } from "../components/KalqyLogo";
import { PrimaryButton } from "../components/PrimaryButton";
import { SocialButton } from "../components/SocialButton";
import { BottomBadge } from "../components/BottomBadge";
import { Toast } from "../components/Toast";
import { AppleIcon, FacebookIcon, GoogleIcon, MailIcon } from "../components/icons/BrandIcons";
import { useToast } from "../animations/useToast";
import { AuthSplitLayout } from "../layouts/AuthSplitLayout";
import loginHero from "../assets/illustrations/login-hero.webp";
import sharedStyles from "../styles/authText.module.css";
import styles from "./LoginPage.module.css";

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

export function LoginPage() {
  const navigate = useNavigate();
  const { message, showToast } = useToast();

  const handleSocialClick = (provider: string) => {
    showToast(`${provider} login coming soon`);
  };

  return (
    <>
      <AuthSplitLayout
        illustrationSrc={loginHero}
        illustrationAlt="Kalqy characters — a boy, a wise turtle, a lion cub and friends welcoming you to sign in"
      >
        <motion.div variants={leftVariants} initial="hidden" animate="visible" style={{ width: "100%" }}>
          <motion.div variants={itemVariants}>
            <KalqyLogo size="md" />
          </motion.div>

          <motion.p className={sharedStyles.tagline} variants={itemVariants}>
            Learn, Play and Grow
          </motion.p>

          <motion.h1 className={sharedStyles.heading} variants={itemVariants}>
            Choose LOGIN
          </motion.h1>
          <motion.p className={sharedStyles.subtitle} variants={itemVariants}>
            Login to continue
          </motion.p>

          <motion.div className={styles.optionsGroup} variants={itemVariants}>
            <PrimaryButton
              aria-label="Continue with Email"
              onClick={() => navigate("/login/email")}
            >
              <span className={styles.buttonContent}>
                <MailIcon color="#ffffff" />
                Continue with Email
              </span>
            </PrimaryButton>

            <span className={styles.divider}>or</span>

            <div className={styles.secondaryGroup}>
              <SocialButton
                icon={<AppleIcon />}
                label="Continue with Apple"
                aria-label="Continue with Apple"
                onClick={() => handleSocialClick("Apple")}
              />
              <SocialButton
                icon={<FacebookIcon />}
                label="Continue with Facebook"
                aria-label="Continue with Facebook"
                onClick={() => handleSocialClick("Facebook")}
              />
              <SocialButton
                icon={<GoogleIcon />}
                label="Continue with Google"
                aria-label="Continue with Google"
                onClick={() => handleSocialClick("Google")}
              />
            </div>
          </motion.div>

          <motion.div className={sharedStyles.badgeSlot} variants={itemVariants}>
            <BottomBadge label="AI-Powered Learning Revolution" />
          </motion.div>
        </motion.div>
      </AuthSplitLayout>

      <Toast message={message} />
    </>
  );
}

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { LoadingIndicator } from "./LoadingIndicator";
import styles from "./PrimaryButton.module.css";

interface PrimaryButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  success?: boolean;
  type?: "button" | "submit";
  variant?: "pink" | "purple";
  className?: string;
  "aria-label"?: string;
}

function SuccessCheck() {
  return (
    <motion.svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      aria-hidden="true"
    >
      <path
        d="M4 12.5l5 5L20 7"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}

export function PrimaryButton({
  children,
  className,
  onClick,
  disabled = false,
  loading = false,
  success = false,
  type = "button",
  variant = "pink",
  ...rest
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading || success;

  let content: ReactNode = children;
  if (success) {
    content = <SuccessCheck />;
  } else if (loading) {
    content = <LoadingIndicator size={18} color="#ffffff" delay={0} />;
  }

  return (
    <motion.button
      type={type}
      data-variant={variant}
      className={[styles.button, className].filter(Boolean).join(" ")}
      whileHover={isDisabled ? undefined : { scale: 1.015 }}
      whileTap={isDisabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading}
      {...rest}
    >
      {content}
    </motion.button>
  );
}

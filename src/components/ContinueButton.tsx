import { useState } from "react";
import { PrimaryButton } from "./PrimaryButton";
import { Modal } from "./Modal";
import styles from "./ContinueButton.module.css";

interface ContinueButtonProps {
  mobileCompleted: boolean;
  onContinue: () => void;
  loading?: boolean;
}

export function ContinueButton({ mobileCompleted, onContinue, loading = false }: ContinueButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleClick = () => {
    if (mobileCompleted) {
      onContinue();
    } else {
      setConfirmOpen(true);
    }
  };

  return (
    <>
      <PrimaryButton onClick={handleClick} loading={loading}>
        Continue Here
      </PrimaryButton>

      <Modal
        open={confirmOpen}
        title="Continue without mobile?"
        onClose={() => setConfirmOpen(false)}
        footer={
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setConfirmOpen(false)}
            >
              Go Back
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => {
                setConfirmOpen(false);
                onContinue();
              }}
            >
              Continue Anyway
            </button>
          </div>
        }
      >
        Some parent information still needs to be completed on mobile.
      </Modal>
    </>
  );
}

import { Modal } from "../../../components/Modal";
import type { SettingsModalConfig, SettingsRowContext } from "../types";
import styles from "./SettingsInfoModal.module.css";

interface SettingsInfoModalProps {
  modal: SettingsModalConfig | null;
  context: SettingsRowContext;
  onClose: () => void;
}

export function SettingsInfoModal({ modal, context, onClose }: SettingsInfoModalProps) {
  if (!modal) return null;

  return (
    <Modal open={Boolean(modal)} title={modal.title} onClose={onClose}>
      <div className={styles.content}>{modal.render(context)}</div>
    </Modal>
  );
}

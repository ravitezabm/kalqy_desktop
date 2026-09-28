import { Modal } from "../../../components/Modal";
import { QRCodeDisplay } from "../../../components/QRCodeDisplay";
import styles from "./ParentAppModal.module.css";

const PARENT_APP_URL = import.meta.env.VITE_PARENT_APP_URL ?? "https://app.kalqy.in/parent";

interface ParentAppModalProps {
  open: boolean;
  onClose: () => void;
}

export function ParentAppModal({ open, onClose }: ParentAppModalProps) {
  return (
    <Modal open={open} title="Open Parent App" onClose={onClose}>
      <div className={styles.body}>
        <p className={styles.text}>
          Scan this code with your phone&rsquo;s camera to install or open the Kalqy Parent App.
        </p>
        <div className={styles.qrSlot}>
          <QRCodeDisplay value={PARENT_APP_URL} size={148} />
        </div>
        <p className={styles.hint}>{PARENT_APP_URL}</p>
      </div>
    </Modal>
  );
}

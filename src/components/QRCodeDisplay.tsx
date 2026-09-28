import { QRCodeSVG } from "qrcode.react";
import styles from "./QRCodeDisplay.module.css";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

export function QRCodeDisplay({ value, size = 132 }: QRCodeDisplayProps) {
  return (
    <div className={styles.container}>
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        marginSize={0}
        bgColor="#ffffff"
        fgColor="#1f2023"
        title="Kalqy mobile onboarding QR code"
      />
    </div>
  );
}

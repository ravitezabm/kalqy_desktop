import { useState } from "react";
import { motion } from "framer-motion";
import { open } from "@tauri-apps/plugin-dialog";
import { stat } from "@tauri-apps/plugin-fs";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { ChildPhoto } from "../types/onboarding";
import { CHILD_PHOTO_AVATARS } from "../types/onboarding";
import styles from "./ChildPhotoPicker.module.css";

const ACCEPTED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

interface ChildPhotoPickerProps {
  value: ChildPhoto | null;
  onChange: (photo: ChildPhoto | null) => void;
}

export function ChildPhotoPicker({ value, onChange }: ChildPhotoPickerProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUploadClick = async () => {
    setError(null);

    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Images", extensions: ACCEPTED_EXTENSIONS }],
      });
      if (!selected || Array.isArray(selected)) return;

      const extension = selected.split(".").pop()?.toLowerCase() ?? "";
      if (!ACCEPTED_EXTENSIONS.includes(extension)) {
        setError("Please select a JPG, PNG, or WebP image.");
        return;
      }

      setLoading(true);
      const info = await stat(selected);
      if (info.size > MAX_FILE_SIZE_BYTES) {
        setError("Photo must be smaller than 10 MB.");
        return;
      }

      onChange({
        type: "uploaded",
        localPath: selected,
        previewUrl: convertFileSrc(selected),
      });
    } catch {
      setError("That photo couldn't be opened. Please try another file.");
    } finally {
      setLoading(false);
    }
  };

  const selectedAvatarId = value?.type === "avatar" ? value.avatarId : null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.row}>
        {value?.type === "uploaded" ? (
          <button
            type="button"
            className={styles.uploadedTile}
            onClick={handleUploadClick}
            aria-label="Change uploaded photo"
          >
            <img src={value.previewUrl} alt="" className={styles.uploadedImage} />
            <span className={styles.changeBadge}>Change</span>
          </button>
        ) : (
          <button
            type="button"
            className={styles.uploadTile}
            onClick={handleUploadClick}
            aria-label="Upload child's photo"
            disabled={loading}
          >
            <span className={styles.plusCircle} aria-hidden="true">
              +
            </span>
            <span className={styles.uploadLabel}>{loading ? "Loading…" : "Upload photo"}</span>
          </button>
        )}

        {CHILD_PHOTO_AVATARS.map((avatar) => {
          const isSelected = selectedAvatarId === avatar.id;
          return (
            <motion.button
              key={avatar.id}
              type="button"
              className={styles.avatarTile}
              data-selected={isSelected}
              onClick={() => onChange({ type: "avatar", avatarId: avatar.id })}
              aria-label={avatar.label}
              aria-pressed={isSelected}
              whileTap={{ scale: 0.97 }}
              animate={{ scale: isSelected ? 1.02 : 1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <img src={avatar.src} alt="" className={styles.avatarImage} />
              {isSelected && (
                <span className={styles.checkBadge} aria-hidden="true">
                  ✓
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

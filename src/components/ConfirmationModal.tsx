import React from "react";
import { AlertTriangle, Trash2, Info } from "lucide-react";
import styles from "./ConfirmationModal.module.css";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "info",
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const Icon =
    variant === "danger"
      ? Trash2
      : variant === "warning"
        ? AlertTriangle
        : Info;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={`${styles.iconBox} ${styles[variant]}`}>
          <Icon size={32} />
        </div>

        <h3 className={styles.title}>{title}</h3>
        <p className={styles.message}>{message}</p>

        <div className={styles.actions}>
          <button
            className={`${styles.confirmBtn} ${variant === "danger" ? styles.danger : ""}`}
            onClick={() => {
              onConfirm();
              // No cerramos acá por si el caller quiere manejar el loading, o sí?
              // Si el onConfirm es async, el caller debería pasarnos isLoading
            }}
            disabled={isLoading}
          >
            {isLoading ? "Procesando..." : confirmText}
          </button>

          <button
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;

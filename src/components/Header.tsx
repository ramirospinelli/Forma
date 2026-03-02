import { useNavigate } from "react-router-dom";
import { Zap, ArrowLeft } from "lucide-react";
import styles from "./Header.module.css";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  fallbackRoute?: string;
  hideLogo?: boolean;
}

export default function Header({
  title,
  showBack,
  onBack,
  leftElement,
  rightElement,
  fallbackRoute = "/",
  hideLogo = false,
}: HeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(fallbackRoute, { replace: true });
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.left}>
          {leftElement ? (
            leftElement
          ) : (
            <>
              {showBack && (
                <button className={styles.backBtn} onClick={handleBack}>
                  <ArrowLeft size={24} color="var(--color-text-primary)" />
                </button>
              )}
              {!hideLogo && (
                <div className={styles.logoContainer}>
                  <div className={styles.iconBg}>
                    <Zap size={16} color="white" />
                  </div>
                  <span className={styles.logoText}>FORMA</span>
                </div>
              )}
            </>
          )}
          {title && <h1 className={styles.title}>{title}</h1>}
        </div>
        <div className={styles.right}>{rightElement}</div>
      </div>
    </header>
  );
}

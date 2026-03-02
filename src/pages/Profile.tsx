import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRegisterSW } from "virtual:pwa-register/react";
import {
  LogOut,
  RefreshCw,
  Settings,
  Smartphone,
  Brain,
  ExternalLink,
  Shield,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import { syncAllActivities } from "../lib/strava";
import { useDailyLoadProfile } from "../lib/hooks/useMetrics";
import { classifyAthleteRank } from "../lib/domain/metrics/performance";
import Header from "../components/Header";
import { encryptData, decryptData } from "../lib/utils";
import { version } from "../../package.json";
import PullToRefresh from "react-simple-pull-to-refresh";
import styles from "./Profile.module.css";

let deferredPrompt: any = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuthStore();
  const queryClient = useQueryClient();
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [isStandalone] = useState(
    window.matchMedia("(display-mode: standalone)").matches,
  );
  const [swRegistration, setSwRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);

  useEffect(() => {
    if (profile && profile.gemini_api_key) {
      decryptData(profile.gemini_api_key).then(setApiKey);
    }
  }, [profile]);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log("SW Registered: ", r);
      if (r) setSwRegistration(r);
    },
    onRegisterError(error: Error) {
      console.log("SW registration error", error);
    },
  });

  const { data: loadHistory } = useDailyLoadProfile(user?.id, 7);

  const latestLoad = loadHistory?.[loadHistory.length - 1];
  const ctlValue = latestLoad?.ctl || 0;
  const rank = classifyAthleteRank(ctlValue);

  // Calculate progress within current rank
  const progress =
    rank.maxCTL === rank.minCTL
      ? 100
      : Math.min(
          100,
          Math.max(
            0,
            ((ctlValue - rank.minCTL) / (rank.maxCTL - rank.minCTL)) * 100,
          ),
        );

  const syncMutation = useMutation({
    mutationFn: () => syncAllActivities(user!.id),
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      toast.success(`${count} actividades importadas`);
    },
    onError: () => toast.error("Error al sincronizar"),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Encrypt before saving
      const encryptedKey = apiKey ? await encryptData(apiKey) : "";

      const { error } = await supabase
        .from("profiles")
        .update({
          gemini_api_key: encryptedKey,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("API Key guardada correctamente");
    },
    onError: (err: any) => {
      console.error(err);
      toast.error("Error al guardar API Key");
    },
  });

  const handleSignOut = () => {
    setShowSignOutModal(true);
  };

  const confirmSignOut = async () => {
    try {
      await signOut();
      navigate("/auth", { replace: true });
    } catch (error) {
      toast.error("Error al cerrar sesión");
    }
  };

  const [showSyncModal, setShowSyncModal] = useState(false);

  const handleSyncClick = () => {
    setShowSyncModal(true);
  };

  const confirmSync = () => {
    setShowSyncModal(false);
    syncMutation.mutate();
  };

  const handlePwaAction = async () => {
    if (!isStandalone) {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const result = await deferredPrompt.userChoice;
        if (result.outcome === "accepted") {
          toast.success("¡Aplicación instalada!");
          deferredPrompt = null;
        }
      } else {
        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
        const msg = isIOS
          ? "En iOS Safari: Toca Compartir ⬆️ → 'Agregar a Inicio'"
          : "En Chrome: Menú ⋮ → Instalar / Agregar a Inicio";
        toast(msg, { icon: "📱", duration: 6000 });
      }
    } else if (needRefresh) {
      updateServiceWorker(true);
      toast.loading("Actualizando...");
    } else {
      if (swRegistration) {
        toast.loading("Buscando actualización...", { duration: 1500 });
        try {
          await swRegistration.update();
        } catch (err) {
          console.error("Error updating SW", err);
        }
      } else {
        toast.success("Tu aplicación está al día");
      }
    }
  };

  const firstName = profile?.full_name ?? "Atleta";

  let pwaLabel = "Instalar Aplicación";
  let pwaSub = "Obtené Forma en tu inicio";
  if (isStandalone) {
    if (needRefresh) {
      pwaLabel = "Completar Actualización";
      pwaSub = "Nueva versión descargada";
    } else {
      pwaLabel = "Buscar Actualizaciones";
      pwaSub = "Revisar si hay una nueva versión";
    }
  }

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    await queryClient.invalidateQueries({
      queryKey: ["profile_stats", user?.id],
    });
  };

  return (
    <div className={styles.page}>
      <Header title="Perfil" />

      <PullToRefresh
        onRefresh={handleRefresh}
        pullingContent={
          <div style={{ textAlign: "center", padding: 20 }}>
            Tirá para refrescar...
          </div>
        }
        refreshingContent={
          <div style={{ textAlign: "center", padding: 20 }}>
            <span
              className={styles.spinner}
              style={{
                width: 24,
                height: 24,
                borderWidth: 2,
                display: "inline-block",
              }}
            />
          </div>
        }
        backgroundColor="var(--color-bg)"
      >
        <div className={styles.content}>
          {/* Avatar + Name */}
          <div className={styles.profileCard}>
            <div className={styles.avatarWrapper}>
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>{firstName[0]}</div>
              )}
            </div>
            <h2 className={styles.profileName}>{firstName}</h2>
          </div>

          {/* Athlete Identity & Rank */}
          <div className={styles.rankCard}>
            <div className={styles.rankHeader}>
              <div className={styles.rankBrand}>
                <div
                  className={styles.shieldWrapper}
                  style={{ backgroundColor: `${rank.color}20` }}
                >
                  <Shield
                    size={24}
                    color={rank.color}
                    fill={`${rank.color}40`}
                  />
                </div>
                <div className={styles.rankText}>
                  <span className={styles.rankLabel}>Identidad Atleta</span>
                  <h3 className={styles.rankName} style={{ color: rank.color }}>
                    {rank.name}
                  </h3>
                </div>
              </div>
              <div className={styles.fitnessValue}>
                <span className={styles.fitNum}>{Math.round(ctlValue)}</span>
                <span className={styles.fitLabel}>CTL</span>
              </div>
            </div>

            <p className={styles.rankBio}>{rank.description}</p>

            <div className={styles.progressSection}>
              <div className={styles.progressHeader}>
                <span className={styles.progressLabel}>
                  Progreso al siguiente nivel
                </span>
                <span className={styles.progressPct}>
                  {Math.round(progress)}%
                </span>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${progress}%`, backgroundColor: rank.color }}
                />
              </div>
            </div>
          </div>

          {/* Strava Section */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Strava</h3>
            <div className={styles.menuCard}>
              <MenuButton
                icon={<RefreshCw size={20} color="var(--color-accent)" />}
                iconBg="rgba(78,205,196,0.1)"
                label="Sincronizar historial"
                sub="Importar todo desde Strava"
                loading={syncMutation.isPending}
                onClick={handleSyncClick}
              />
            </div>
          </section>

          {/* Preferences */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Preferencias</h3>
            <div className={styles.menuCard}>
              <MenuButton
                icon={<Settings size={20} color="var(--color-primary)" />}
                iconBg="rgba(255,107,53,0.1)"
                label="Zonas de Rendimiento"
                sub="Configurar LTHR y umbrales"
                onClick={() => navigate("/profile/edit-performance")}
              />
              <div className={styles.divider} />
              <MenuButton
                icon={<Smartphone size={20} color="#007AFF" />}
                iconBg="rgba(0,122,255,0.1)"
                label={pwaLabel}
                sub={pwaSub}
                onClick={handlePwaAction}
              />
            </div>
          </section>

          {/* IA Coach - Gemini API Key Settings */}
          <section className={styles.section}>
            <div className={styles.menuCard}>
              <MenuButton
                icon={<Brain size={20} color="var(--color-primary)" />}
                iconBg="rgba(255,107,53,0.1)"
                label="Gemini API Key"
                sub="Configurar inteligencia artificial"
                onClick={() => setIsApiKeyOpen(!isApiKeyOpen)}
              />

              {isApiKeyOpen && (
                <div className={styles.apiKeyInputGroup}>
                  <div
                    className={styles.divider}
                    style={{ margin: "0 0 16px 0", width: "100%" }}
                  />
                  <p className={styles.menuSub} style={{ marginBottom: "8px" }}>
                    Configurá tu propia llave de Gemini para habilitar las
                    funciones de inteligencia artificial en tu perfil de forma
                    privada.
                  </p>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.howToLink}
                  >
                    ¿Cómo obtengo mi API Key? <ExternalLink size={12} />
                  </a>
                  <input
                    type="password"
                    className={styles.apiKeyInput}
                    placeholder="Introducir API Key..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <button
                    className={styles.saveApiKeyBtn}
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate()}
                  >
                    {updateMutation.isPending
                      ? "Guardando..."
                      : "Guardar API Key"}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Sign out */}
          <button className={styles.signOutBtn} onClick={handleSignOut}>
            <LogOut size={18} />
            Cerrar Sesión
          </button>

          {/* App version & copyright */}
          <div className={styles.appFooter}>
            <span className={styles.appVersion}>Forma v{version}</span>
            <span className={styles.appCopyright}>
              &copy; {new Date().getFullYear()} Forma Fitness. Todos los
              derechos reservados.
            </span>
          </div>
        </div>
      </PullToRefresh>

      {showSignOutModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowSignOutModal(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalIconBox}>
              <LogOut size={24} color="#ff5757" />
            </div>
            <h3 className={styles.modalTitle}>¿Cerrar Sesión?</h3>
            <p className={styles.modalText}>
              Tendrás que volver a iniciar sesión para ver tus actividades.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancel}
                onClick={() => setShowSignOutModal(false)}
              >
                Cancelar
              </button>
              <button className={styles.modalConfirm} onClick={confirmSignOut}>
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {showSyncModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowSyncModal(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalIconBox}>
              <RefreshCw size={24} color="var(--color-primary)" />
            </div>
            <h3 className={styles.modalTitle}>¿Sincronizar Historial?</h3>
            <p className={styles.modalText}>
              Esto importará de Strava todas tus actividades desde enero de
              2025.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancel}
                onClick={() => setShowSyncModal(false)}
              >
                Cancelar
              </button>
              <button
                className={styles.modalConfirm}
                style={{
                  background: "var(--color-primary)",
                  color: "var(--color-bg)",
                }}
                onClick={confirmSync}
              >
                Sincronizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuButton({
  icon,
  iconBg,
  label,
  sub,
  onClick,
  loading,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  sub: string;
  onClick?: () => void;
  loading?: boolean;
}) {
  return (
    <button className={styles.menuItem} onClick={onClick} disabled={loading}>
      <div className={styles.menuIcon} style={{ background: iconBg }}>
        {loading ? <span className={styles.spinner} /> : icon}
      </div>
      <div className={styles.menuText}>
        <span className={styles.menuLabel}>{label}</span>
        <span className={styles.menuSub}>{sub}</span>
      </div>
      <span className={styles.chevron}>›</span>
    </button>
  );
}

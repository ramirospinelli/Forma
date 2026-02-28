import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRegisterSW } from "virtual:pwa-register/react";
import { LogOut, RefreshCw, Settings, Smartphone } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import { syncAllActivities } from "../lib/strava";
import Header from "../components/Header";
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
  const [isStandalone, setIsStandalone] = useState(
    window.matchMedia("(display-mode: standalone)").matches,
  );
  const [swRegistration, setSwRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

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

  const { data: peakFitness = 0 } = useQuery({
    queryKey: ["peakFitness", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_load_profile")
        .select("ctl")
        .eq("user_id", user!.id)
        .order("ctl", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ? Math.round(data.ctl) : 0;
    },
    enabled: !!user,
  });

  const { data: thresholds = 0 } = useQuery({
    queryKey: ["thresholds", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_thresholds")
        .select("default_lthr")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data?.default_lthr || 0;
    },
    enabled: !!user,
  });

  const { data: monthlyLoad = 0 } = useQuery({
    queryKey: ["monthlyLoad", user?.id],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString().split("T")[0];

      const { data } = await supabase
        .from("daily_load_profile")
        .select("daily_trimp")
        .eq("user_id", user!.id)
        .gte("date", dateStr);
      if (!data) return 0;
      return Math.round(data.reduce((sum, row) => sum + row.daily_trimp, 0));
    },
    enabled: !!user,
  });

  const syncMutation = useMutation({
    mutationFn: () => syncAllActivities(user!.id),
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      toast.success(`${count} actividades importadas`);
    },
    onError: () => toast.error("Error al sincronizar"),
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
      // Install
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
      // Update found and ready
      updateServiceWorker(true);
      toast.loading("Actualizando...");
    } else {
      // Manual check
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

  return (
    <div className={styles.page}>
      <Header title="Perfil" />

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

        {/* Stats */}
        <div className={styles.statsRow}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{peakFitness}</span>
            <span className={styles.statLabel}>Fitness Peak</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statValue}>
              {thresholds > 0 ? thresholds : "--"}
            </span>
            <span className={styles.statLabel}>LTHR (ppm)</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statValue}>{monthlyLoad}</span>
            <span className={styles.statLabel}>Carga (30d)</span>
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

        {/* Sign out */}
        <button className={styles.signOutBtn} onClick={handleSignOut}>
          <LogOut size={18} />
          Cerrar Sesión
        </button>

        {/* App version & copyright */}
        <div className={styles.appFooter}>
          <span className={styles.appVersion}>Forma v1.0.0</span>
          <span className={styles.appCopyright}>
            &copy; {new Date().getFullYear()} Forma Fitness. Todos los derechos
            reservados.
          </span>
        </div>
      </div>

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

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { syncAllActivities } from "../../lib/strava";
import { syncPlannedWorkouts } from "../../lib/tp";
import { useInstallPrompt } from "../../lib/hooks/useInstallPrompt";
import { Activity } from "../../lib/types";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from "../../constants/theme";
import Header from "../../components/Header";
import { LinearGradient } from "expo-linear-gradient";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut, fetchProfile } = useAuthStore();
  const queryClient = useQueryClient();
  const [isSyncingTP, setIsSyncingTP] = useState(false);
  const { isInstallable, isIOSWeb, isInstalled, promptInstall } =
    useInstallPrompt();

  const { data: activities = [] } = useQuery({
    queryKey: ["activities", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!user,
  });

  const syncAllMutation = useMutation({
    mutationFn: () => syncAllActivities(user!.id),
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      Toast.show({
        type: "success",
        text1: "Sincronización completa",
        text2: `${count} actividades importadas.`,
      });
    },
    onError: () => {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "No se pudo sincronizar. Verificá tu conexión.",
      });
    },
  });

  const handleSignOut = async () => {
    if (Platform.OS === "web") {
      await signOut();
      window.location.assign("/");
      return;
    }

    Alert.alert("Cerrar sesión", "¿Querés salir de Forma?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/");
        },
      },
    ]);
  };

  const handleFullSync = async () => {
    const confirmed =
      Platform.OS === "web"
        ? window.confirm(
            "🔄 Sincronización completa\n\nEsto importará TODAS tus actividades de Strava. Puede tardar unos minutos.",
          )
        : await new Promise((resolve) => {
            Alert.alert(
              "🔄 Sincronización completa",
              "Esto importará TODAS tus actividades de Strava. Puede tardar unos minutos.",
              [
                {
                  text: "Cancelar",
                  style: "cancel",
                  onPress: () => resolve(false),
                },
                {
                  text: "Sincronizar todo",
                  onPress: () => resolve(true),
                },
              ],
            );
          });

    if (confirmed) {
      syncAllMutation.mutate();
    }
  };

  const handleTPConnect = async () => {
    try {
      const message = profile?.tp_access_token
        ? "¿Querés sincronizar tus entrenamientos de TrainingPeaks ahora?"
        : "¿Querés conectar con TrainingPeaks para ver tus entrenamientos planificados?";

      const confirmed =
        Platform.OS === "web"
          ? window.confirm(message)
          : await new Promise((resolve) => {
              Alert.alert("TrainingPeaks", message, [
                {
                  text: "Cancelar",
                  style: "cancel",
                  onPress: () => resolve(false),
                },
                { text: "Confirmar", onPress: () => resolve(true) },
              ]);
            });

      if (!confirmed) return;

      setIsSyncingTP(true);

      if (!profile?.tp_access_token) {
        const mockTokens = {
          tp_access_token: "mock_tp_" + Date.now(),
          tp_refresh_token: "mock_refresh_" + Date.now(),
          tp_token_expires_at: new Date(Date.now() + 3600000).toISOString(),
        };

        const { error } = await supabase
          .from("profiles")
          .update(mockTokens)
          .eq("id", user!.id);

        if (error) throw error;
      }

      await syncPlannedWorkouts(user!.id);
      await fetchProfile(user!.id);
      queryClient.invalidateQueries({ queryKey: ["planned_workouts"] });

      Toast.show({
        type: "success",
        text1: "Sincronización completa",
        text2: "Tus entrenamientos de TrainingPeaks han sido actualizados.",
      });
    } catch (error) {
      console.error(error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "No se pudo sincronizar con TrainingPeaks.",
      });
    } finally {
      setIsSyncingTP(false);
    }
  };

  const totalDistance = activities.reduce((s, a) => s + a.distance, 0);
  const totalTime = activities.reduce((s, a) => s + a.moving_time, 0);
  const totalActivities = activities.length;

  return (
    <View style={styles.container}>
      <Header title="Mi Perfil" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile header */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={["rgba(255,107,53,0.1)", "transparent"]}
            style={styles.profileGradient}
          >
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                {profile?.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarEmoji}>🧑‍🎽</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.editAvatar}>
                  <Ionicons name="camera" size={16} color="white" />
                </TouchableOpacity>
              </View>

              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {profile?.full_name ?? "Atleta"}
                </Text>
                <Text style={styles.profileEmail}>{user?.email}</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.stravaTag}>
                    <Ionicons name="flash" size={10} color="#FC4C02" />
                    <Text style={styles.stravaTagText}>STRAVA</Text>
                  </View>
                  {profile?.tp_access_token && (
                    <View
                      style={[
                        styles.stravaTag,
                        { backgroundColor: "rgba(7, 137, 230, 0.2)" },
                      ]}
                    >
                      <Ionicons name="trophy" size={10} color="#0789E6" />
                      <Text
                        style={[styles.stravaTagText, { color: "#0789E6" }]}
                      >
                        TP
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.statsSummary}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalActivities}</Text>
                <Text style={styles.statLabel}>Actividades</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {(totalDistance / 1000).toFixed(0)}
                </Text>
                <Text style={styles.statLabel}>KM TOTALES</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {Math.round(totalTime / 3600)}h
                </Text>
                <Text style={styles.statLabel}>TIEMPO</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Performance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rendimiento</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/profile/edit-performance")}
            >
              <View
                style={[
                  styles.menuIcon,
                  { backgroundColor: "rgba(255,107,53,0.1)" },
                ]}
              >
                <Ionicons name="fitness" size={20} color={Colors.primary} />
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuTitle}>Perfil fisiológico</Text>
                <Text style={styles.menuSub}>Peso, altura y umbrales (TP)</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sincronización</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={handleFullSync}>
              <View
                style={[
                  styles.menuIcon,
                  { backgroundColor: "rgba(78,205,196,0.1)" },
                ]}
              >
                {syncAllMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.accent} />
                ) : (
                  <Ionicons name="sync" size={20} color={Colors.accent} />
                )}
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuTitle}>Sincronizar historial</Text>
                <Text style={styles.menuSub}>Importar todo desde Strava</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={Colors.textMuted}
              />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={handleTPConnect}>
              <View
                style={[
                  styles.menuIcon,
                  { backgroundColor: "rgba(7, 137, 230, 0.1)" },
                ]}
              >
                {isSyncingTP ? (
                  <ActivityIndicator size="small" color="#0789E6" />
                ) : (
                  <Ionicons name="trophy" size={20} color="#0789E6" />
                )}
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuTitle}>TrainingPeaks</Text>
                <Text style={styles.menuSub}>
                  {profile?.tp_access_token
                    ? "Gestionar conexión"
                    : "Conectar planes de entrenamiento"}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferencias</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem}>
              <View
                style={[
                  styles.menuIcon,
                  { backgroundColor: "rgba(255,107,53,0.1)" },
                ]}
              >
                <Ionicons
                  name="notifications"
                  size={20}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuTitle}>Notificaciones</Text>
                <Text style={styles.menuSub}>Alertas de entrenamiento</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={Colors.textMuted}
              />
            </TouchableOpacity>

            {!isInstalled && Platform.OS === "web" && (
              <React.Fragment>
                <View style={styles.menuDivider} />
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    if (isInstallable) {
                      promptInstall();
                    } else if (isIOSWeb) {
                      Alert.alert(
                        "Instalar Forma",
                        "Toca el ícono Compartir ⬆️ abajo en Safari y luego selecciona 'Agregar a Inicio'.",
                        [{ text: "Entendido", style: "cancel" }],
                      );
                    } else {
                      Alert.alert(
                        "Instalar Forma",
                        "Por favor ingresa desde tu móvil y busca la opción 'Instalar aplicación' o 'Agregar a la pantalla de inicio' en tu navegador para la experiencia completa.",
                        [{ text: "Entendido", style: "cancel" }],
                      );
                    }
                  }}
                >
                  <View
                    style={[
                      styles.menuIcon,
                      { backgroundColor: "rgba(0,122,255,0.1)" },
                    ]}
                  >
                    <Ionicons
                      name="phone-portrait-outline"
                      size={20}
                      color="#007AFF"
                    />
                  </View>
                  <View style={styles.menuText}>
                    <Text style={styles.menuTitle}>Instalar Aplicación</Text>
                    <Text style={styles.menuSub}>Obtén Forma en tu inicio</Text>
                  </View>
                  <Ionicons name="download-outline" size={16} color="#007AFF" />
                </TouchableOpacity>
              </React.Fragment>
            )}
          </View>
        </View>

        <View style={[styles.section, { marginBottom: 120 }]}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
          <Text style={styles.versionText}>
            Forma v1.0.0 • Hecho para atletas
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    paddingTop: Spacing.md,
  },
  profileCard: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },
  profileGradient: {
    padding: Spacing.xl,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.bgSurface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarEmoji: { fontSize: 36 },
  editAvatar: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: Colors.bgCard,
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  profileEmail: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
  },
  stravaTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(252, 76, 2, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  stravaTagText: {
    fontSize: 9,
    color: "#FC4C02",
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.5,
  },
  statsSummary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: FontWeight.bold,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: {
    flex: 1,
    gap: 2,
  },
  menuTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  menuSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,87,87,0.1)",
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,87,87,0.2)",
  },
  logoutText: {
    color: Colors.danger,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.md,
  },
  versionText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: Spacing.xl,
  },
});

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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { syncAllActivities } from "../../lib/strava";
import { syncPlannedWorkouts } from "../../lib/tp";
import { Activity } from "../../lib/types";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
} from "../../constants/theme";
import { LinearGradient } from "expo-linear-gradient";

export default function ProfileScreen() {
  const { user, profile, signOut, fetchProfile } = useAuthStore();
  const queryClient = useQueryClient();
  const [isSyncingTP, setIsSyncingTP] = useState(false);

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
      Alert.alert(
        "✅ Sincronización completa",
        `${count} actividades importadas.`,
      );
    },
    onError: () => {
      Alert.alert("Error", "No se pudo sincronizar. Verificá tu conexión.");
    },
  });

  const handleSignOut = () => {
    Alert.alert("Cerrar sesión", "¿Querés salir de Forma?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: signOut },
    ]);
  };

  const handleFullSync = () => {
    Alert.alert(
      "🔄 Sincronización completa",
      "Esto importará TODAS tus actividades de Strava. Puede tardar unos minutos.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sincronizar todo",
          onPress: () => syncAllMutation.mutate(),
        },
      ],
    );
  };

  const handleTPConnect = async () => {
    try {
      const confirmed = window.confirm(
        profile?.tp_access_token
          ? "¿Querés sincronizar tus entrenamientos de TrainingPeaks ahora?"
          : "¿Querés conectar con TrainingPeaks para ver tus entrenamientos planificados?",
      );

      if (!confirmed) return;

      setIsSyncingTP(true);

      // Demo mode: update profile with dummy tokens if not present
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
      await fetchProfile();
      queryClient.invalidateQueries({ queryKey: ["planned_workouts"] });

      Alert.alert(
        "✅ Sincronización completa",
        "Tus entrenamientos de TrainingPeaks han sido actualizados.",
      );
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo sincronizar con TrainingPeaks.");
    } finally {
      setIsSyncingTP(false);
    }
  };

  const totalDistance = activities.reduce((s, a) => s + a.distance, 0);
  const totalTime = activities.reduce((s, a) => s + a.moving_time, 0);
  const totalActivities = activities.length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile header */}
      <LinearGradient
        colors={["rgba(255,107,53,0.15)", "transparent"]}
        style={styles.headerGradient}
      >
        <View style={styles.profileHeader}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarEmoji}>🧑‍🎽</Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {profile?.full_name ?? "Atleta"}
            </Text>
            <View style={styles.stravaTag}>
              <Text style={styles.stravaTagText}>⚡ Conectado con Strava</Text>
            </View>
            {profile?.tp_access_token && (
              <View
                style={[
                  styles.stravaTag,
                  { backgroundColor: "rgba(7, 137, 230, 0.2)", marginTop: 4 },
                ]}
              >
                <Text style={[styles.stravaTagText, { color: "#0789E6" }]}>
                  🏆 Conectado con TrainingPeaks
                </Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Stats summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mi resumen</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalActivities}</Text>
            <Text style={styles.statLabel}>Actividades</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {(totalDistance / 1000).toFixed(0)} km
            </Text>
            <Text style={styles.statLabel}>Distancia</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {Math.round(totalTime / 3600)}h
            </Text>
            <Text style={styles.statLabel}>Tiempo</Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sincronización</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => syncAllMutation.mutate()}
            disabled={syncAllMutation.isPending}
          >
            <View
              style={[
                styles.menuIcon,
                { backgroundColor: "rgba(78,205,196,0.15)" },
              ]}
            >
              {syncAllMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.accent} />
              ) : (
                <Ionicons name="sync" size={20} color={Colors.accent} />
              )}
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Sincronizar todo</Text>
              <Text style={styles.menuSub}>
                Importar todas tus actividades de Strava
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuItem}>
            <View
              style={[
                styles.menuIcon,
                { backgroundColor: "rgba(255,107,53,0.15)" },
              ]}
            >
              <Ionicons name="notifications" size={20} color={Colors.primary} />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Notificaciones</Text>
              <Text style={styles.menuSub}>Próximamente</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleTPConnect}
            disabled={isSyncingTP}
          >
            <View
              style={[
                styles.menuIcon,
                { backgroundColor: "rgba(7, 137, 230, 0.15)" },
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
                  : "Conectar con TrainingPeaks"}
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

      {/* Account */}
      <View style={[styles.section, { marginBottom: 100 }]}>
        <Text style={styles.sectionTitle}>Cuenta</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
            <View
              style={[
                styles.menuIcon,
                { backgroundColor: "rgba(255,87,87,0.15)" },
              ]}
            >
              <Ionicons name="log-out" size={20} color={Colors.danger} />
            </View>
            <View style={styles.menuText}>
              <Text style={[styles.menuTitle, { color: Colors.danger }]}>
                Cerrar sesión
              </Text>
              <Text style={styles.menuSub}>Salir de tu cuenta de Forma</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* App info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>Forma v1.0.0</Text>
        <Text style={styles.appInfoText}>Hecho con ❤️ para atletas</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    paddingTop: 60,
  },
  headerGradient: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.bgCard,
    borderWidth: 3,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: { fontSize: 36 },
  profileInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  profileName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
  },
  stravaTag: {
    backgroundColor: "rgba(252, 76, 2, 0.2)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignSelf: "flex-start",
  },
  stravaTagText: {
    fontSize: FontSize.xs,
    color: "#FC4C02",
    fontWeight: FontWeight.bold,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  statsRow: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
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
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
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
    marginLeft: 72,
  },
  appInfo: {
    alignItems: "center",
    paddingBottom: Spacing.xxl,
    gap: 4,
  },
  appInfoText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});

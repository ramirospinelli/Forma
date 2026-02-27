import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "../../../store/authStore";
import { useDailyLoadProfile } from "../../../lib/hooks/useMetrics";
import { aiCoachService, CoachResponse } from "../../../lib/services/aiCoach";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from "../../../constants/theme";
import Header from "../../../components/Header";
import Toast from "react-native-toast-message";

export default function CoachScreen() {
  const { user } = useAuthStore();
  const [insight, setInsight] = useState<CoachResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 1. Get Load Profile
  const { data: loadProfile, isLoading: isLoadLoading } = useDailyLoadProfile(
    user?.id,
    14,
  );

  // 2. Get Recent Activities
  const {
    data: recentActivities,
    isLoading: isActivitiesLoading,
    refetch,
  } = useQuery({
    queryKey: ["recent_activities_coach", user?.id],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("activities")
        .select("name, type, distance, start_date")
        .eq("user_id", user!.id)
        .gte("start_date", sevenDaysAgo.toISOString())
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const generateInsight = async (force = false) => {
    if (!loadProfile || loadProfile.length === 0) return;

    // Check if we already have an insight today to avoid burning API limits unnecessarily (unless forced)
    if (!force && insight) return;

    try {
      setIsAnalyzing(true);
      const latestMetrics = loadProfile[loadProfile.length - 1]; // Today's status

      const response = await aiCoachService.analyzeCurrentStatus(
        latestMetrics.ctl,
        latestMetrics.atl,
        latestMetrics.tsb,
        recentActivities || [],
        user?.user_metadata?.full_name || "Atleta",
      );

      setInsight(response);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error del Coach",
        text2: error.message || "No se pudo conectar con la IA.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (
      loadProfile &&
      loadProfile.length > 0 &&
      recentActivities !== undefined &&
      !insight &&
      !isAnalyzing
    ) {
      // Auto-generate on first load if we have data
      generateInsight();
    }
  }, [loadProfile, recentActivities]);

  const onRefresh = async () => {
    await refetch();
    await generateInsight(true);
  };

  const isLoading = isLoadLoading || isActivitiesLoading;

  return (
    <View style={styles.container}>
      <Header title="Tu Entrenador de IA" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        <Text style={styles.welcomeText}>
          Hola{" "}
          {user?.user_metadata?.full_name
            ? user.user_metadata.full_name.split(" ")[0]
            : user?.email?.split("@")[0] || "corredor"}
          . Analizo tus datos de fatiga, forma física y volumen para darte
          feedback.
        </Text>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Recopilando métricas...</Text>
          </View>
        ) : isAnalyzing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.loadingText}>
              Gemini está analizando tu estado actual...
            </Text>
          </View>
        ) : loadProfile && loadProfile.length > 0 ? (
          <>
            {insight ? (
              <>
                {/* Status Card */}
                <View style={styles.insightCard}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="sparkles" size={24} color={Colors.accent} />
                    <Text style={styles.cardTitle}>Evaluación de Estado</Text>
                  </View>
                  <Text style={styles.insightMessage}>{insight.message}</Text>
                </View>

                {/* Recommendations */}
                <Text style={styles.sectionTitle}>Recomendaciones Activas</Text>
                <View style={styles.adviceContainer}>
                  {insight.actionableAdvice.map((advice, index) => (
                    <View key={index} style={styles.adviceRow}>
                      <View style={styles.bulletPoint}>
                        <Text style={styles.bulletText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.adviceText}>{advice}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <View
                style={[
                  styles.centerContainer,
                  { paddingVertical: Spacing.xl },
                ]}
              >
                <Text style={styles.loadingText}>
                  Toca el botón debajo para que Gemini analice tu semana.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.refreshButton}
              onPress={() => generateInsight(true)}
              disabled={isAnalyzing}
            >
              <Ionicons name="refresh" size={18} color="#FFF" />
              <Text style={styles.refreshButtonText}>Pedir nuevo análisis</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name="analytics-outline"
              size={48}
              color={Colors.border}
            />
            <Text style={styles.emptyTitle}>Sin datos suficientes</Text>
            <Text style={styles.emptySubtitle}>
              Necesitamos al menos unos días de entrenamiento en tu historial
              para que la IA pueda aconsejarte. Sincroniza en el inicio.
            </Text>
          </View>
        )}
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
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  welcomeText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  centerContainer: {
    padding: Spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontStyle: "italic",
    textAlign: "center",
  },
  insightCard: {
    backgroundColor: "rgba(78,205,196,0.1)",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(78,205,196,0.2)",
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.accent,
  },
  insightMessage: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    lineHeight: 24,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    marginLeft: 4,
  },
  adviceContainer: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  adviceRow: {
    flexDirection: "row",
    backgroundColor: Colors.bgCard,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    alignItems: "flex-start",
  },
  bulletPoint: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,107,53,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -2,
  },
  bulletText: {
    color: Colors.primary,
    fontWeight: "bold",
    fontSize: 12,
  },
  adviceText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  refreshButton: {
    flexDirection: "row",
    backgroundColor: Colors.bgCard,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    alignSelf: "center",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  refreshButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: FontSize.sm,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
    lineHeight: 20,
  },
});

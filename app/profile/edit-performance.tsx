import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from "../../constants/theme";
import Header from "../../components/Header";
import { calculateDynamicZones, HrZone } from "../../lib/domain/metrics/zones";
import { MetricPersistenceService } from "../../lib/services/metrics";

export default function EditPerformanceScreen() {
  const router = useRouter();
  const { user, profile, fetchProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // Form states
  const [weight, setWeight] = useState(profile?.weight_kg?.toString() || "");
  const [height, setHeight] = useState(profile?.height_cm?.toString() || "");
  const [lthr, setLthr] = useState(profile?.lthr?.toString() || "");
  const [birthDate, setBirthDate] = useState(profile?.birth_date || "");
  const [gender, setGender] = useState<"male" | "female" | "other">(
    profile?.gender || "male",
  );

  const [thresholdPace, setThresholdPace] = useState("4:30");
  const [thresholdPower, setThresholdPower] = useState("250");
  const [ftp, setFtp] = useState("250");
  const [customZones, setCustomZones] = useState<HrZone[]>([]);

  useEffect(() => {
    async function loadThresholds() {
      if (!user) return;
      const { data } = await supabase
        .from("user_thresholds")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setThresholdPower(data.threshold_power?.toString() || "250");
        setFtp(data.ftp?.toString() || "250");

        // Convert seconds/km to min:sec
        const totalSec = data.threshold_pace || 270;
        const mins = Math.floor(totalSec / 60);
        const secs = Math.floor(totalSec % 60);
        setThresholdPace(`${mins}:${secs < 10 ? "0" : ""}${secs}`);

        if (data.hr_zones) {
          setCustomZones(data.hr_zones);
        } else {
          // Initialize with calculated zones if none exist
          const calculated = calculateDynamicZones({
            lthr: profile?.lthr || 0,
            birth_date: profile?.birth_date,
          });
          setCustomZones(calculated.zones);
        }
      }
    }
    loadThresholds();
  }, [user]);

  const updateZone = (index: number, field: "min" | "max", value: string) => {
    const val = parseInt(value) || 0;
    const nextZones = [...customZones];
    nextZones[index] = { ...nextZones[index], [field]: val };

    // Automatically adjust adjacent zones to prevent overlaps
    if (field === "max" && index < nextZones.length - 1) {
      nextZones[index + 1] = { ...nextZones[index + 1], min: val + 1 };
    }
    if (field === "min" && index > 0) {
      nextZones[index - 1] = { ...nextZones[index - 1], max: val - 1 };
    }

    setCustomZones(nextZones);
  };

  const resetZones = () => {
    const calculated = calculateDynamicZones({
      lthr: lthr ? parseInt(lthr) : 0,
      birth_date: birthDate,
    });
    setCustomZones(calculated.zones);
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Update Profile (Biometrics)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          weight_kg: weight ? parseFloat(weight) : null,
          height_cm: height ? parseInt(height) : null,
          lthr: lthr ? parseInt(lthr) : null,
          birth_date: birthDate || null,
          gender: gender,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // 2. Update Thresholds
      // Convert pace min:sec to seconds
      const paceParts = thresholdPace.split(":");
      const paceSeconds =
        paceParts.length === 2
          ? parseInt(paceParts[0]) * 60 + parseInt(paceParts[1])
          : parseInt(paceParts[0]);

      const { error: thresholdError } = await supabase
        .from("user_thresholds")
        .upsert({
          user_id: user.id,
          threshold_pace: paceSeconds || 270,
          threshold_power: parseFloat(thresholdPower) || 250,
          ftp: parseFloat(ftp) || 250,
          hr_zones: customZones,
          updated_at: new Date().toISOString(),
        });

      if (thresholdError) throw thresholdError;

      await fetchProfile(user.id);

      Toast.show({
        type: "success",
        text1: "¡Perfil actualizado!",
        text2: "Tus datos de rendimiento han sido guardados.",
      });
      router.back();
    } catch (error: any) {
      console.error(error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "No se pudieron guardar los cambios.",
      });
    } finally {
      setLoading(false);
    }
  };

  const [recalculating, setRecalculating] = useState(false);
  const handleRecalculate = async () => {
    if (!user) return;

    // Warning before starting
    const confirm =
      Platform.OS === "web"
        ? window.confirm(
            "¿Recalcular todo el historial? Esto usará tus zonas actuales para todas tus actividades pasadas. Puede tardar unos minutos.",
          )
        : true; // Phone will use Alert

    if (!confirm) return;

    if (Platform.OS !== "web") {
      Alert.alert(
        "Recalcular Historial",
        "¿Deseas actualizar todas tus actividades pasadas con estas zonas? Esto reseteará tus curvas de Fitness y Fatiga.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Confirmar", onPress: () => startRecalculate() },
        ],
      );
    } else {
      startRecalculate();
    }
  };

  const startRecalculate = async () => {
    if (!user) return;
    setRecalculating(true);
    try {
      await MetricPersistenceService.recomputeFullHistory(user.id);
      Toast.show({
        type: "success",
        text1: "Éxito",
        text2: "Tu historial de rendimiento ha sido actualizado.",
      });
    } catch (error: any) {
      console.error(error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "No se pudo completar la recalculación.",
      });
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Configuración de Rendimiento"
        showBack
        fallbackRoute="/profile"
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={Colors.accent} />
          <Text style={styles.infoText}>
            Usa tus datos de TrainingPeaks para que Forma calcule tu intensidad
            con precisión.
          </Text>
        </View>

        {/* Biometrics */}
        <Text style={styles.sectionTitle}>Biometría</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Peso (kg)</Text>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder="Ej: 72.5"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Altura (cm)</Text>
          <TextInput
            style={styles.input}
            value={height}
            onChangeText={setHeight}
            keyboardType="number-pad"
            placeholder="Ej: 178"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Fecha de Nacimiento (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={birthDate}
            onChangeText={setBirthDate}
            placeholder="Ej: 1985-05-20"
            placeholderTextColor={Colors.textMuted}
          />
          <Text style={styles.subtext}>
            Se usa para calcular tu edad y TRIMP avanzado.
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Género</Text>
          <View style={styles.genderRow}>
            {(["male", "female"] as const).map((g) => (
              <TouchableOpacity
                key={g}
                style={[
                  styles.genderButton,
                  gender === g && styles.genderButtonActive,
                ]}
                onPress={() => setGender(g)}
              >
                <Text
                  style={[
                    styles.genderButtonText,
                    gender === g && styles.genderButtonTextActive,
                  ]}
                >
                  {g === "male" ? "Hombre" : "Mujer"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Performance LTHR */}
        <Text style={styles.sectionTitle}>Fisiología</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Frecuencia Cardíaca Umbral (LTHR)</Text>
          <TextInput
            style={styles.input}
            value={lthr}
            onChangeText={setLthr}
            keyboardType="number-pad"
            placeholder="Ej: 168"
            placeholderTextColor={Colors.textMuted}
          />
          <Text style={styles.subtext}>
            Tus pulsaciones en el umbral láctico.
          </Text>
        </View>

        {/* Zone Editor */}
        <View style={styles.previewContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.previewTitle}>
              Zonas de Pulso (Pulsaciones)
            </Text>
            <TouchableOpacity onPress={resetZones}>
              <Text style={styles.resetText}>Reiniciar con Modelo</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.previewGrid}>
            {customZones.map((z, i) => (
              <View key={z.zone} style={styles.previewRow}>
                <View style={styles.previewLabelCol}>
                  <Text style={styles.previewZoneName}>Zona {z.zone}</Text>
                  <Text style={styles.previewLabel}>{z.label}</Text>
                </View>

                <View style={styles.rangeInputGroup}>
                  <TextInput
                    style={styles.rangeInput}
                    value={z.min.toString()}
                    onChangeText={(val) => updateZone(i, "min", val)}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.rangeSep}>-</Text>
                  <TextInput
                    style={styles.rangeInput}
                    value={z.max.toString()}
                    onChangeText={(val) => updateZone(i, "max", val)}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.previewBpm}>bpm</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Thresholds */}
        <Text style={styles.sectionTitle}>Ritmos Umbral (TrainingPeaks)</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Ritmo Umbral de Carrera (min/km)</Text>
          <TextInput
            style={styles.input}
            value={thresholdPace}
            onChangeText={setThresholdPace}
            placeholder="Ej: 4:15"
            placeholderTextColor={Colors.textMuted}
          />
          <Text style={styles.subtext}>
            Tu mejor ritmo sostenible en 10k o 21k.
          </Text>
        </View>

        <View style={styles.divider} />

        <Text style={[styles.sectionTitle, { opacity: 0.6 }]}>
          Ciclismo / Potencia (Opcional)
        </Text>
        <Text style={styles.infoTextSmall}>
          Si no tienes potenciómetro, puedes dejar estos valores por defecto.
          Forma usará tu pulso (LTHR) para calcular la intensidad en bici.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>FTP (Vatios / Watts)</Text>
          <TextInput
            style={[styles.input, { opacity: 0.8 }]}
            value={ftp}
            onChangeText={setFtp}
            keyboardType="number-pad"
            placeholder="Ej: 200"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <View style={styles.recalculateBox}>
          <Text style={styles.sectionTitle}>Mantenimiento de Datos</Text>
          <Text style={styles.infoTextSmall}>
            ¿Has actualizado sustancialmente tus zonas? Puedes aplicar estos
            nuevos rangos a todo tu historial para que tus gráficas sean
            coherentes.
          </Text>
          <TouchableOpacity
            style={[
              styles.recalculateButton,
              recalculating && styles.disabledButton,
            ]}
            onPress={handleRecalculate}
            disabled={recalculating}
          >
            {recalculating ? (
              <ActivityIndicator color={Colors.accent} size="small" />
            ) : (
              <>
                <Ionicons
                  name="refresh-circle"
                  size={20}
                  color={Colors.accent}
                />
                <Text style={styles.recalculateButtonText}>
                  Recalcular Todo el Historial
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.saveContainer}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.disabledButton]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.saveButtonText}>Guardar Cambios</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: 100 },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "rgba(78,205,196,0.1)",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: 10,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: "rgba(78,205,196,0.2)",
  },
  infoText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.accent,
    lineHeight: 16,
  },
  infoTextSmall: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
    marginBottom: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: 8,
    fontWeight: FontWeight.medium,
  },
  input: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
  },
  subtext: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
    fontStyle: "italic",
  },
  saveContainer: {
    marginTop: Spacing.xl,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    gap: 10,
    ...Shadows.md,
  },
  disabledButton: { opacity: 0.6 },
  saveButtonText: {
    color: "white",
    fontWeight: FontWeight.bold,
    fontSize: FontSize.md,
  },
  genderRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  genderButton: {
    flex: 1,
    padding: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  genderButtonActive: {
    backgroundColor: Colors.primary + "20",
    borderColor: Colors.primary,
  },
  genderButtonText: {
    color: Colors.textSecondary,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.sm,
  },
  genderButtonTextActive: {
    color: Colors.primary,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  resetText: {
    fontSize: 10,
    color: Colors.accent,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  rangeInputGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rangeInput: {
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: Colors.textPrimary,
    fontSize: 12,
    width: 45,
    textAlign: "center",
  },
  rangeSep: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  previewContainer: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  previewTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textTransform: "uppercase",
  },
  previewGrid: {
    gap: Spacing.xs,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  previewLabelCol: {
    flex: 1,
  },
  previewZoneName: {
    fontSize: 12,
    fontWeight: "bold",
    color: Colors.textPrimary,
  },
  previewLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  previewRange: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.accent,
  },
  previewBpm: {
    fontSize: 10,
    fontWeight: "normal",
    color: Colors.textMuted,
  },
  previewInfo: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: Spacing.md,
    textAlign: "center",
    fontStyle: "italic",
  },
  recalculateBox: {
    backgroundColor: "rgba(78,205,196,0.05)",
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.xl,
    borderWidth: 1,
    borderColor: "rgba(78,205,196,0.1)",
    borderStyle: "dashed",
  },
  recalculateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: Spacing.md,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
  },
  recalculateButtonText: {
    color: Colors.accent,
    fontWeight: "bold",
    fontSize: FontSize.sm,
  },
});

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
      }
    }
    loadThresholds();
  }, [user]);

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
          updated_at: new Date().toISOString(),
        });

      if (thresholdError) throw thresholdError;

      await fetchProfile(user.id);

      if (Platform.OS === "web") {
        window.alert("¡Perfil actualizado!");
      } else {
        Alert.alert("Éxito", "Tus datos de rendimiento han sido actualizados.");
      }
      router.back();
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Error",
        error.message || "No se pudieron guardar los cambios.",
      );
    } finally {
      setLoading(false);
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
});

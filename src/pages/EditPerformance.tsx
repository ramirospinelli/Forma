import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import { calculateDynamicZones } from "../lib/domain/metrics/zones";
import type { HrZone } from "../lib/domain/metrics/zones";
import styles from "./EditPerformance.module.css";

export default function EditPerformance() {
  const navigate = useNavigate();
  const { user, profile, fetchProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const [weight, setWeight] = useState(profile?.weight_kg?.toString() || "");
  const [height, setHeight] = useState(profile?.height_cm?.toString() || "");
  const [lthr, setLthr] = useState(profile?.lthr?.toString() || "");
  const [birthDate, setBirthDate] = useState(profile?.birth_date || "");
  const [gender, setGender] = useState<"male" | "female" | "other">(
    profile?.gender || "male",
  );
  const [thresholdPace, setThresholdPace] = useState("4:30");
  const [zones, setZones] = useState<HrZone[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_thresholds")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const totalSec = data.threshold_pace || 270;
          const mins = Math.floor(totalSec / 60);
          const secs = Math.floor(totalSec % 60);
          setThresholdPace(`${mins}:${secs < 10 ? "0" : ""}${secs}`);
        }
        const calculated = calculateDynamicZones({
          lthr: profile?.lthr || 0,
          birth_date: profile?.birth_date,
        });
        setZones(data?.hr_zones ?? calculated.zones);
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [paceMin, paceSec] = thresholdPace.split(":").map(Number);
      const threshPaceSec = paceMin * 60 + (paceSec || 0);

      await supabase.from("profiles").upsert({
        id: user.id,
        weight_kg: weight ? parseFloat(weight) : null,
        height_cm: height ? parseFloat(height) : null,
        lthr: lthr ? parseInt(lthr) : null,
        birth_date: birthDate || null,
        gender,
        updated_at: new Date().toISOString(),
      });

      await supabase.from("user_thresholds").upsert({
        user_id: user.id,
        threshold_pace: threshPaceSec,
        hr_zones: zones,
        updated_at: new Date().toISOString(),
      });

      await fetchProfile(user.id);
      toast.success("Datos guardados");
      navigate("/profile");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <h1 className={styles.title}>Zonas de Rendimiento</h1>
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? <span className={styles.spinner} /> : <Save size={18} />}
        </button>
      </header>

      <div className={styles.content}>
        <section>
          <h2 className={styles.sectionTitle}>Datos Físicos</h2>
          <div className={styles.card}>
            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>Peso (kg)</label>
              <input
                className={styles.input}
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="70"
              />
            </div>
            <div className={styles.divider} />
            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>Altura (cm)</label>
              <input
                className={styles.input}
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="175"
              />
            </div>
            <div className={styles.divider} />
            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>Fecha de nacimiento</label>
              <input
                className={styles.input}
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
            <div className={styles.divider} />
            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>Género</label>
              <select
                className={styles.select}
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
              >
                <option value="male">Masculino</option>
                <option value="female">Femenino</option>
                <option value="other">Otro</option>
              </select>
            </div>
          </div>
        </section>

        <section>
          <h2 className={styles.sectionTitle}>Umbrales</h2>
          <div className={styles.card}>
            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>LTHR (FC Umbral)</label>
              <input
                className={styles.input}
                type="number"
                value={lthr}
                onChange={(e) => setLthr(e.target.value)}
                placeholder="165"
              />
            </div>
            <div className={styles.divider} />
            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>Ritmo Umbral</label>
              <input
                className={styles.input}
                type="text"
                value={thresholdPace}
                onChange={(e) => setThresholdPace(e.target.value)}
                placeholder="4:30"
              />
            </div>
          </div>
        </section>

        {zones.length > 0 && (
          <section>
            <h2 className={styles.sectionTitle}>Zonas de FC</h2>
            <div className={styles.card}>
              {zones.map((z, i) => (
                <div key={i}>
                  <div className={styles.zoneRow}>
                    <div
                      className={styles.zoneDot}
                      style={{
                        background: [
                          "#4ECDC4",
                          "#96E6B3",
                          "#FFD93D",
                          "#FF9234",
                          "#FF6B6B",
                        ][i],
                      }}
                    />
                    <div className={styles.zoneInfo}>
                      <span className={styles.zoneName}>
                        {z.label ?? `Zona ${i + 1}`}
                      </span>
                      <div className={styles.zoneInputs}>
                        <input
                          type="number"
                          className={styles.zoneInput}
                          value={z.min}
                          onChange={(e) => {
                            const newMin = parseInt(e.target.value) || 0;
                            const newZones = [...zones];
                            newZones[i] = { ...newZones[i], min: newMin };
                            // Update previous zone's max
                            if (i > 0) {
                              newZones[i - 1] = {
                                ...newZones[i - 1],
                                max: newMin - 1,
                              };
                            }
                            setZones(newZones);
                          }}
                        />
                        <span className={styles.zoneSeparator}>–</span>
                        <input
                          type="number"
                          className={styles.zoneInput}
                          value={z.max}
                          onChange={(e) => {
                            const newMax = parseInt(e.target.value) || 0;
                            const newZones = [...zones];
                            newZones[i] = { ...newZones[i], max: newMax };
                            // Update next zone's min
                            if (i < newZones.length - 1) {
                              newZones[i + 1] = {
                                ...newZones[i + 1],
                                min: newMax + 1,
                              };
                            }
                            setZones(newZones);
                          }}
                        />
                        <span className={styles.zoneUnit}>bpm</span>
                      </div>
                    </div>
                  </div>
                  {i < zones.length - 1 && <div className={styles.divider} />}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

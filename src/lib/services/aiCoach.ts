import { GoogleGenerativeAI } from "@google/generative-ai";
import { TargetEvent, Activity, PlannedWorkout } from "../types";
import { decryptData } from "../utils";

export interface CoachResponse {
  insight: string;
  recommendations: string[];
}

export const aiCoachService = {
  async generateDailyInsight(options: {
    loadProfile: { ctl: number; atl: number; tsb: number };
    recentActivities: Activity[];
    upcomingEvents: TargetEvent[];
    profile: { weight_kg?: number; lthr?: number; gemini_api_key?: string };
    userName?: string;
  }): Promise<CoachResponse> {
    const {
      loadProfile,
      recentActivities,
      upcomingEvents,
      profile,
      userName = "Atleta",
    } = options;
    const API_KEY = await decryptData(profile.gemini_api_key || "");

    if (!API_KEY) {
      throw new Error("MISSING_API_KEY");
    }

    try {
      let prompt = `Eres Cochia, un coach de resistencia muy humano. 
      Atleta: ${userName}. 
      Estado: Condición ${loadProfile.ctl.toFixed(0)}, Cansancio ${loadProfile.atl.toFixed(0)}, Frescura ${loadProfile.tsb.toFixed(0)}.
      
      [Eventos]: ${upcomingEvents.length > 0 ? upcomingEvents.map((e) => `${e.name} (${new Date(e.event_date).toLocaleDateString()})`).join(", ") : "Ninguno pronto"}.
      [Recientes]: ${
        recentActivities
          .slice(0, 5)
          .map((a) => `${a.name}`)
          .join(", ") || "Nada aún"
      }.
      
      Genera una evaluación amigable (2 frases) y 2 consejos. No uses siglas. Habla de sensaciones y futuro.
      Respuesta JSON: { "insight": "...", "recommendations": ["...", "..."] }`;

      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const cleanJsonStr = result.response
        .text()
        .replace(/```json\n?|\n?```/g, "")
        .trim();
      const parsed = JSON.parse(cleanJsonStr);
      return {
        insight: parsed.insight,
        recommendations: parsed.recommendations,
      };
    } catch (error) {
      console.error("Daily Insight Error:", error);
      return {
        insight: "Cochia está analizando tus datos...",
        recommendations: ["Sigue sumando kilómetros."],
      };
    }
  },

  async analyzeActivity(
    activity: any,
    profile: { gemini_api_key?: string },
    userName: string = "Atleta",
  ): Promise<string> {
    const API_KEY = await decryptData(profile.gemini_api_key || "");
    if (!API_KEY) return "¡Excelente sesión!";

    try {
      const prompt = `Eres Cochia. Comenta este entreno de ${userName}: ${activity.name}. 2 frases cortas, motivadoras y sin tecnicismos.`;
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch {
      return "¡Excelente sesión!";
    }
  },

  async analyzeEventCompletion(options: {
    event: any;
    activity: any;
    profile: { gemini_api_key?: string };
    userName: string;
  }): Promise<string> {
    const API_KEY = await decryptData(options.profile.gemini_api_key || "");
    if (!API_KEY) return "¡Meta cumplida!";

    try {
      const prompt = `Eres Cochia. ${options.userName} terminó ${options.event.name}. 2-3 frases de orgullo humano.`;
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch {
      return "¡Meta cumplida!";
    }
  },

  async generateEventEveInsight(options: {
    event: any;
    readiness: any;
    loadProfile: any;
    profile: { gemini_api_key?: string };
    userName: string;
  }): Promise<string> {
    const API_KEY = await decryptData(options.profile.gemini_api_key || "");
    if (!API_KEY) return "Confía en tu entrenamiento.";

    try {
      const prompt = `Eres Cochia. Mañana es el evento de ${options.userName}: ${options.event.name}. 3 frases inspiradoras de confianza. Sin siglas.`;
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch {
      return "Confía en tu entrenamiento.";
    }
  },

  async chatWithCoach(options: {
    message: string;
    history: { role: "user" | "model"; content: string }[];
    loadProfile: { ctl: number; atl: number; tsb: number };
    recentActivities: Activity[];
    upcomingEvents: TargetEvent[];
    profile: { weight_kg?: number; lthr?: number; gemini_api_key?: string };
    userName?: string;
    thresholds?: any;
  }): Promise<string> {
    const {
      message,
      history,
      loadProfile,
      recentActivities,
      upcomingEvents,
      profile,
      userName = "Atleta",
      thresholds,
    } = options;
    const API_KEY = await decryptData(profile.gemini_api_key || "");

    if (!API_KEY) {
      throw new Error("MISSING_API_KEY");
    }

    const zonesStr = thresholds?.hr_zones
      ? JSON.stringify(thresholds.hr_zones)
      : "Zonas no configuradas";

    let contextStr = `Eres Cochia, un coach de resistencia experto y empático. Atleta: ${userName}.
    Hoy es ${new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.
    
    Usa lenguaje humano (Condición, Frescura, Cansancio). 
    [Estado]: Fit ${Math.round(loadProfile.ctl)}, Fat ${Math.round(loadProfile.atl)}, Form ${Math.round(loadProfile.tsb)}.
    [Próximos]: ${upcomingEvents.map((e) => `${e.name} (${e.event_date})`).join(", ") || "Ninguno"}.
    [Recientes]: ${recentActivities
      .slice(0, 10)
      .map((a) => a.name)
      .join(", ")}.
    [Zonas de FC]: ${zonesStr}. (Usa estos rangos de bpm para prescribir con precisión).
    
    CAPACIDADES Y REGLAS:
    1. Planificación: Genera planes de 7 días exactos. Un solo entrenamiento por día. No dupliques fechas.
       - Cada entrenamiento debe ser GRANULAR y contener toda la información necesaria.
       - Incluye estructura por tiempos (calentamiento, bloques, enfriamiento).
       - Especifica ZONAS (Z1, Z2, etc) y los BPM exactos según el perfil del atleta.
    2. Explicación Humana: Evita acrónimos como TSS e IF cuando hables con el usuario. Usa "Carga" e "Intensidad". 
       - Si el usuario pregunta qué significan, explícales que la Carga es el estrés total (volumen x intensidad) y la Intensidad es el porcentaje de su capacidad máxima (IF 0.8 = 80%).
    3. Gestión de Entrenamientos: Tienes acceso total. Si el usuario te pide crear, editar o borrar algo, responde con el JSON correspondiente.
    
    FORMATO DEL JSON DE ACCIÓN:
    \`\`\`json
    {
      "action": "upsert_plan" | "delete_workouts",
      "data": [...] 
    }
    \`\`\`
    
    - Para "upsert_plan": Envía un array de entrenamientos con:
      - date, title, activity_type, planned_tss, planned_intensity, planned_duration (segundos), coach_notes.
      - description: Resumen amigable.
      - workout_structure: Objeto JSON con { "warmup": [...], "main_set": [...], "cooldown": [...] }. Cada paso del array debe tener: { "min": segundos, "target": "bpm_range o zone", "description": "acción" }.
    - Para "delete_workouts": Envía un array de IDs o fechas a borrar.
    `;

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: contextStr,
      });
      const chat = model.startChat({
        history: history.map((h) => ({
          role: h.role,
          parts: [{ text: h.content }],
        })),
      });
      const result = await chat.sendMessage(message);
      return result.response.text();
    } catch (error: any) {
      console.error("Chat error:", error);
      if (error?.message?.includes("API_KEY_INVALID")) {
        return "Tu API Key de Gemini parece no ser correcta. Por favor revísala en tu perfil.";
      }
      return "Hubo un error al conectar con Cochia. Asegúrate de que tu API Key sea válida.";
    }
  },

  async generateWeeklyPlan(options: {
    loadProfile: { ctl: number; atl: number; tsb: number };
    recentActivities: Activity[];
    upcomingEvents: TargetEvent[];
    profile: { weight_kg?: number; lthr?: number; gemini_api_key?: string };
    userName?: string;
    thresholds?: any;
  }): Promise<Partial<PlannedWorkout>[]> {
    const {
      loadProfile,
      recentActivities,
      upcomingEvents,
      profile,
      userName = "Atleta",
    } = options;
    const API_KEY = await decryptData(profile.gemini_api_key || "");

    if (!API_KEY) throw new Error("MISSING_API_KEY");

    let prompt = `Eres Cochia, un personal trainer de resistencia experto y empático. 
    Tu meta: Planificar los próximos 7 días para ${userName}.
    Hoy es ${new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}. Es MUY importante que las fechas del plan partan desde mañana y sean futuras.
    
    [Estado Actual]:
    - Condición (CTL): ${loadProfile.ctl.toFixed(1)} (Fitness acumulado)
    - Cansancio (ATL): ${loadProfile.atl.toFixed(1)} (Fatiga reciente)
    - Frescura (TSB): ${loadProfile.tsb.toFixed(1)} (Estado de forma)
    
    [Objetivos]: ${
      upcomingEvents.length > 0
        ? upcomingEvents.map((e) => `${e.name} el ${e.event_date}`).join(", ")
        : "Mantener y mejorar la condición física general"
    }.
    [Últimos Entrenos]: ${
      recentActivities
        .slice(0, 5)
        .map((a) => `${a.type}: ${a.name}`)
        .join(", ") || "Ninguno recientemente"
    }.

    Reglas de Entrenamiento Inteligente:
    1. Un solo entrenamiento por día: Nunca sugieras dos actividades para la misma fecha.
    2. Respetar la Ley de la Sobrecarga: Si TSB < -25, el próximo entreno DEBE ser descanso o recuperación muy suave.
    3. Tapering: Si hay un evento en menos de 10 días, reduce el volumen a la mitad pero mantén algunos toques de intensidad.
    4. Granularidad: Cada entrenamiento debe detallar calentamiento, bloques principales y enfriamiento.
    5. Zonas: Especifica ZONAS de FC (Z1-Z5) y los BPM sugeridos según el perfil del atleta.
    6. Educación: En 'coach_notes', explica brevemente por qué sugieres ese entreno basado en sus números. Usa términos simples ("Carga", "Intensidad %").
    7. Variedad: Incluye días de descanso (status: 'planned', pero con descripción 'Descanso total').

    Genera un plan de 7 días exactos empezando desde mañana, en formato JSON.
    Formato de cada objeto:
    {
      "date": "YYYY-MM-DD",
      "title": "Nombre corto",
      "activity_type": "Run" | "Ride" | "Swim" | "Workout",
      "description": "Resumen rápido (Ej: 60' con intervalos Z4)",
      "planned_tss": carga_estimada_trimp,
      "planned_intensity": IF,
      "planned_duration": segundos,
      "coach_notes": "Explicación del beneficio fisiológico",
      "workout_structure": {
        "warmup": [{"min": segundos, "target": "FC o Zona", "description": "acción"}],
        "main_set": [{"min": segundos, "target": "FC o Zona", "description": "acción"}],
        "cooldown": [{"min": segundos, "target": "FC o Zona", "description": "acción"}]
      }
    }

    Respuesta: Solo el array JSON. No incluyas texto extra.`;

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const cleanJsonStr = result.response
        .text()
        .replace(/```json\n?|\n?```/g, "")
        .trim();
      const plan = JSON.parse(cleanJsonStr);

      return plan.map((w: any) => ({
        ...w,
        status: "planned",
      }));
    } catch (error) {
      console.error("Weekly Plan Error:", error);
      throw error;
    }
  },

  async analyzeCompliance(options: {
    planned: PlannedWorkout;
    actual: Activity;
    profile: { gemini_api_key?: string };
    userName?: string;
  }): Promise<string> {
    const { planned, actual, profile, userName = "Atleta" } = options;
    const API_KEY = await decryptData(profile.gemini_api_key || "");

    if (!API_KEY) return "¡Buen trabajo cumpliendo el plan!";

    const tssDiff = ((actual.tss || 0) - (planned.planned_tss || 0)).toFixed(0);
    const durationDiff = (
      (actual.moving_time - (planned.planned_duration || 0)) /
      60
    ).toFixed(0);

    const prompt = `Eres Cochia. ${userName} acaba de terminar una sesión. 
    Plan: ${planned.title} (${planned.planned_tss} TSS, ${Math.round((planned.planned_duration || 0) / 60)} min).
    Real: ${actual.name} (${actual.tss?.toFixed(0)} TSS, ${Math.round(actual.moving_time / 60)} min).
    
    Diferencia: ${tssDiff} de carga y ${durationDiff} min de tiempo.
    
    Genera un mensaje de 'Concientización' (2-3 frases). 
    - Si se pasó mucho de intensidad, advierte sobre la fatiga acumulada (ATL) y el riesgo de quemarse.
    - Si cumplió bien, felicita por la disciplina y explica cómo esto construye su fitness (CTL).
    - Si hizo mucho menos, anima a recuperar sensaciones sin presionar, pero recordando el objetivo.
    Usa un tono humano, de entrenador que sabe de fisiología pero habla simple.`;

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch {
      return "Análisis de cumplimiento completado. ¡Sigue así!";
    }
  },

  async adjustPlanBasedOnGap(options: {
    missedWorkouts: PlannedWorkout[];
    upcomingWorkouts: PlannedWorkout[];
    loadProfile: { ctl: number; atl: number; tsb: number };
    profile: { gemini_api_key?: string };
    userName?: string;
  }): Promise<Partial<PlannedWorkout>[]> {
    const {
      missedWorkouts,
      upcomingWorkouts,
      loadProfile,
      profile,
      userName = "Atleta",
    } = options;
    const API_KEY = await decryptData(profile.gemini_api_key || "");

    if (!API_KEY) throw new Error("MISSING_API_KEY");

    const prompt = `Eres Cochia. ${userName} ha tenido desviaciones en su plan.
    
    [Sesiones Perdidas/Modificadas]: ${missedWorkouts.map((w) => `${w.title} (${w.status})`).join(", ")}
    [Plan Próximo]: ${upcomingWorkouts.map((w) => w.title).join(", ")}
    [Estado de Fatiga]: CTL ${loadProfile.ctl.toFixed(0)}, ATL ${loadProfile.atl.toFixed(0)}, TSB ${loadProfile.tsb.toFixed(0)}
    
    Tu tarea: Ajustar los entrenamientos próximos para compensar o recuperar, PRIORIZANDO LA SALUD.
    - Si la fatiga es alta (TSB < -20) y perdió sesiones, NO intentes recuperar volumen. Sugiere descanso o suavizar lo que viene.
    - Si la fatiga es baja y perdió sesiones clave, intenta redistribuir un 50% de la carga perdida en los próximos 3 días sin saturar.
    - Sé muy educativo en las 'coach_notes'. Explica el ajuste.

    Devuelve un array JSON con los ajustes para los proximos entrenamientos (mismo formato que generateWeeklyPlan). Sólo el array.`;

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const cleanJsonStr = result.response
        .text()
        .replace(/```json\n?|\n?```/g, "")
        .trim();
      return JSON.parse(cleanJsonStr);
    } catch (error) {
      console.error("Adjustment Error:", error);
      return [];
    }
  },
};

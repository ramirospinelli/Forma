import { GoogleGenerativeAI } from "@google/generative-ai";

export interface CoachResponse {
  insight: string;
  recommendations: string[];
}

export const aiCoachService = {
  async generateDailyInsight(options: {
    loadProfile: { ctl: number; atl: number; tsb: number };
    recentActivities: any[];
    profile: { weight_kg?: number; lthr?: number; strava_id?: any };
    userName?: string;
  }): Promise<CoachResponse> {
    const {
      loadProfile,
      recentActivities,
      profile: _profile,
      userName = "Atleta",
    } = options;
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

    if (!API_KEY) {
      throw new Error(
        "No Gemini API key found. Please add VITE_GEMINI_API_KEY to your .env file.",
      );
    }

    try {
      let prompt = `
        Eres un entrenador profesional de resistencia (carrera y ciclismo). 
        El nombre de tu atleta es: ${userName}.
        
        Aquí están las métricas actuales del Performance Management Chart (PMC) del atleta:
        - Fitness (CTL): ${loadProfile.ctl.toFixed(1)}
        - Fatiga (ATL): ${loadProfile.atl.toFixed(1)}
        - Forma (TSB): ${loadProfile.tsb.toFixed(1)}

        Aquí están sus entrenamientos recientes (últimos 7 días):
      `;

      if (recentActivities.length > 0) {
        prompt += recentActivities
          .map(
            (w) =>
              `- ${new Date(w.start_date_local || w.start_date).toLocaleDateString("es-AR")}: ${w.name} (${w.type}), ${w.distance ? (w.distance / 1000).toFixed(1) + "km" : "N/A"}`,
          )
          .join("\n");
      } else {
        prompt +=
          "\nNo hay entrenamientos recientes registrados en los últimos 7 días.";
      }

      prompt += `
        \nPor favor, analiza este estado y proporciona:
        1. Una breve evaluación de su estado actual de forma y fatiga basada en el TSB. Háblale directamente al atleta con tono motivador pero estricto. (Máximo 2-3 líneas).
        2. Entre 2 y 3 consejos accionables y directos de qué debería hacer en los próximos 1-2 días.

        Devuelve tu respuesta EXACTAMENTE en este formato JSON, sin texto markdown extra ni explicaciones previas:
        {
          "insight": "Tu mensaje principal de evaluación...",
          "recommendations": ["Consejo 1...", "Consejo 2..."]
        }
      `;

      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      const cleanJsonStr = responseText
        .replace(/```json\n?|\n?```/g, "")
        .trim();

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(cleanJsonStr);
      } catch (e) {
        return {
          insight: responseText.substring(0, 300),
          recommendations: ["Sigue entrenando con precaución."],
        };
      }

      return {
        insight:
          parsedResponse.insight ||
          parsedResponse.message ||
          "Tu estado ha sido analizado.",
        recommendations: parsedResponse.recommendations ||
          parsedResponse.actionableAdvice || [
            "Sigue entrenando de forma constante.",
          ],
      };
    } catch (error: any) {
      console.error("AI Coach Error:", error);
      throw new Error(error?.message || "Error generating coach insights.");
    }
  },

  async analyzeActivity(
    activity: {
      name: string;
      type: string;
      distance: number;
      moving_time: number;
      total_elevation_gain: number;
      average_heartrate?: number;
      max_heartrate?: number;
      suffer_score?: number;
      trimp?: number;
      zoneDistribution?: any;
    },
    userName: string = "Atleta",
  ): Promise<string> {
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
    if (!API_KEY) {
      throw new Error("No Gemini API key found.");
    }

    const genAI = new GoogleGenerativeAI(API_KEY);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const distanceKm = (activity.distance / 1000).toFixed(2);
      const timeMins = Math.round(activity.moving_time / 60);
      const paceVal = timeMins / (activity.distance / 1000);
      const paceStr = `${Math.floor(paceVal)}:${Math.round((paceVal % 1) * 60)
        .toString()
        .padStart(2, "0")}/km`;

      const prompt = `
Eres un entrenador de resistencia avanzado. Analiza detalladamente esta actividad reciente del atleta ${userName}.
Evalúa el esfuerzo, no solo felicites.

Detalles Técnicos:
- Tipo: ${activity.type}
- Distancia: ${distanceKm} km
- Tiempo: ${timeMins} min
- Ritmo/Velocidad: ${paceStr}
- Desnivel Positivo: ${activity.total_elevation_gain}m
${activity.average_heartrate ? `- FC Media: ${Math.round(activity.average_heartrate)} lpm` : ""}
${activity.max_heartrate ? `- FC Max: ${Math.round(activity.max_heartrate)} lpm` : ""}
${activity.trimp ? `- Carga (TRIMP/TSS): ${Math.round(activity.trimp)}` : ""}

Basado en esto:
1. Califica cómo fue la intensidad del entrenamiento y si cumple un propósito específico (ej: recuperación, umbral, fondo).
2. Menciona algo positivo y un punto de mejora o advertencia (ej: "tu FC subió mucho al final").

Responde *solamente* con 2 o 3 oraciones precisas, directas de entrenador a atleta. No uses Markdown ni enumeraciones.
      `;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error: any) {
      console.error("Activity AI Error:", error);
      throw new Error("No se pudo generar el análisis.");
    }
  },

  async analyzeEventCompletion(options: {
    event: {
      name: string;
      target_distance: number;
      target_time?: number;
      target_elevation_gain?: number;
    };
    activity: { distance: number; moving_time: number; type: string };
    userName: string;
  }): Promise<string> {
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
    if (!API_KEY) throw new Error("No Gemini API key found.");

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const targetKm = (options.event.target_distance / 1000).toFixed(1);
    const actualKm = (options.activity.distance / 1000).toFixed(1);
    const targetTimeMins = options.event.target_time
      ? Math.round(options.event.target_time / 60)
      : null;
    const actualTimeMins = Math.round(options.activity.moving_time / 60);
    const targetElevation = options.event.target_elevation_gain;
    const actualElevation = (options.activity as any).total_elevation_gain || 0;

    const prompt = `
Eres un entrenador de resistencia de élite. Analiza el cumplimiento de este objetivo por parte del atleta ${options.userName}.
Objetivo: ${options.event.name} (${options.activity.type})
- Meta Distancia: ${targetKm} km
- Meta Tiempo: ${targetTimeMins ? targetTimeMins + " min" : "N/A"}
${targetElevation ? `- Meta Desnivel +: ${targetElevation} m` : ""}

Resultado Real:
- Distancia: ${actualKm} km
- Tiempo: ${actualTimeMins} min
- Desnivel +: ${actualElevation} m

Basado en esto:
1. Evalúa si se cumplió el objetivo y qué tan cerca estuvo (distancia, tiempo y desnivel si aplica).
2. Proporciona un mensaje de cierre de este ciclo de entrenamiento, ya sea felicitando un gran logro o analizando brechas de forma constructiva.
3. Sé inspirador pero técnico.

Responde con 3-4 oraciones directas de entrenador. No uses Markdown ni listas.
      `;

    try {
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      console.error("Event Analysis Error:", error);
      return "¡Excelente esfuerzo en tu objetivo! Tu coach analizará los detalles pronto.";
    }
  },

  async generateEventEveInsight(options: {
    event: {
      name: string;
      target_distance: number;
      activity_type: string;
      target_elevation_gain?: number;
    };
    readiness: {
      totalScore: number;
      accumulationScore: number;
      specificityScore: number;
      consistencyScore: number;
    };
    loadProfile: { ctl: number; atl: number; tsb: number };
    userName: string;
  }): Promise<string> {
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
    if (!API_KEY) throw new Error("No Gemini API key found.");

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
Eres un entrenador de resistencia de élite. Mañana es el día del evento objetivo para tu atleta ${options.userName}.
Evento: ${options.event.name} (${options.event.activity_type})
Distancia: ${(options.event.target_distance / 1000).toFixed(1)} km
${options.event.target_elevation_gain ? `Desnivel +: ${options.event.target_elevation_gain}m` : ""}

Estado Físico Actual (PMC):
- Fitness (CTL): ${options.loadProfile.ctl.toFixed(1)}
- Forma (TSB/Frescura): ${options.loadProfile.tsb.toFixed(1)} (Un TSB positivo indica frescura/taper)

Métricas de Preparación Específica:
- Score Total: ${options.readiness.totalScore}%
- Volumen Acumulado: ${options.readiness.accumulationScore.toFixed(0)}%
- Distancia Larga (Últ. 30d): ${options.readiness.specificityScore.toFixed(0)}%
- Consistencia (Últ. 4 sem): ${options.readiness.consistencyScore.toFixed(0)}%

Basado en esto, genera un "Brief Estratégico de Víspera":
1. No te centres solo en los números, úsalos para dar confianza o advertir focos de atención.
2. Explícale cómo llega físicamente (ej: "llegas fresco pero con buena base").
3. Da una frase motivadora potente para cerrar.

Responde en 4-5 oraciones cortas, inspiradoras y técnicas. No uses Markdown ni listas.
    `;

    try {
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      console.error("Event Eve Insight Error:", error);
      return "Mañana es el gran día. Confía en tu entrenamiento y sal a dar lo mejor.";
    }
  },

  async chatWithCoach(options: {
    message: string;
    history: { role: "user" | "model"; content: string }[];
    loadProfile: { ctl: number; atl: number; tsb: number };
    recentActivities: any[];
    profile: { weight_kg?: number; lthr?: number };
    userName?: string;
  }): Promise<string> {
    const {
      message,
      history,
      loadProfile,
      recentActivities,
      profile,
      userName = "Atleta",
    } = options;

    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
    if (!API_KEY) {
      throw new Error("No Gemini API key found.");
    }

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);

      let contextStr = `
Eres un entrenador de resistencia de élite (carrera y ciclismo). 
El atleta con el que hablas se llama: ${userName}.
Responde de forma concisa, directa, profesional y motivadora. Evita respuestas largas a menos que se te pida desarrollo.

[Datos Actuales del Atleta]
Performance Management Chart (PMC):
- Fitness (CTL): ${Math.round(loadProfile.ctl)}
- Fatiga (ATL): ${Math.round(loadProfile.atl)}
- Forma (TSB): ${Math.round(loadProfile.tsb)}
${profile.weight_kg ? `- Peso: ${profile.weight_kg}kg` : ""}
${profile.lthr ? `- FC Umbral (LTHR): ${profile.lthr} lpm` : ""}

[Últimos 30 Días de Entrenamientos]
      `;

      if (recentActivities.length > 0) {
        contextStr += recentActivities
          .map(
            (w) =>
              `- ${new Date(w.start_date_local || w.start_date).toLocaleDateString("es-AR")}: ${w.name} (${w.type}), ${w.distance ? (w.distance / 1000).toFixed(1) + "km" : "N/A"}${w.moving_time ? `, ${Math.round(w.moving_time / 60)}min` : ""}`,
          )
          .join("\n");
      } else {
        contextStr += "No hay entrenamientos recientes registrados.";
      }

      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: contextStr,
      });

      const formattedHistory = history.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      }));

      const chat = model.startChat({
        history: formattedHistory,
      });

      const result = await chat.sendMessage(message);
      return result.response.text();
    } catch (error: any) {
      console.error("Coach Chat Error:", error);
      throw new Error(error?.message || "Error communicating with AI coach.");
    }
  },
};

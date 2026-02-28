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
      profile,
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
              `- ${new Date(w.start_date).toLocaleDateString()}: ${w.name} (${w.type}), ${w.distance ? (w.distance / 1000).toFixed(1) + "km" : "N/A"}`,
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
        Eres un entrenador profesional de resistencia. Tu atleta, ${userName}, acaba de completar un entrenamiento.
        
        Detalles:
        - "${activity.name}" (${activity.type})
        - Distancia: ${distanceKm} km
        - Tiempo: ${timeMins} min
        - Ritmo: ${paceStr}
        - Desnivel+: ${activity.total_elevation_gain}m
        ${activity.average_heartrate ? `- FC Media: ${Math.round(activity.average_heartrate)} lpm` : ""}
        ${activity.trimp ? `- Carga (TRIMP): ${Math.round(activity.trimp)}` : ""}

        Escribe un comentario breve (2-3 líneas) de feedback para el atleta. Se directo y motivador.
        Devuelve SOLO el texto.
      `;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error: any) {
      console.error("Activity AI Error:", error);
      throw new Error("No se pudo generar el análisis.");
    }
  },
};

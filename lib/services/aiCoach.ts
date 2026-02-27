import { GoogleGenerativeAI } from "@google/generative-ai";

export interface CoachResponse {
  message: string;
  actionableAdvice: string[];
}

export const aiCoachService = {
  async analyzeCurrentStatus(
    ctl: number,
    atl: number,
    tsb: number,
    recentWorkouts: {
      name: string;
      type: string;
      distance: number;
      start_date: string;
    }[],
    userName: string = "Atleta",
  ): Promise<CoachResponse> {
    const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
    if (!API_KEY) {
      throw new Error(
        "No Gemini API key found. Please add EXPO_PUBLIC_GEMINI_API_KEY to your .env file.",
      );
    }

    try {
      let prompt = `
        Eres un entrenador profesional de resistencia (carrera y ciclismo). 
        El nombre de tu atleta es: ${userName}.
        
        Aquí están las métricas actuales del Performance Management Chart (PMC) del atleta:
        - Fitness (CTL): ${ctl.toFixed(1)}
        - Fatiga (ATL): ${atl.toFixed(1)}
        - Forma (TSB): ${tsb.toFixed(1)}

        Aquí están sus entrenamientos recientes (últimos 7 días):
      `;

      if (recentWorkouts.length > 0) {
        prompt += recentWorkouts
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
        1. Una breve evaluación de su estado actual de forma y fatiga basada en el TSB (positivo significa fresco, muy negativo significa demasiada fatiga). Háblale directamente al atleta con tono motivador pero estricto. (Máximo 2 líneas cortas).
        2. Entre 2 y 3 consejos accionables y directos de qué debería hacer en los próximos 1-2 días basándote en la fatiga actual y lo que acaba de hacer.

        Devuelve tu respuesta EXACTAMENTE en este formato JSON, sin texto markdown extra ni explicaciones previas:
        {
          "message": "Tu mensaje principal de evaluación...",
          "actionableAdvice": ["Consejo 1...", "Consejo 2..."]
        }
      `;

      const genAI = new GoogleGenerativeAI(API_KEY);

      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
      });

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      const cleanJsonStr = responseText
        .replace(/```json\n?|\n?```/g, "")
        .trim();

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(cleanJsonStr);
      } catch (e) {
        throw new Error(
          "Gemini returned invalid JSON structure: " + cleanJsonStr,
        );
      }

      return {
        message: parsedResponse.message || "Tu estado ha sido analizado.",
        actionableAdvice: parsedResponse.actionableAdvice || [
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
    const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
    if (!API_KEY) {
      throw new Error(
        "No Gemini API key found. Please add EXPO_PUBLIC_GEMINI_API_KEY to your .env file.",
      );
    }

    const genAI = new GoogleGenerativeAI(API_KEY);

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
      });

      const distanceKm = (activity.distance / 1000).toFixed(2);
      const timeMins = Math.round(activity.moving_time / 60);
      const paceVal = timeMins / (activity.distance / 1000);
      const paceStr = `${Math.floor(paceVal)}:${Math.round((paceVal % 1) * 60)
        .toString()
        .padStart(2, "0")}/km`;

      const prompt = `
        Eres un entrenador profesional de resistencia. Tu atleta, ${userName}, acaba de completar un entrenamiento.
        
        Aquí están los detalles de la actividad:
        - Título: "${activity.name}"
        - Deporte: ${activity.type}
        - Distancia: ${distanceKm} km
        - Tiempo: ${timeMins} minutos
        - Ritmo Promedio Aprox: ${paceStr}
        - Desnivel+: ${activity.total_elevation_gain} metros
        ${activity.average_heartrate ? `- Frecuencia Cardíaca Media: ${Math.round(activity.average_heartrate)} lpm` : ""}
        ${activity.trimp ? `- Carga Fisiológica (TRIMP): ${Math.round(activity.trimp)}` : ""}

        Escribe un análisis breve (máximo 4 líneas) evaluando este entrenamiento específico. 
        Menciona la intensidad (si fue duro o suave basado en la FC o el tiempo/distancia). 
        Usa un tono amistoso, motivador y directo como si fueras su entrenador dejándole un comentario rápido en Strava.
        Devuelve SOLO el texto del mensaje, nada más.
      `;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error: any) {
      console.error("Activity AI Error:", error);
      throw new Error("No se pudo generar el análisis de esta actividad.");
    }
  },
};

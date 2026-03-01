import { GoogleGenerativeAI } from "@google/generative-ai";
import { TargetEvent, Activity } from "../types";

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
    const API_KEY = profile.gemini_api_key || "";

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
    const API_KEY = profile.gemini_api_key || "";
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
    const API_KEY = options.profile.gemini_api_key || "";
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
    const API_KEY = options.profile.gemini_api_key || "";
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
  }): Promise<string> {
    const {
      message,
      history,
      loadProfile,
      recentActivities,
      upcomingEvents,
      profile,
      userName = "Atleta",
    } = options;
    const API_KEY = profile.gemini_api_key || "";

    if (!API_KEY) {
      throw new Error("MISSING_API_KEY");
    }

    let contextStr = `Eres Cochia. Atleta: ${userName}. Usa lenguaje humano (Condición, Frescura, Cansancio). 
    [Estado]: Fit ${Math.round(loadProfile.ctl)}, Fat ${Math.round(loadProfile.atl)}, Form ${Math.round(loadProfile.tsb)}.
    [Próximos]: ${upcomingEvents.map((e) => `${e.name} (${e.event_date})`).join(", ") || "Ninguno"}.
    [Recientes]: ${recentActivities
      .slice(0, 10)
      .map((a) => a.name)
      .join(", ")}.`;

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
};

# ⚡ Forma - Plataforma Inteligente de Rendimiento Deportivo

Forma es una PWA (Progressive Web App) integral para atletas exigentes. Centraliza tus datos de **Strava** y utiliza Inteligencia Artificial (**Gemini**) para convertirse en tu entrenador personal. Diseñada desde una perspectiva clínica y fisiológica, Forma calcula tu progreso a través del modelo PMC (Performance Management Chart), evalúa tu distribución zonal y pronostica tu estado de forma óptimo para competencias.

## ✨ Características Principales (v1.0.0)

- **AI Coach Impulsado por Gemini**: Tu propio entrenador interactivo que entiende tu historial, tu contexto (peso, umbrales) y tu progreso para darte sugerencias, felicitaciones y alertas tempranas de sobreentrenamiento.
- **Dashboard de Rendimiento PMC**: Gráficas basadas en métricas reales de estrés fisiológico:
  - **Fitness / CTL (Chronic Training Load)**: Capacidad aeróbica acumulada.
  - **Fatigue / ATL (Acute Training Load)**: Cansancio generado en los últimos 7 días.
  - **Form / TSB (Training Stress Balance)**: Equilibrio entre frescura y entrenamiento, ideal para planificar tus picos en competiciones.
- **Métricas Avanzadas en Tiempo Real**:
  - Frecuencia Cardiaca, Ritmo, Desnivel y Temperatura.
  - Seguimiento de Calorías Quemadas y Cadencia.
  - Cálculo automático de _Factor de Intensidad (IF)_, _Eficiencia Aeróbica (EF)_ y Decoupling a medida que entrenás.
- **Entrenamiento Polarizado y ACWR**: Evaluación de distribución Zonal del TRIMP (Base aeróbica vs Alta intensidad) y Escudo de Salud apoyado en tu carga aguda contra crónica para minimizar riesgos de lesiones.
- **Sincronización Inteligente**: Integración fluida y segura (OAuth) con Strava, superando asíncronamente los límites restrictivos de llamadas a su API.

## 🛠️ Stack Tecnológico

La aplicación migró de un stack móvil puro a una Web App Moderna altamente responsiva y escalable:

- **Frontend**: React 19 + TypeScript.
- **Bundler & Build Tool**: Vite (rápido y optimizado).
- **PWA (Progressive Web App)**: Instalable de forma nativa en iOS (Safari) y Android (Chrome), usando Vite-plugin-PWA e interfaz que se adapta al "Safe Area" del dispositivo.
- **Estilos**: Vanilla CSS Modules con un sistema de Tokens compartidos y estética "Glassmorphism" oscura y vibrante.
- **Mapas y Gráficas**: Recharts para visualización de métricas avanzadas, Mapbox/Leaflet para tracks y poli-líneas.
- **Backend & DB**: Supabase (PostgreSQL + RLS Security + Authentication).
- **Inteligencia Artificial**: API nativa de Google Gemini (@google/generative-ai).
- **Estado/Datos**: React Query (TanStack Query) para el fetching asíncrono y Zustand para stores locales.

## 🚀 Configuración para Desarrollo Local

1. **Clonar el repositorio**:

   ```bash
   git clone https://github.com/ramirospinelli/Forma.git
   cd Forma
   ```

2. **Instalar dependencias**:

   ```bash
   npm install
   ```

3. **Variables de Entorno**:
   Crea un archivo `.env.local` en la raíz (nunca lo subas al repo) con los siguientes secretos:

   ```env
   VITE_SUPABASE_URL=tu_url_supabase
   VITE_SUPABASE_ANON_KEY=tu_clave_anon_supabase
   VITE_STRAVA_CLIENT_ID=tu_client_id_strava
   VITE_GEMINI_API_KEY=tu_api_key_de_gemini
   ```

4. **Correr la aplicación**:
   ```bash
   npm run dev
   ```

## 🗄️ Base de Datos (Supabase)

Para que la aplicación funcione correctamente, debés ejecutar el contenido del archivo `supabase/schema.sql` en el SQL Editor de tu proyecto de Supabase. Esto instalará:

- Extensiones necesarias (`uuid-ossp`).
- Set completo de tablas clínicas (`profiles`, `activities`, `activity_metrics`, `user_thresholds`, `goals`, `metrics_history`, y `coach_chats`).
- Políticas de Seguridad RLS de acceso exclusivo por usuario logueado.

### Lógica Cron / Trabajos Secundarios

El proyecto utiliza un script de reseteo (`truncate_all.sql`) para debug y múltiples _Migrations_ escalables.

## 🔗 Configuración de APIs

### Strava API

Para que el inicio de sesión funcione en producción y local, configurá los dominios en el dashboard de Strava:

- **Authorization Callback Domain**: `ramirospinelli.github.io` o `localhost` para pruebas.
- **Redirect URIs en el Frontend**: Automáticamente gestionadas por `window.location.origin`.

### Gemini API (Google AI)

Asegurate de generar una Key desde Google AI Studio habilitando el acceso gratuito y colocarla en `VITE_GEMINI_API_KEY`.

---

Hecho con ❤️ para correr y pedalear inteligente.

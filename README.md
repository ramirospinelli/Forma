# ⚡ Forma - Fitness Performance Tracker

Forma es una aplicación de seguimiento de rendimiento diseñada para atletas que buscan centralizar sus datos de **Strava** y **TrainingPeaks** en una única interfaz moderna y analítica. Basada en los principios de gestión de carga de entrenamiento (PMC), Forma te ayuda a visualizar tu progreso, evitar lesiones y planificar tu futuro deportivo.

## ✨ Características Principales

- **Dashboard de Rendimiento**: Visualización de métricas avanzadas estilo TrainingPeaks:
  - **Fitness (CTL)**: Tu base de entrenamiento a largo plazo (42 días).
  - **Fatigue (ATL)**: Tu cansancio agudo a corto plazo (7 días).
  - **Form (TSB)**: El balance de frescura para competir.
- **Calendario Unificado de Actividades**:
  - Visualización de actividades completadas (desde Strava).
  - Visualización de entrenamientos planificados (desde TrainingPeaks).
  - Código de colores por deporte y estado de sincronización.
- **Métricas de Carga (TSS)**: Cálculo automático de carga basado en el "Relative Effort" de Strava o ingresos manuales.
- **Sincronización Multi-plataforma**: Integración fluida con Strava API y estructura preparada para TrainingPeaks.
- **Optimizado para Web y Móvil**: Desarrollado con Expo Router para una experiencia fluida.

## 🛠️ Stack Tecnológico

- **Frontend**: React Native + Expo (Expo Router v5).
- **Backend/DB**: Supabase (PostgreSQL + Auth).
- **Styling**: Vanilla CSS-in-JS (Theme system basado en constantes).
- **Estado/Datos**: TanStack Query (React Query) + Zustand.
- **APIs**: Strava API OAuth2, TrainingPeaks Integration.

## 🚀 Configuración para Desarrollo Local

1. **Clonar el repositorio**:

   ```bash
   git clone https://github.com/ramirospinelli/Forma.git
   cd Forma
   ```

2. **Instalar dependencias**:

   ```bash
   npm install --legacy-peer-deps
   ```

3. **Variables de Entorno**:
   Crea un archivo `.env` en la raíz con:

   ```env
   EXPO_PUBLIC_SUPABASE_URL=tu_url_supabase
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_supabase
   EXPO_PUBLIC_STRAVA_CLIENT_ID=tu_client_id_strava
   ```

4. **Correr la aplicación**:
   ```bash
   npx expo start --web
   ```

## 🗄️ Base de Datos (Supabase)

Para que la aplicación funcione correctamente, debés ejecutar el contenido del archivo `supabase/schema.sql` en el SQL Editor de tu proyecto de Supabase. Esto incluye:

- Extensiones necesarias (`uuid-ossp`).
- Tablas de `profiles`, `activities` y `planned_workouts`.
- Políticas de Seguridad de Nivel de Fila (RLS).

## 🌍 Despliegue (GitHub Pages)

La aplicación cuenta con una GitHub Action configurada para desplegarse automáticamente en GitHub Pages.

### Requisitos de Configuración en GitHub:

1. En **Settings > Pages**: Cambiar el Source a **GitHub Actions**.
2. En **Settings > Secrets and variables > Actions**: Añadir los siguientes "Secrets":
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_STRAVA_CLIENT_ID`

## 🔗 Configuración de APIs (Importante)

### Strava API

Para que el inicio de sesión funcione en producción:

- **Authorization Callback Domain**: `ramirospinelli.github.io`
- **Redirect URI**: `https://ramirospinelli.github.io/Forma/auth/callback`

### TrainingPeaks

La integración actual usa un modo demo que simula la conexión. Para integración real, se requiere aprobación de partner de TrainingPeaks.

---

Hecho con ❤️ para la comunidad de atletas.

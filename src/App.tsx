import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { supabase } from "./lib/supabase";
import { useAuthStore } from "./store/authStore";

// Pages
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Home from "./pages/Home";
import Activities from "./pages/Activities";
import Stats from "./pages/Stats";
import Coach from "./pages/Coach";
import Profile from "./pages/Profile";
import ActivityDetail from "./pages/ActivityDetail";
import EditPerformance from "./pages/EditPerformance";
import EventDetail from "./pages/EventDetail";
import WorkoutDetail from "./pages/WorkoutDetail";

// Layout
import TabBar from "./components/layout/TabBar";

import styles from "./App.module.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 * 5 } },
});

function ProtectedLayout() {
  const { session } = useAuthStore();
  if (!session) return <Navigate to="/auth" replace />;
  return (
    <div className={styles.appShell}>
      <div className={styles.pageContent}>
        <Outlet />
      </div>
      <TabBar />
    </div>
  );
}

function AppRoutes() {
  const { session, setSession, isLoading } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, [setSession]);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <span>⛰️</span>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={session ? <Navigate to="/" replace /> : <Auth />}
      />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/activities" element={<Activities />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/coach" element={<Coach />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/activity/:id" element={<ActivityDetail />} />
        <Route path="/event/:id" element={<EventDetail />} />
        <Route path="/plan/workout/:id" element={<WorkoutDetail />} />
        <Route path="/profile/edit-performance" element={<EditPerformance />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/Forma">
        <AppRoutes />
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "#12121a",
              color: "#FFFFFF",
              border: "1px solid #2a2a3d",
              borderRadius: "12px",
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

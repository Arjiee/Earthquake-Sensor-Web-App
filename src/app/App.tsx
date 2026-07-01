import { Toaster } from "sonner";
import { useAuth } from "./lib/useAuth";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";

// SEERS — Smart Earthquake Emergency Response System.
// Admin-gated real-time dashboard. Live data comes from the local backend
// (see /server, /face-service). In the Figma Make preview the backend is not
// reachable, so the dashboard renders in its "waiting for hardware" state.
export default function App() {
  const auth = useAuth();

  if (!auth.ready) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#0f172a" }}>
        <span className="font-mono-seers" style={{ color: "#94a3b8" }}>Loading SEERS…</span>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      {auth.user ? (
        <Dashboard user={auth.user} onLogout={auth.logout} />
      ) : (
        <Login onLogin={auth.login} />
      )}
    </>
  );
}

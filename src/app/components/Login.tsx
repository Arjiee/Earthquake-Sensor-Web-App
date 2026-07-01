import { useState } from "react";

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<void>;
}

// Full-screen admin login gate. Mirrors the login screen in the reference.
export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onLogin(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ background: "linear-gradient(135deg,#1e293b 0%,#0f172a 100%)" }}
    >
      <form
        onSubmit={submit}
        className="seers-fade-in w-[90%] max-w-[420px] rounded-xl border border-slate-200 bg-white p-10"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}
      >
        <div className="mb-8 text-center">
          <div className="font-head-seers tracking-[2px]" style={{ fontWeight: 900, fontSize: 28, color: "var(--seers-teal)" }}>
            SEERS <span style={{ color: "var(--seers-orange)" }}>|</span> ORCR
          </div>
          <div className="font-mono-seers mt-2 tracking-[1px]" style={{ fontSize: 12, color: "var(--seers-gray)" }}>
            SMART EARTHQUAKE EMERGENCY RESPONSE SYSTEM
          </div>
        </div>

        {error && (
          <div className="font-mono-seers mb-3 rounded-md border px-3 py-2" style={{ background: "#fee2e2", borderColor: "#fca5a5", color: "#dc2626", fontSize: 12 }}>
            {error}
          </div>
        )}

        <div className="mb-4 flex flex-col gap-1.5">
          <label className="font-head-seers uppercase tracking-[1px]" style={{ fontSize: 12, color: "var(--seers-ink)", fontWeight: 600 }}>Username</label>
          <input
            className="font-body-seers rounded-md border border-slate-200 bg-slate-50 px-3.5 py-3 outline-none focus:border-[var(--seers-teal)]"
            style={{ fontSize: 13, color: "var(--seers-ink)" }}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            autoComplete="username"
          />
        </div>

        <div className="mb-4 flex flex-col gap-1.5">
          <label className="font-head-seers uppercase tracking-[1px]" style={{ fontSize: 12, color: "var(--seers-ink)", fontWeight: 600 }}>Password</label>
          <input
            type="password"
            className="font-body-seers rounded-md border border-slate-200 bg-slate-50 px-3.5 py-3 outline-none focus:border-[var(--seers-teal)]"
            style={{ fontSize: 13, color: "var(--seers-ink)" }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="font-head-seers w-full rounded-md py-3 uppercase tracking-[1.5px] text-white transition disabled:opacity-50"
          style={{ background: "var(--seers-teal)", fontSize: 13, fontWeight: 700 }}
        >
          {busy ? "Signing in…" : "Login"}
        </button>

        <div
          className="font-mono-seers mt-4 rounded-md border px-3 py-2.5 text-center leading-[1.8]"
          style={{ background: "#f0f7ff", borderColor: "#bfdbfe", color: "#1d4ed8", fontSize: 11 }}
        >
          Default seeded admin: admin / seers123
        </div>
      </form>
    </div>
  );
}

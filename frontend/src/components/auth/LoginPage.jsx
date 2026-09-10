import { useEffect, useState } from "react";
import { ShieldCheck, Lock, Loader2, Cpu, GitBranch, Wifi } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api.js";
import GeometricPanel from "./GeometricPanel.jsx";
import Logo from "../common/Logo.jsx";

const FEATURES = [
  { Icon: Wifi, text: "Self-hosted, air-gapped — nothing leaves the building" },
  { Icon: Cpu, text: "Not locked to one model — routes each task to the right open-weight model" },
  { Icon: GitBranch, text: "Plans, acts, verifies, and replans — not a single prompt-in, answer-out box" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [demoAccounts, setDemoAccounts] = useState([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.demoAccounts().then(setDemoAccounts);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-screen w-full grid grid-cols-1 md:grid-cols-2" style={{ background: "var(--bg-base)" }}>
      {/* LEFT — sign-in */}
      <div className="flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-sm fade-up">
          <div className="flex items-center gap-2 mb-8">
            <Logo size={30} variant="on-light" />
            <span className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Solus</span>
          </div>

          <div className="rounded-xl border p-6 shadow-sm" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
            <div className="flex items-center gap-1.5 mb-1 text-xs" style={{ color: "var(--tier1)" }}>
              <ShieldCheck size={13} />
              Role-locked access
            </div>
            <h1 className="text-base font-semibold mb-5" style={{ color: "var(--text-primary)" }}>
              Sign in to your workbench
            </h1>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. r.iyer"
                  autoComplete="username"
                  className="w-full rounded-md border px-3 py-2.5 text-sm outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--brand-200)]"
                  style={{ borderColor: "var(--border)", color: "var(--text-primary)", background: "#fff" }}
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>Password</label>
                <div className="relative">
                  <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="demo"
                    autoComplete="current-password"
                    className="w-full rounded-md border pl-8 pr-3 py-2.5 text-sm outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--brand-200)]"
                    style={{ borderColor: "var(--border)", color: "var(--text-primary)", background: "#fff" }}
                  />
                </div>
              </div>

              {error && (
                <div className="text-xs rounded-md px-3 py-2" style={{ color: "var(--tier3)", background: "var(--tier3)10" }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="mt-1 rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: "var(--brand-700)", color: "#fff" }}
              >
                {busy && <Loader2 size={14} className="animate-spin" />}
                Sign in
              </button>
            </form>
          </div>

          <div className="mt-4 rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
            <div className="text-xs mb-2" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
              DEMO ACCOUNTS — password "demo" (admin: "admin")
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {demoAccounts.map((u) => (
                <button
                  key={u.username}
                  onClick={() => {
                    setUsername(u.username);
                    setPassword(u.crossRole ? "admin" : "demo");
                  }}
                  className="text-left rounded-md border px-2.5 py-1.5 text-[11px] transition-colors hover:border-[var(--brand-700)]"
                  style={{ borderColor: "var(--border-soft)", color: "var(--text-secondary)" }}
                >
                  <div style={{ color: "var(--text-primary)" }}>{u.name}</div>
                  <div style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{u.title}</div>
                </button>
              ))}
            </div>
            <p className="text-[10px] mt-2 leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
              Every account is locked to a single role workbench (§4.1) — a Procurement account
              never sees CodeAgent or the sandbox terminal. Only the admin account can cross
              roles, and every switch is written to the audit log.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT — brand / geometric panel */}
      <div
        className="hidden md:flex flex-col items-center justify-center relative overflow-hidden px-10"
        style={{ background: "linear-gradient(160deg, #24537A 0%, #3368A0 55%, #2C5D86 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(#F2EFE7 1px, transparent 1px), linear-gradient(90deg, #F2EFE7 1px, transparent 1px)",
            backgroundSize: "34px 34px",
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <div className="w-full flex items-center justify-center" style={{ height: 320 }}>
            <GeometricPanel />
          </div>

          <p className="text-lg leading-snug font-medium mt-2" style={{ color: "#F2EFE7" }}>
            "Your engineers are already pasting confidential P&amp;IDs into ChatGPT.
            Solus is the version they're allowed to use."
          </p>

          <div className="flex flex-col gap-2.5 mt-7 w-full text-left">
            {FEATURES.map(({ Icon, text }) => (
              <div key={text} className="flex items-start gap-2.5 rounded-md px-3 py-2" style={{ background: "#F2EFE710" }}>
                <Icon size={14} className="mt-0.5 shrink-0" style={{ color: "#C8DFDB" }} />
                <span className="text-xs leading-relaxed" style={{ color: "#E6EEEA" }}>{text}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-6 text-[11px]" style={{ color: "#C8DFDB", fontFamily: "var(--font-mono)" }}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="pulse-dot absolute inline-flex h-full w-full rounded-full" style={{ background: "#C8DFDB" }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "#C8DFDB" }} />
            </span>
            0 outbound connections · always
          </div>
        </div>
      </div>
    </div>
  );
}

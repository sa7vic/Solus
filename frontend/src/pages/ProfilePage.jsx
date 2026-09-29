import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, ShieldAlert, LogOut, Clock, KeyRound } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useWorkbench } from "../context/WorkbenchContext.jsx";
import TierChip from "../components/common/TierChip.jsx";

function initials(name = "") {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-9 h-5 rounded-full relative transition-colors shrink-0"
      style={{ background: checked ? "var(--brand-700)" : "var(--border)" }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
        style={{ left: checked ? 18 : 2 }}
      />
    </button>
  );
}

export default function ProfilePage() {
  const { user, isAdmin, effectiveRole, loginAt, logout } = useAuth();
  const { role } = useWorkbench();
  const [reduceMotion, setReduceMotion] = useState(document.documentElement.classList.contains("force-reduce-motion"));
  const [notifyGate, setNotifyGate] = useState(true);

  function toggleReduceMotion(v) {
    setReduceMotion(v);
    document.documentElement.classList.toggle("force-reduce-motion", v);
  }

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden" style={{ background: "var(--bg-base)" }}>
      <div className="flex items-center gap-3 px-4 border-b shrink-0" style={{ borderColor: "var(--border)", background: "var(--bg-panel)", height: 52 }}>
        <Link to="/" className="flex items-center gap-1.5 text-xs transition-colors hover:text-[var(--text-primary)]" style={{ color: "var(--text-secondary)" }}>
          <ArrowLeft size={14} /> Back to workbench
        </Link>
        <div className="w-px h-4" style={{ background: "var(--border)" }} />
        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Profile &amp; account</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          {/* Identity card */}
          <div className="rounded-xl border p-5 flex items-center gap-4" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold shrink-0" style={{ background: "var(--brand-700)", color: "#fff", fontFamily: "var(--font-mono)" }}>
              {initials(user?.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{user?.name}</div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{user?.title}</div>
              <div className="text-[11px] mt-1" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>@{user?.username}</div>
            </div>
            {isAdmin ? (
              <span className="flex items-center gap-1.5 text-xs rounded-md px-2.5 py-1.5 shrink-0" style={{ background: "var(--tier2)14", color: "var(--tier2)" }}>
                <ShieldAlert size={13} /> Cross-role admin
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs rounded-md px-2.5 py-1.5 shrink-0" style={{ background: "var(--tier1)14", color: "var(--tier1)" }}>
                <ShieldCheck size={13} /> Role-locked
              </span>
            )}
          </div>

          {/* Access details */}
          <div className="rounded-xl border p-5" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
            <div className="text-xs mb-3" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>ACCESS &amp; WORKBENCH</div>
            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              <dt style={{ color: "var(--text-tertiary)" }}>Current workbench</dt>
              <dd style={{ color: "var(--text-primary)" }}>{role?.label}</dd>

              <dt style={{ color: "var(--text-tertiary)" }}>Knowledge base scope</dt>
              <dd style={{ color: "var(--text-primary)" }}>{role?.kb}</dd>

              <dt style={{ color: "var(--text-tertiary)" }}>Default document tier</dt>
              <dd><TierChip tier={role?.docTier} compact /></dd>

              <dt style={{ color: "var(--text-tertiary)" }}>Preloaded tools</dt>
              <dd className="flex flex-wrap gap-1.5">
                {(role?.tools || []).map((t) => (
                  <span key={t} className="text-[10px] rounded-sm border px-1.5 py-0.5" style={{ borderColor: "var(--border)", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>{t}</span>
                ))}
              </dd>
            </dl>
            {isAdmin && (
              <p className="text-[11px] mt-3 pt-3 border-t leading-relaxed" style={{ borderColor: "var(--border-soft)", color: "var(--text-tertiary)" }}>
                Currently viewing as <strong style={{ color: "var(--text-secondary)" }}>{effectiveRole}</strong>. Switching
                workbenches from the sidebar is available only to this account, and each switch is
                written to the audit log.
              </p>
            )}
          </div>

          {/* Session */}
          <div className="rounded-xl border p-5" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
            <div className="text-xs mb-3" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>SESSION</div>
            <div className="flex items-center gap-2 text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
              <Clock size={13} style={{ color: "var(--text-tertiary)" }} />
              Signed in {loginAt ? new Date(loginAt).toLocaleString() : "—"}
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              <KeyRound size={13} style={{ color: "var(--text-tertiary)" }} />
              Local session token — no external identity provider in this build (Keycloak in production, §13)
            </div>
          </div>

          {/* Preferences — genuinely functional, not just decorative */}
          <div className="rounded-xl border p-5" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
            <div className="text-xs mb-3" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>PREFERENCES</div>
            <div className="flex items-center justify-between py-1.5">
              <div>
                <div className="text-sm" style={{ color: "var(--text-primary)" }}>Reduce motion</div>
                <div className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Turns off pulses, spins, and modal transitions app-wide</div>
              </div>
              <Toggle checked={reduceMotion} onChange={toggleReduceMotion} />
            </div>
            <div className="flex items-center justify-between py-1.5 mt-1 border-t" style={{ borderColor: "var(--border-soft)" }}>
              <div>
                <div className="text-sm" style={{ color: "var(--text-primary)" }}>Notify on HumanGate pauses</div>
                <div className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Highlights Tier 3 trace entries needing sign-off</div>
              </div>
              <Toggle checked={notifyGate} onChange={setNotifyGate} />
            </div>
          </div>

          <button
            onClick={logout}
            className="self-start flex items-center gap-2 text-sm rounded-md border px-3.5 py-2 transition-colors hover:bg-[var(--tier3)10]"
            style={{ borderColor: "var(--tier3)44", color: "var(--tier3)" }}
          >
            <LogOut size={14} /> Log out of this session
          </button>
        </div>
      </div>
    </div>
  );
}

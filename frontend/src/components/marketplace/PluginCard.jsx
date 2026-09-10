import { Check, Plus, Lock } from "lucide-react";

export default function PluginCard({ plugin, allowed, onToggle }) {
  return (
    <div className="rounded-lg border p-4 flex flex-col gap-2" style={{ borderColor: "var(--border)", background: "var(--bg-panel)", opacity: allowed ? 1 : 0.55 }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{plugin.name}</span>
          {plugin.psu && (
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--brand-100)] text-[var(--brand-700)] uppercase">
              {plugin.psu}
            </span>
          )}
        </div>
        {plugin.installed ? (
          <span className="flex items-center gap-1 text-[11px] shrink-0 font-medium" style={{ color: "var(--ok)" }}><Check size={12} /> installed</span>
        ) : allowed ? (
          <button onClick={() => onToggle(plugin.id, true)} className="flex items-center gap-1 text-[11px] rounded-md px-2 py-1 transition-opacity hover:opacity-90 shrink-0" style={{ background: "var(--brand-700)", color: "#fff" }}>
            <Plus size={12} /> install
          </button>
        ) : (
          <span className="flex items-center gap-1 text-[11px] shrink-0" style={{ color: "var(--text-tertiary)" }}><Lock size={11} /> locked</span>
        )}
      </div>
      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{plugin.description}</p>
      <div className="flex flex-wrap gap-1.5 mt-1">
        {plugin.role_scope.map((r) => (
          <span key={r} className="text-[10px] rounded-sm border px-1.5 py-0.5" style={{ borderColor: "var(--border)", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{r}</span>
        ))}
        {plugin.permissions.map((p) => (
          <span key={p} className="text-[10px] rounded-sm px-1.5 py-0.5" style={{ background: "var(--brand-200)44", color: "var(--brand-700)", fontFamily: "var(--font-mono)" }}>{p}</span>
        ))}
      </div>
      {plugin.installed && (
        <button onClick={() => onToggle(plugin.id, false)} className="self-start text-[10px] underline decoration-dotted mt-1" style={{ color: "var(--tier3)" }}>
          uninstall
        </button>
      )}
    </div>
  );
}

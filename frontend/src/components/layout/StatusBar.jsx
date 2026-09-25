import { Cpu, ShieldCheck, History, Download } from "lucide-react";
import { useWorkbench } from "../../context/WorkbenchContext.jsx";

export default function StatusBar({ onOpenAudit, onOpenModels }) {
  const { models, audit } = useWorkbench();
  const missing = models.filter((m) => !m.installed).length;

  return (
    <div className="h-7 shrink-0 flex items-center justify-between px-4 border-t text-[11px]" style={{ borderColor: "var(--border)", background: "var(--bg-panel)", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
      <button onClick={onOpenModels} className="flex items-center gap-3">
        <span className="flex items-center gap-1.5"><Cpu size={11} /></span>
        {models.map((m) => {
          const state = !m.installed ? "UNINSTALLED" : m.resident === "always" ? "RESIDENT" : m._progress != null && m._progress < 100 ? "LOADING" : "RESIDENT";
          const color = !m.installed ? "var(--tier3)" : m.resident === "always" ? "var(--brand-500)" : "var(--brand-700)";
          return (
            <span key={m.name} className="flex items-center gap-1 mr-2.5" title={`${m.tag} · ${m.vram} · ${state}`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
              <span style={{ color: m.installed ? "var(--text-secondary)" : "var(--tier3)" }}>{m.name}</span>
            </span>
          );
        })}
        {missing > 0 && (
          <span className="flex items-center gap-1" style={{ color: "var(--tier3)" }}>
            <Download size={11} /> {missing} not installed
          </span>
        )}
      </button>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1"><ShieldCheck size={11} /> immudb: verified</span>
        <button onClick={onOpenAudit} className="flex items-center gap-1 hover:underline">
          <History size={11} /> {audit.length} audit entries
        </button>
      </div>
    </div>
  );
}

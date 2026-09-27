import { useEffect, useRef, useState } from "react";
import { X, Cpu, Download, CheckCircle2, Loader2 } from "lucide-react";
import { useWorkbench } from "../../context/WorkbenchContext.jsx";
import { api } from "../../lib/api.js";

export default function ModelManagerModal({ onClose }) {
  const { models, refreshModels } = useWorkbench();
  const [progressByName, setProgressByName] = useState({});
  const pollers = useRef({});

  useEffect(() => {
    refreshModels(); // resync in case a download finished while this was closed
  }, [refreshModels]);

  useEffect(() => () => Object.values(pollers.current).forEach(clearInterval), []);

  async function download(name) {
    await api.startDownload(name);
    setProgressByName((p) => ({ ...p, [name]: 1 }));
    pollers.current[name] = setInterval(async () => {
      const status = await api.modelStatus(name);
      if (!status) return;
      setProgressByName((p) => ({ ...p, [name]: status.progress }));
      if (status.installed) {
        clearInterval(pollers.current[name]);
        refreshModels();
      }
    }, 500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "#1F2E3Dcc" }} onClick={onClose}>
      <div className="modal-in w-full max-w-lg rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <Cpu size={15} style={{ color: "var(--brand-700)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Model registry &amp; downloads</span>
          </div>
          <button onClick={onClose} aria-label="Close"><X size={15} style={{ color: "var(--text-tertiary)" }} /></button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Config-only registry (blueprint §7.1) — new open-weight models are added here, not
            by changing orchestrator code. Downloads run locally; nothing leaves the network.
          </p>
          {models.map((m) => {
            const pct = progressByName[m.name];
            const downloading = pct != null && pct < 100 && !m.installed;
            return (
              <div key={m.name} className="rounded-md border p-3" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm" style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{m.name}</div>
                    <div className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{m.tag} · {m.vram} · {(m.tags || []).join(", ")}</div>
                  </div>
                  {m.installed ? (
                    <span className="flex items-center gap-1 text-xs" style={{ color: "var(--ok)" }}>
                      <CheckCircle2 size={13} /> installed
                    </span>
                  ) : downloading ? (
                    <span className="flex items-center gap-1 text-xs" style={{ color: "var(--brand-700)" }}>
                      <Loader2 size={13} className="animate-spin" /> {pct}%
                    </span>
                  ) : (
                    <button onClick={() => download(m.name)} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-opacity hover:opacity-90" style={{ background: "var(--brand-700)", color: "#fff" }}>
                      <Download size={12} /> Download
                    </button>
                  )}
                </div>
                {downloading && (
                  <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border-soft)" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--brand-700)", transition: "width 0.3s" }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

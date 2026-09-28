import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Store, Cpu } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useWorkbench } from "../context/WorkbenchContext.jsx";
import { api } from "../lib/api.js";
import PluginCard from "../components/marketplace/PluginCard.jsx";
import ModelRegistryPanel from "../components/marketplace/ModelRegistryPanel.jsx";

export default function MarketplacePage() {
  const { effectiveRole, isAdmin, user } = useAuth();
  const { plugins, refreshPlugins } = useWorkbench();
  const [tab, setTab] = useState("plugins");

  async function onToggle(id, installed) {
    await api.togglePlugin(id, installed);
    refreshPlugins();
  }

  const currentRole = effectiveRole || user?.role || "inspection";

  return (
    <div className="h-full w-full flex flex-col overflow-hidden" style={{ background: "var(--bg-base)" }}>
      <div className="flex items-center justify-between px-6 border-b shrink-0 bg-[var(--bg-panel)]" style={{ borderColor: "var(--border)", height: 56 }}>
        <div className="flex items-center gap-3">
          <Store size={18} className="text-[var(--brand-700)]" />
          <h1 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>PSU Tool Marketplace</h1>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[var(--brand-100)] text-[var(--brand-700)] uppercase">
            Active Role: {currentRole}
          </span>
        </div>

        <div className="flex gap-1">
          {[
            { id: "plugins", label: "Plugins & Tools", Icon: Store },
            { id: "models", label: "Model Registry", Icon: Cpu },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={{ background: tab === t.id ? "var(--brand-100)" : "transparent", color: tab === t.id ? "var(--brand-700)" : "var(--text-secondary)" }}
            >
              <t.Icon size={14} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {tab === "plugins" ? (
            <>
              <p className="text-xs mb-5" style={{ color: "var(--text-tertiary)" }}>
                Air-gapped tool registry (§10.1) — installing here is a config entry, not an orchestrator
                change. Plugins outside your current role's scope are shown but locked; ask an admin to widen scope.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {plugins.map((p) => (
                  <PluginCard key={p.id} plugin={p} allowed={isAdmin || user?.crossRole || p.role_scope.includes(currentRole)} onToggle={onToggle} />
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-xs mb-5" style={{ color: "var(--text-tertiary)" }}>
                Register a new open-weight model, pull it from Ollama, and choose which capability
                (drafting, verification, code, vision) it handles — this changes what the orchestrator
                actually calls on the next run. New models don't require any code changes here.
              </p>
              <ModelRegistryPanel />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

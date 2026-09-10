import { useEffect, useState } from "react";
import { Download, Check, Plus, ExternalLink, Loader2, Cpu, X } from "lucide-react";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
const CAPABILITIES = ["routing", "draft", "verify", "code", "vision"];

function authHeaders() {
  const token = localStorage.getItem("solus.token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Real model management: add a model to the registry, pull it via a real
// `ollama pull` (streamed), or point to Ollama's library if you'd rather
// pull it yourself — and reassign which model handles a capability, which
// genuinely changes what the orchestrator calls on the next run.
export default function ModelRegistryPanel() {
  const [registry, setRegistry] = useState({ models: [], assignments: {} });
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ displayName: "", tag: "", capabilities: [] });
  const [pulling, setPulling] = useState({}); // tag -> progress 0-100
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/models/registry`, { headers: authHeaders() });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      setRegistry(await res.json());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addModel() {
    if (!form.displayName.trim() || !form.tag.trim() || form.capabilities.length === 0) return;
    const name = form.tag.split(":")[0].replace(/[^a-z0-9-]/gi, "-").toLowerCase() + "-" + Date.now().toString(36).slice(-4);
    try {
      const res = await fetch(`${BASE}/models/registry`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name, displayName: form.displayName, tag: form.tag, capabilities: form.capabilities }),
      });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      setForm({ displayName: "", tag: "", capabilities: [] });
      setAdding(false);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeModel(name) {
    await fetch(`${BASE}/models/registry/${name}`, { method: "DELETE", headers: authHeaders() });
    await load();
  }

  async function useModel(name, capability) {
    try {
      const res = await fetch(`${BASE}/models/registry/${name}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ capability }),
      });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function pullModel(tag) {
    setPulling((p) => ({ ...p, [tag]: 1 }));
    const token = localStorage.getItem("solus.token");
    fetch(`${BASE}/models/registry-pull/${encodeURIComponent(tag)}`, { method: "POST", headers: authHeaders() })
      .then(async (res) => {
        if (!res.body) throw new Error("No response stream.");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let idx;
          while ((idx = buf.indexOf("\n\n")) !== -1) {
            const chunk = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            const line = chunk.replace(/^data:\s*/, "");
            try {
              const evt = JSON.parse(line);
              if (evt.error) {
                setError(`Pull failed for ${tag}: ${evt.error}`);
                setPulling((p) => { const n = { ...p }; delete n[tag]; return n; });
              } else if (evt.total) {
                const pct = Math.round((evt.completed / evt.total) * 100);
                setPulling((p) => ({ ...p, [tag]: pct }));
              }
            } catch { /* ignore partial/non-JSON line */ }
          }
        }
        setPulling((p) => { const n = { ...p }; delete n[tag]; return n; });
        await load();
      })
      .catch((err) => {
        setError(err.message);
        setPulling((p) => { const n = { ...p }; delete n[tag]; return n; });
      });
    void token;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cpu size={15} style={{ color: "var(--brand-700)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Model registry</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="https://ollama.com/library" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs" style={{ color: "var(--brand-700)" }}>
            Browse Ollama's library <ExternalLink size={11} />
          </a>
          <button onClick={() => setAdding((v) => !v)} className="flex items-center gap-1.5 text-xs rounded-md px-2.5 py-1.5" style={{ background: "var(--brand-700)", color: "#fff" }}>
            <Plus size={12} /> Add model
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 flex items-center justify-between rounded-md px-3 py-2 text-xs" style={{ background: "var(--tier3)10", color: "var(--tier3)" }}>
          {error}
          <button onClick={() => setError(null)}><X size={12} /></button>
        </div>
      )}

      {adding && (
        <div className="mb-3 rounded-md border p-3" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              placeholder="Display name, e.g. Qwen3-8B"
              className="rounded-md border px-2 py-1.5 text-xs"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
            />
            <input
              value={form.tag}
              onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))}
              placeholder="Ollama tag, e.g. qwen3:8b"
              className="rounded-md border px-2 py-1.5 text-xs"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
            />
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {CAPABILITIES.map((c) => (
              <label key={c} className="flex items-center gap-1.5 text-xs rounded-md border px-2 py-1" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                <input
                  type="checkbox"
                  checked={form.capabilities.includes(c)}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      capabilities: e.target.checked ? [...f.capabilities, c] : f.capabilities.filter((x) => x !== c),
                    }))
                  }
                />
                {c}
              </label>
            ))}
          </div>
          <button onClick={addModel} className="text-xs rounded-md px-3 py-1.5" style={{ background: "var(--brand-700)", color: "#fff" }}>
            Register model
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-xs py-4" style={{ color: "var(--text-tertiary)" }}>
          <Loader2 size={13} className="animate-spin" /> Checking Ollama...
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {registry.models.map((m) => {
            const pct = pulling[m.tag];
            return (
              <div key={m.name} className="rounded-md border p-3" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>{m.displayName}</span>
                    <span className="ml-2 text-[11px]" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{m.tag}</span>
                  </div>
                  {m.installed === null ? (
                    <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Ollama unreachable</span>
                  ) : m.installed ? (
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--ok)" }}><Check size={12} /> installed</span>
                  ) : pct != null ? (
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--brand-700)" }}><Loader2 size={11} className="animate-spin" /> {pct}%</span>
                  ) : (
                    <button onClick={() => pullModel(m.tag)} className="flex items-center gap-1 text-[11px] rounded-md px-2 py-1" style={{ background: "var(--brand-700)", color: "#fff" }}>
                      <Download size={11} /> Pull
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {m.capabilities.map((c) => {
                    const active = registry.assignments[c] === m.name;
                    return (
                      <button
                        key={c}
                        onClick={() => !active && useModel(m.name, c)}
                        disabled={active}
                        className="text-[10px] rounded-sm px-1.5 py-0.5 border"
                        style={{
                          borderColor: active ? "var(--brand-700)" : "var(--border)",
                          background: active ? "var(--brand-700)" : "transparent",
                          color: active ? "#fff" : "var(--text-secondary)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {active ? `using for ${c}` : `use for ${c}`}
                      </button>
                    );
                  })}
                  <button onClick={() => removeModel(m.name)} className="text-[10px] ml-auto" style={{ color: "var(--tier3)" }}>
                    remove
                  </button>
                </div>
                {pct != null && (
                  <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "var(--border-soft)" }}>
                    <div className="h-full" style={{ width: `${pct}%`, background: "var(--brand-700)", transition: "width 0.3s" }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

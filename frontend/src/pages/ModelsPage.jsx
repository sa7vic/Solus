import { useEffect, useState } from "react";
import { Cpu, Download, CheckCircle, Plus, Trash2, Zap, RefreshCw, AlertCircle } from "lucide-react";
import { api } from "../lib/api.js";

const availableCaps = ["draft", "verify", "code", "vision", "routing"];

function OllamaModelCard({ model, onRegister, alreadyRegistered }) {
  const [registering, setRegistering] = useState(false);
  const handleRegister = async () => {
    setRegistering(true);
    await onRegister(model.tag);
    setRegistering(false);
  };
  return (
    <div className="p-3 rounded-xl border flex items-center justify-between gap-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
      <div className="min-w-0">
        <div className="font-mono text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{model.tag}</div>
        <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Installed · Auto-detected</div>
      </div>
      {alreadyRegistered ? (
        <div className="flex items-center gap-1 text-[var(--tier2)] text-xs shrink-0">
          <CheckCircle size={13} /> Registered
        </div>
      ) : (
        <button onClick={handleRegister} disabled={registering} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg shrink-0 disabled:opacity-50" style={{ background: 'var(--brand-700)', color: 'white' }}>
          <Plus size={12} /> {registering ? 'Adding...' : 'Add to Registry'}
        </button>
      )}
    </div>
  );
}

export default function ModelsPage() {
  const [registry, setRegistry] = useState({ models: [], assignments: {} });
  const [ollamaModels, setOllamaModels] = useState([]);
  const [ollamaLoading, setOllamaLoading] = useState(true);
  const [pulling, setPulling] = useState({});
  
  // Custom add form
  const [addName, setAddName] = useState("");
  const [addTag, setAddTag] = useState("");
  const [addCaps, setAddCaps] = useState([]);
  const [addSubmitting, setAddSubmitting] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setOllamaLoading(true);
    await Promise.all([fetchRegistry(), fetchOllamaModels()]);
    setOllamaLoading(false);
  };

  const fetchRegistry = async () => {
    try { const data = await api.modelRegistry(); setRegistry(data); } catch {}
  };

  const fetchOllamaModels = async () => {
    try { const data = await api.ollamaModels(); setOllamaModels(data?.models || []); } catch {}
  };

  const handleAutoRegister = async (tag) => {
    await api.autoRegisterModel(tag);
    await fetchRegistry();
  };

  const startPull = (tag) => {
    const token = localStorage.getItem('solus.token');
    const es = new EventSource(`/api/models/registry-pull/${encodeURIComponent(tag)}${token ? `?token=${encodeURIComponent(token)}` : ''}`);
    es.onmessage = (e) => { const d = JSON.parse(e.data); setPulling(prev => ({ ...prev, [tag]: d })); };
    es.addEventListener('done', () => { es.close(); setPulling(prev => { const n = {...prev}; delete n[tag]; return n; }); fetchAll(); });
    es.onerror = () => { es.close(); setPulling(prev => { const n = {...prev}; delete n[tag]; return n; }); };
  };

  const removeModel = async (name) => {
    if (!confirm(`Remove ${name} from registry?`)) return;
    await api.removeFromRegistry(name);
    fetchRegistry();
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddSubmitting(true);
    // Add to registry (will auto-pull if not installed)
    await api.addToRegistry({ name: addName || addTag.replace(':', '_'), tag: addTag, displayName: addName || addTag.split(':')[0], capabilities: addCaps.length ? addCaps : ['draft'] });
    // Then start pull
    startPull(addTag);
    setAddName(""); setAddTag(""); setAddCaps([]);
    setAddSubmitting(false);
    fetchRegistry();
  };

  const toggleCap = (cap) => setAddCaps(prev => prev.includes(cap) ? prev.filter(c => c !== cap) : [...prev, cap]);

  const setAssignment = async (name, cap) => {
    await api.setModelAssignment(name, cap);
    fetchRegistry();
  };

  const registeredTags = new Set(registry.models.map(m => m.tag));

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Models</h1>
        <button onClick={fetchAll} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-panel)' }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Ollama auto-detected */}
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Installed on this machine</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Auto-detected from Ollama. Click to add to registry.</p>
          </div>
          {ollamaLoading ? (
            <div className="text-xs text-[var(--text-tertiary)]" style={{ color: 'var(--text-tertiary)' }}>Checking Ollama...</div>
          ) : ollamaModels.length === 0 ? (
            <div className="p-4 rounded-xl border flex flex-col gap-3" style={{ borderColor: 'var(--brand-700)', background: 'var(--brand-100)' }}>
              <div className="flex items-center gap-2">
                <AlertCircle size={16} style={{ color: 'var(--brand-700)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--brand-700)' }}>Ollama is connected — no models pulled yet</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Ollama is running but has no models installed. Use the <strong>"Pull Custom Model"</strong> form on the right, or run this in a terminal:
              </p>
              <pre className="text-[11px] rounded-lg p-2 font-mono overflow-x-auto" style={{ background: 'var(--bg-panel)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
{`ollama pull qwen3:8b
# or any other model`}
              </pre>
              <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>After pulling, click Refresh to see models appear here.</p>
            </div>

          ) : (
            <div className="flex flex-col gap-2">
              {ollamaModels.map(m => (
                <OllamaModelCard key={m.tag} model={m} onRegister={handleAutoRegister} alreadyRegistered={registeredTags.has(m.tag)} />
              ))}
            </div>
          )}
        </div>

        {/* Center: Registry */}
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Registry</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Models available to the orchestrator.</p>
          </div>
          {registry.models.map(m => {
            const isPulling = pulling[m.tag];
            return (
              <div key={m.name} className="p-4 rounded-xl border flex flex-col gap-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{m.displayName || m.name}</div>
                  {m.installed ? (
                    <div className="flex items-center gap-1 text-[var(--tier2)] text-xs shrink-0"><CheckCircle size={12} /> Live</div>
                  ) : (
                    <button onClick={() => startPull(m.tag)} disabled={!!isPulling} className="text-xs px-2 py-1 rounded shrink-0 disabled:opacity-50" style={{ background: 'var(--brand-700)', color: 'white' }}>
                      {isPulling ? 'Pulling...' : <><Download size={10} className="inline mr-1" />Pull</>}
                    </button>
                  )}
                </div>
                <div className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{m.tag}</div>
                <div className="flex flex-wrap gap-1">
                  {m.capabilities.map(c => (
                    <span key={c} className="text-[9px] px-1.5 py-0.5 rounded-full border" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-panel-raised)' }}>{c}</span>
                  ))}
                </div>
                {isPulling && (
                  <div className="text-xs">
                    <div className="flex justify-between mb-1" style={{ color: 'var(--text-secondary)' }}>
                      <span>{isPulling.status}</span>
                      {isPulling.total && <span>{Math.round((isPulling.completed / isPulling.total) * 100)}%</span>}
                    </div>
                    {isPulling.total && <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(isPulling.completed / isPulling.total) * 100}%`, background: 'var(--brand-700)' }} />
                    </div>}
                  </div>
                )}
                <div className="pt-2 border-t flex items-center gap-2" style={{ borderColor: 'var(--border-soft)' }}>
                  <select className="flex-1 text-xs p-1 rounded border" style={{ borderColor: 'var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    onChange={e => { if (e.target.value) setAssignment(m.name, e.target.value); e.target.value = ''; }} defaultValue="">
                    <option value="">Assign capability...</option>
                    {availableCaps.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button onClick={() => removeModel(m.name)} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 size={13} /></button>
                </div>
              </div>
            );
          })}
          {registry.models.length === 0 && <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No models in registry. Add one from the installed list or use the form.</div>}
        </div>

        {/* Right: Assignments + Add Custom */}
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Capability Assignments</h2>
            <div className="p-4 rounded-xl border flex flex-col gap-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
              {availableCaps.map(cap => (
                <div key={cap} className="flex justify-between items-center text-xs py-1 border-b last:border-0" style={{ borderColor: 'var(--border-soft)' }}>
                  <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{cap}</span>
                  <span className="font-mono text-xs" style={{ color: registry.assignments[cap] ? 'var(--brand-700)' : 'var(--text-tertiary)' }}>
                    {registry.assignments[cap] || 'unassigned'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Pull Custom Model</h2>
            <form onSubmit={handleAddSubmit} className="p-4 rounded-xl border flex flex-col gap-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Display Name (optional)</label>
                <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="e.g. Qwen3 8B" className="w-full text-sm p-2 rounded border" style={{ borderColor: 'var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Ollama Tag *</label>
                <input required value={addTag} onChange={e => setAddTag(e.target.value)} placeholder="e.g. qwen3:8b" className="w-full text-sm p-2 rounded border" style={{ borderColor: 'var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Capabilities</label>
                <div className="flex flex-wrap gap-2">
                  {availableCaps.map(c => (
                    <label key={c} className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                      <input type="checkbox" checked={addCaps.includes(c)} onChange={() => toggleCap(c)} />
                      {c}
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={!addTag || addSubmitting} className="py-2 rounded text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: 'var(--brand-700)', color: 'white' }}>
                <Download size={14} /> {addSubmitting ? 'Pulling...' : 'Add & Pull Model'}
              </button>
              <p className="text-[10px] text-center" style={{ color: 'var(--text-tertiary)' }}>Will register in registry and start Ollama pull automatically.</p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

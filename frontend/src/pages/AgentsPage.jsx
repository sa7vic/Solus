import { useState, useEffect } from "react";
import { useRun } from "../context/RunContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { Link, useNavigate } from "react-router-dom";
import { Bot, Terminal as TerminalIcon, FileText, Code2, Calculator, Image as ImageIcon, MessageSquare, Download, Play, Upload, ShieldCheck } from "lucide-react";
import { api } from "../lib/api.js";

export default function AgentsPage() {
  const { runId, status, trace, result, error, agent: runningAgent, task: runningTask, startRun, clearRun } = useRun();
  const { user, effectiveRole, isAdmin } = useAuth();
  const navigate = useNavigate();

  const roleAgentMap = {
    it: ["code", "calc", "chat"],
    inspection: ["vision", "document", "chat"],
    process: ["calc", "vision", "document", "chat"],
    hse: ["document", "vision", "chat"],
    procurement: ["document", "calc", "chat"],
    board: ["document", "chat"],
    admin: ["document", "code", "calc", "vision", "chat"],
  };

  const currentRole = effectiveRole || user?.role || "inspection";
  const allowed = (isAdmin || user?.crossRole) ? ["document", "code", "calc", "vision", "chat"] : (roleAgentMap[currentRole] || ["document", "chat"]);

  const [activeTab, setActiveTab] = useState(allowed[0] || "document");

  useEffect(() => {
    if (!allowed.includes(activeTab)) {
      setActiveTab(allowed[0]);
    }
  }, [allowed, activeTab]);
  
  // Document state
  const [docTask, setDocTask] = useState("");
  const [docFormat, setDocFormat] = useState("docx");
  const [docRoles, setDocRoles] = useState([]);
  const [docSelRole, setDocSelRole] = useState("");
  const [docWorkspaces, setDocWorkspaces] = useState([]);
  const [docSelWs, setDocSelWs] = useState("");

  // Code state
  const [codeTask, setCodeTask] = useState("");
  const [codeFilename, setCodeFilename] = useState("");
  const [codeSource, setCodeSource] = useState("");
  const [codeTest, setCodeTest] = useState("");

  // Calc state
  const [calcTask, setCalcTask] = useState("");

  // Vision state
  const [visionFile, setVisionFile] = useState(null);

  useEffect(() => {
    api.roles().then(r => {
      const filtered = (isAdmin || user?.crossRole) ? r : r.filter(x => x.id === currentRole);
      setDocRoles(filtered);
      if (filtered.length > 0) setDocSelRole(filtered[0].id);
    });
  }, [currentRole, isAdmin, user]);

  useEffect(() => {
    if (docSelRole) {
      api.listWorkspaces(docSelRole).then(w => {
        setDocWorkspaces(w);
        if (w.length > 0) setDocSelWs(w[0].id);
        else setDocSelWs("");
      });
    }
  }, [docSelRole]);

  const handleRunDoc = () => {
    if (!docTask || !docSelRole || !docSelWs) return;
    startRun(`/run/generate-document/${docSelRole}/${docSelWs}`, { task: docTask, format: docFormat }, "Document Agent");
  };

  const handleRunCode = () => {
    if (!codeTask || !codeSource) return;
    startRun(`/run/fix-code`, { task: codeTask, sourceCode: codeSource, testCode: codeTest, filename: codeFilename }, "Code Agent");
  };

  const handleRunCalc = () => {
    if (!calcTask) return;
    startRun(`/run/calculate`, { task: calcTask }, "Calculation Agent");
  };

  const handleRunVision = () => {
    if (!visionFile) return;
    const fd = new FormData();
    fd.append("file", visionFile);
    startRun(`/run/vision-describe`, fd, "Vision Agent");
  };

  const allTabs = [
    { id: "document", label: "Document Agent", icon: FileText },
    { id: "code", label: "Code Agent", icon: Code2 },
    { id: "calc", label: "Calculation Agent", icon: Calculator },
    { id: "vision", label: "Vision Agent", icon: ImageIcon },
    { id: "chat", label: "General Chat", icon: MessageSquare }
  ];

  const agentTabs = allTabs.filter(t => allowed.includes(t.id));

  return (
    <div className="h-full flex" style={{ background: 'var(--bg-base)' }}>
      {/* Left Panel: Configuration */}
      <div className="w-[360px] shrink-0 border-r flex flex-col bg-[var(--bg-panel)]" style={{ borderColor: 'var(--border)' }}>
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Agent Tasks</h2>
            <p className="text-xs text-[var(--text-tertiary)]">Authorized agents for current role</p>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[var(--brand-100)] text-[var(--brand-700)] uppercase">
            {currentRole}
          </span>
        </div>
        
        <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex w-full overflow-x-auto hide-scrollbar">
            {agentTabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-2 text-xs border-b-2 transition-colors shrink-0 ${activeTab === t.id ? 'text-[var(--text-primary)] border-[var(--brand-700)]' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel-raised)]'}`}
              >
                <t.icon size={16} />
                <span className="truncate w-full text-center">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
          {activeTab === "document" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Role Workspace</label>
                <select value={docSelRole} onChange={e=>setDocSelRole(e.target.value)} className="p-2 text-sm rounded border bg-[var(--bg-base)]" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                  {docRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <select value={docSelWs} onChange={e=>setDocSelWs(e.target.value)} className="p-2 text-sm rounded border bg-[var(--bg-base)] mt-1" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                  {docWorkspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Task</label>
                <textarea rows={4} value={docTask} onChange={e=>setDocTask(e.target.value)} placeholder="e.g. Generate a project proposal for the new pipeline based on recent discussions..." className="p-2 text-sm rounded border bg-[var(--bg-base)] resize-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Format</label>
                <div className="flex gap-2">
                  <button onClick={()=>setDocFormat('docx')} className={`flex-1 py-1.5 text-xs rounded border ${docFormat === 'docx' ? 'bg-[var(--brand-100)] border-[var(--brand-700)] text-[var(--brand-700)]' : 'bg-[var(--bg-base)] border-[var(--border)] text-[var(--text-secondary)]'}`}>DOCX</button>
                  <button onClick={()=>setDocFormat('pptx')} className={`flex-1 py-1.5 text-xs rounded border ${docFormat === 'pptx' ? 'bg-[var(--brand-100)] border-[var(--brand-700)] text-[var(--brand-700)]' : 'bg-[var(--bg-base)] border-[var(--border)] text-[var(--text-secondary)]'}`}>PPTX</button>
                </div>
              </div>
              <button onClick={handleRunDoc} disabled={status === 'running' || !docTask || !docSelWs} className="mt-auto flex justify-center items-center gap-2 w-full py-2.5 rounded-lg bg-[var(--brand-700)] text-white font-medium disabled:opacity-50">
                <Play size={14} /> Run Document Agent
              </button>
            </>
          )}

          {activeTab === "code" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Task Description</label>
                <textarea rows={3} value={codeTask} onChange={e=>setCodeTask(e.target.value)} placeholder="e.g. Refactor this sorting function to handle edge cases" className="p-2 text-sm rounded border bg-[var(--bg-base)] resize-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Filename (optional)</label>
                <input value={codeFilename} onChange={e=>setCodeFilename(e.target.value)} placeholder="e.g. utils.py" className="p-2 text-sm rounded border bg-[var(--bg-base)]" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Source Code</label>
                <textarea value={codeSource} onChange={e=>setCodeSource(e.target.value)} className="flex-1 p-2 text-xs font-mono rounded border bg-[var(--bg-base)] resize-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', minHeight: '150px' }} />
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Test Code (optional)</label>
                <textarea value={codeTest} onChange={e=>setCodeTest(e.target.value)} className="flex-1 p-2 text-xs font-mono rounded border bg-[var(--bg-base)] resize-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', minHeight: '100px' }} />
              </div>
              <button onClick={handleRunCode} disabled={status === 'running' || !codeTask || !codeSource} className="mt-2 flex justify-center items-center gap-2 w-full py-2.5 rounded-lg bg-[var(--brand-700)] text-white font-medium disabled:opacity-50">
                <Play size={14} /> Run Code Agent
              </button>
            </>
          )}

          {activeTab === "calc" && (
            <>
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Calculation Request</label>
                <textarea value={calcTask} onChange={e=>setCalcTask(e.target.value)} placeholder="Enter a complex calculation request or data transformation rule..." className="flex-1 p-2 text-sm rounded border bg-[var(--bg-base)] resize-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', minHeight: '200px' }} />
              </div>
              <button onClick={handleRunCalc} disabled={status === 'running' || !calcTask} className="mt-auto flex justify-center items-center gap-2 w-full py-2.5 rounded-lg bg-[var(--brand-700)] text-white font-medium disabled:opacity-50">
                <Play size={14} /> Run Calculation Agent
              </button>
            </>
          )}

          {activeTab === "vision" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Upload Image</label>
                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 bg-[var(--bg-base)] text-center cursor-pointer hover:bg-[var(--bg-panel-raised)] transition-colors" style={{ borderColor: 'var(--border)' }} onClick={() => document.getElementById('vision-upload').click()}>
                  <Upload size={24} style={{ color: 'var(--brand-500)' }} />
                  <div className="text-sm text-[var(--text-primary)] font-medium">Click to select file</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{visionFile ? visionFile.name : 'PNG, JPG up to 10MB'}</div>
                  <input id="vision-upload" type="file" className="hidden" accept="image/*" onChange={(e) => setVisionFile(e.target.files[0])} />
                </div>
              </div>
              <button onClick={handleRunVision} disabled={status === 'running' || !visionFile} className="mt-auto flex justify-center items-center gap-2 w-full py-2.5 rounded-lg bg-[var(--brand-700)] text-white font-medium disabled:opacity-50">
                <Play size={14} /> Analyze with Vision
              </button>
            </>
          )}

          {activeTab === "chat" && (
            <div className="flex flex-col items-center justify-center flex-1 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[var(--brand-100)] flex items-center justify-center">
                <MessageSquare size={24} style={{ color: 'var(--brand-700)' }} />
              </div>
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">General Chat</div>
                <div className="text-xs text-[var(--text-secondary)] mt-1 px-4">For open-ended conversation, use the Chat interface instead of a specific agent task.</div>
              </div>
              <button onClick={() => navigate('/chat')} className="px-4 py-2 mt-2 rounded border bg-[var(--bg-panel-raised)] text-sm font-medium hover:bg-[var(--bg-base)]">
                Go to Chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Live Trace & Result */}
      <div className="flex-1 flex flex-col h-full bg-[var(--bg-base)] relative">
        <div className="p-4 border-b flex items-center justify-between bg-[var(--bg-panel)]" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Live Trace & Results</h2>
            {status !== 'idle' && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full" style={{ background: status === 'running' || status === 'starting' ? 'var(--brand-100)' : status === 'error' ? 'var(--tier3)20' : 'var(--tier2)20', color: status === 'running' || status === 'starting' ? 'var(--brand-700)' : status === 'error' ? 'var(--tier3)' : 'var(--tier2)' }}>
                {status}
              </span>
            )}
          </div>
          {status !== 'idle' && status !== 'running' && status !== 'starting' && (
            <button onClick={clearRun} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Clear</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {status === 'idle' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-tertiary)] gap-4">
              <TerminalIcon size={48} opacity={0.2} />
              <p className="text-sm">Configure a task on the left and run it to see live trace.</p>
            </div>
          ) : (
            <>
              {/* Context Summary */}
              <div className="p-4 rounded-lg border bg-[var(--bg-panel)] flex flex-col gap-1" style={{ borderColor: 'var(--border)' }}>
                <div className="text-xs font-bold text-[var(--text-secondary)] uppercase">{runningAgent} Task</div>
                <div className="text-sm text-[var(--text-primary)] font-medium">{runningTask || 'Run task'}</div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-4 rounded-lg border bg-[var(--tier3)10] text-[var(--tier3)] text-xs font-mono whitespace-pre-wrap" style={{ borderColor: 'var(--tier3)30' }}>
                  ERROR: {error}
                </div>
              )}

              {/* Result */}
              {result && (
                <div className="p-5 rounded-lg border bg-[var(--bg-panel)] shadow-sm" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="text-sm font-bold text-[var(--brand-700)] mb-3">Final Result</h3>
                  {result.filename ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <FileText size={24} style={{ color: 'var(--text-primary)' }} />
                        <span className="font-medium text-[var(--text-primary)]">{result.filename}</span>
                      </div>
                      <a href={`/api/run/download/${result.role}/${result.workspaceId}/${result.filename}`} className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--brand-700)] text-white text-sm font-medium rounded-md w-max hover:opacity-90">
                        <Download size={16} /> Download
                      </a>
                    </div>
                  ) : result.patched ? (
                    <div className="flex flex-col gap-3">
                      <div className="text-sm font-medium text-green-600">Patched successfully!</div>
                      <pre className="p-3 bg-[var(--bg-base)] rounded border text-xs font-mono overflow-auto" style={{ borderColor: 'var(--border)' }}>
                        {result.patched}
                      </pre>
                    </div>
                  ) : (
                    <pre className="text-xs whitespace-pre-wrap font-mono" style={{ color: 'var(--text-primary)' }}>
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  )}
                </div>
              )}

              {/* Trace */}
              <div className="flex flex-col gap-1">
                <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Execution Log</h3>
                <div className="flex flex-col gap-4">
                  {trace.map((t, i) => (
                    <div key={i} className="flex gap-3 relative">
                      {i !== trace.length - 1 && <div className="absolute left-[11px] top-6 bottom-0 w-px" style={{ background: "var(--border-soft)" }} />}
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 bg-[var(--bg-panel-raised)]" style={{ border: `1px solid ${t.flag ? "var(--tier2)" : "var(--border)"}` }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-500)]" />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{t.agent}</span>
                          <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{new Date(t.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs leading-relaxed font-mono whitespace-pre-wrap p-2 rounded bg-[var(--bg-panel-raised)]" style={{ color: t.flag ? "var(--tier2)" : "var(--text-secondary)" }}>
                          {t.text}
                        </p>
                      </div>
                    </div>
                  ))}
                  {status === 'running' && (
                    <div className="flex gap-3 items-center">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 border bg-[var(--bg-panel-raised)] border-dashed" style={{ borderColor: 'var(--brand-500)' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-500)] animate-pulse" />
                      </div>
                      <span className="text-xs text-[var(--text-tertiary)] animate-pulse font-mono">Agent is working...</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

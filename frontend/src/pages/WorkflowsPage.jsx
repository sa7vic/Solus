import { useState, useEffect, useCallback } from "react";
import { 
  ReactFlow,
  Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState,
  MarkerType
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GitBranch, Play, Plus, Trash2, CheckCircle2, Loader2, ClipboardCheck, Code2, Mail, X, ChevronRight, Download, Send, Copy, Check, FileText, ExternalLink, Settings, AlertCircle } from "lucide-react";
import { api } from "../lib/api.js";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

// Node color map
const nodeColors = {
  input: '#10b981',
  agent: '#6366f1',
  approval: '#f59e0b',
  output: '#3b82f6',
};

const nodeTypeLabels = {
  input: 'INPUT',
  agent: 'AGENT',
  approval: 'APPROVAL',
  output: 'OUTPUT',
};

// Workflow icon map
const wfIcons = { ClipboardCheck, Code2, Mail, GitBranch };

// Custom node — text always visible, no emoji
function WorkflowNode({ data }) {
  const bg = data.color || '#6366f1';
  return (
    <div style={{
      background: bg, borderRadius: '10px', padding: '10px 14px',
      minWidth: '164px', border: `2px solid ${bg}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    }}>
      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em',
        color: 'rgba(255,255,255,0.75)', background: 'rgba(0,0,0,0.18)',
        display: 'inline-block', padding: '1px 5px', borderRadius: '4px', marginBottom: '4px' }}>
        {data.typeLabel}
      </div>
      <div style={{ fontWeight: 700, fontSize: '13px', color: '#ffffff', lineHeight: 1.2 }}>{data.label}</div>
      {data.description && (
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.82)', marginTop: '4px', lineHeight: 1.3 }}>
          {data.description}
        </div>
      )}
    </div>
  );
}

const nodeTypes = { workflowNode: WorkflowNode };

function WorkflowCard({ wf, isSelected, onSelect, onRun, onDelete, running }) {
  const Icon = wfIcons[wf.icon] || GitBranch;
  return (
    <div
      onClick={() => onSelect(wf)}
      className={`p-4 rounded-xl border cursor-pointer transition-all ${
        isSelected ? 'border-[var(--brand-700)] bg-[var(--brand-100)]' : 'border-[var(--border)] bg-[var(--bg-panel)] hover:border-[var(--brand-700)]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: isSelected ? 'var(--brand-700)' : 'var(--bg-panel-raised)' }}>
          <Icon size={18} style={{ color: isSelected ? 'white' : 'var(--brand-700)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{wf.name}</div>
          <div className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>{wf.description}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] px-2 py-0.5 rounded-full border" style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>{wf.nodes?.length || 0} nodes</span>
        <div className="flex gap-2">
          {!wf.id.startsWith('wf_inspection') && !wf.id.startsWith('wf_code') && !wf.id.startsWith('wf_email') && (
            <button onClick={e => { e.stopPropagation(); onDelete(wf.id); }} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={13} /></button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onRun(wf); }}
            disabled={running === wf.id}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
            style={{ background: 'var(--brand-700)', color: 'white' }}
          >
            {running === wf.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            {running === wf.id ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>
    </div>
  );
}

function buildFlowFromWorkflow(wf) {
  if (!wf) return { nodes: [], edges: [] };

  // Build edge order map for vertical cascade layout
  const edgeMap = {};
  (wf.edges || []).forEach(e => { edgeMap[e.source] = e.target; });

  const posMap = {};
  let current = (wf.nodes[0] || {}).id;
  let y = 40;
  while (current) {
    posMap[current] = { x: 160, y };
    y += 130;
    current = edgeMap[current];
  }

  const nodes = (wf.nodes || []).map((n) => ({
    id: n.id,
    type: 'workflowNode',
    position: posMap[n.id] || { x: 160, y: 40 },
    data: {
      label: n.label,
      description: n.data?.description || '',
      color: nodeColors[n.type] || '#6366f1',
      typeLabel: nodeTypeLabels[n.type] || n.type?.toUpperCase() || 'NODE',
    },
  }));

  const edges = (wf.edges || []).map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
    style: { stroke: '#6366f1', strokeWidth: 2 }
  }));

  return { nodes, edges };
}


export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState([]);
  const [selectedWf, setSelectedWf] = useState(null);
  const [running, setRunning] = useState(null);
  const [runInput, setRunInput] = useState("");
  const [runId, setRunId] = useState(null);
  const [runTrace, setRunTrace] = useState([]);
  const [runStatus, setRunStatus] = useState(null);
  const [runResult, setRunResult] = useState(null);
  
  // Editable email state
  const [emailTo, setEmailTo] = useState("");
  const [emailFrom, setEmailFrom] = useState(() => localStorage.getItem("solus.gmail.user") || "");
  const [emailPass, setEmailPass] = useState(() => localStorage.getItem("solus.gmail.pass") || "");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [showSmtpConfig, setShowSmtpConfig] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState(null);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState(null);
  const [copied, setCopied] = useState(false);

  const [showRunModal, setShowRunModal] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => { api.workflows().then(setWorkflows); }, []);

  useEffect(() => {
    if (selectedWf) {
      const { nodes: n, edges: e } = buildFlowFromWorkflow(selectedWf);
      setNodes(n);
      setEdges(e);
    }
  }, [selectedWf]);

  // Sync drafted email when result arrives
  useEffect(() => {
    if (runResult?.email) {
      setEmailTo(runResult.email.to || "");
      setEmailSubject(runResult.email.subject || "");
      setEmailBody(runResult.email.body || "");
      setEmailError(null);
      setEmailSuccessMsg(null);
      setEmailSent(false);
    }
  }, [runResult]);

  useEffect(() => {
    if (!runId) return;
    setRunTrace([]);
    setRunStatus('running');
    setRunResult(null);
    setEmailSent(false);
    setEmailError(null);
    setEmailSuccessMsg(null);
    const token = localStorage.getItem('solus.token');
    const es = new EventSource(`${BASE}/run/${runId}/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`);
    es.onmessage = e => { try { setRunTrace(prev => [...prev, JSON.parse(e.data)]); } catch {} };
    es.addEventListener('done', e => {
      try {
        const payload = JSON.parse(e.data);
        setRunStatus(payload.status || 'done');
        if (payload.result) setRunResult(payload.result);
      } catch {
        setRunStatus('done');
      }
      es.close();
    });
    es.onerror = () => { setRunStatus('error'); es.close(); };
    return () => es.close();
  }, [runId]);

  const handleDownload = async (url, filename) => {
    try {
      const token = localStorage.getItem('solus.token');
      const cleanUrl = url.startsWith('/api') ? url.slice(4) : url;
      const res = await fetch(`${BASE}${cleanUrl}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const u = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = u;
      a.download = filename || "deliverable.docx";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error(e);
      alert("Could not download: " + e.message);
    }
  };

  const handleSendEmail = async () => {
    if (!emailTo.trim()) {
      setEmailError("Please enter a valid recipient email in 'To'");
      return;
    }
    setEmailSending(true);
    setEmailError(null);
    setEmailSuccessMsg(null);

    // Persist sender info locally for quick reuse
    if (emailFrom) localStorage.setItem("solus.gmail.user", emailFrom.trim());
    if (emailPass) localStorage.setItem("solus.gmail.pass", emailPass.trim());

    try {
      const res = await api.sendWorkflowEmail({
        to: emailTo.trim(),
        subject: emailSubject,
        body: emailBody,
        from_email: emailFrom.trim() || undefined,
        app_password: emailPass.trim() || undefined,
        run_id: runId
      });

      if (res?.error || res?.ok === false || res?.detail) {
        throw new Error(res?.detail || res?.error || "Email delivery failed");
      }

      setEmailSent(true);
      setEmailSuccessMsg(`✓ Dispatched to ${emailTo} via ${res.dispatchedVia || 'Relay'}`);
    } catch (e) {
      console.error(e);
      setEmailError(e.message);
    }
    setEmailSending(false);
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(`To: ${emailTo}\nSubject: ${emailSubject}\n\n${emailBody}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRun = (wf) => {
    setSelectedWf(wf);
    setShowRunModal(true);
    setRunId(null);
    setRunTrace([]);
    setRunStatus(null);
    setRunResult(null);
    setEmailSent(false);
    setEmailError(null);
    setEmailSuccessMsg(null);
  };

  const startRun = async () => {
    if (!selectedWf) return;
    setRunning(selectedWf.id);
    try {
      const result = await api.runWorkflow(selectedWf.id, runInput || selectedWf.description);
      if (result?.runId) {
        setRunId(result.runId);
      }
    } catch (err) { console.error(err); }
    setRunning(null);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this workflow?")) return;
    await api.deleteWorkflow(id);
    if (selectedWf?.id === id) setSelectedWf(null);
    api.workflows().then(setWorkflows);
  };

  return (
    <div className="h-full flex" style={{ background: 'var(--bg-base)' }}>
      {/* Left: Workflow List */}
      <div className="w-72 border-r flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Workflows</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Visual node-graph automation</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {workflows.map(wf => (
            <WorkflowCard
              key={wf.id}
              wf={wf}
              isSelected={selectedWf?.id === wf.id}
              onSelect={setSelectedWf}
              onRun={handleRun}
              onDelete={handleDelete}
              running={running}
            />
          ))}
          {workflows.length === 0 && <div className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>No workflows yet.</div>}
        </div>
      </div>

      {/* Center: React Flow canvas */}
      <div className="flex-1 relative">
        {selectedWf ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.3}
          >
            <Background color="var(--border)" gap={20} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4" style={{ color: 'var(--text-tertiary)' }}>
            <GitBranch size={48} opacity={0.15} />
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Select a workflow to visualize</p>
              <p className="text-xs mt-1">Node-graph view will appear here</p>
            </div>
          </div>
        )}
      </div>

      {/* Right: Trace / Run Panel & Deliverables */}
      <div className="w-84 border-l flex flex-col" style={{ width: '360px', borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Execution & Results</span>
          {runStatus && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
              runStatus === 'done' || runStatus === 'completed' ? 'bg-green-100 text-green-700' :
              runStatus === 'error' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {runStatus}
            </span>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          {/* DELIVERABLE: EMAIL CARD WITH INLINE EDITOR & GMAIL SMTP */}
          {runResult?.email && (
            <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/60 flex flex-col gap-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                  <Mail size={14} />
                  <span>Interactive Email Editor</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSmtpConfig(prev => !prev)}
                  className="text-[10px] flex items-center gap-1 text-indigo-700 hover:text-indigo-900 font-medium px-2 py-0.5 rounded bg-indigo-100/70"
                  title="Configure Sender Gmail / SMTP"
                >
                  <Settings size={11} />
                  <span>{showSmtpConfig ? "Hide Sender" : "Sender Settings"}</span>
                </button>
              </div>

              {/* SENDER GMAIL SETTINGS (COLLAPSIBLE) */}
              {showSmtpConfig && (
                <div className="p-2.5 rounded-lg bg-white border border-indigo-200 text-[10px] flex flex-col gap-1.5">
                  <span className="font-semibold text-gray-700">From / Gmail Configuration:</span>
                  <div>
                    <label className="text-gray-500 block mb-0.5">Your Gmail Address (From):</label>
                    <input
                      type="email"
                      value={emailFrom}
                      onChange={e => setEmailFrom(e.target.value)}
                      placeholder="e.g. yourname@gmail.com"
                      className="w-full text-xs p-1.5 rounded border border-gray-300 outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 block mb-0.5">Google 16-character App Password:</label>
                    <input
                      type="password"
                      value={emailPass}
                      onChange={e => setEmailPass(e.target.value)}
                      placeholder="xxxx xxxx xxxx xxxx"
                      className="w-full text-xs p-1.5 rounded border border-gray-300 outline-none focus:border-indigo-500 font-mono"
                    />
                    <span className="text-[9px] text-gray-500 mt-0.5 block leading-tight">
                      Generate at <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-indigo-600 underline">myaccount.google.com/apppasswords</a>. If empty, Solus will simulate delivery via the air-gap relay.
                    </span>
                  </div>
                </div>
              )}
              
              {/* EDITABLE FIELDS */}
              <div className="text-[11px] bg-white p-2.5 rounded-lg border border-indigo-100 flex flex-col gap-2 shadow-xs">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">To (Recipient):</label>
                  <input
                    type="email"
                    value={emailTo}
                    onChange={e => setEmailTo(e.target.value)}
                    placeholder="recipient@example.com"
                    className="w-full text-xs p-1.5 rounded border border-gray-200 outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Subject:</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={e => setEmailSubject(e.target.value)}
                    placeholder="Subject line..."
                    className="w-full text-xs p-1.5 rounded border border-gray-200 outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Email Body (Editable):</label>
                  <textarea
                    value={emailBody}
                    onChange={e => setEmailBody(e.target.value)}
                    rows={6}
                    className="w-full text-[11px] p-2 rounded border border-gray-200 outline-none focus:border-indigo-500 font-sans leading-relaxed resize-y"
                  />
                </div>
              </div>

              {/* SUCCESS BANNER */}
              {emailSuccessMsg && (
                <div className="p-2 rounded-lg bg-green-50 border border-green-200 text-green-800 text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="shrink-0 text-green-600" />
                  <span className="truncate">{emailSuccessMsg}</span>
                </div>
              )}

              {/* ERROR BANNER */}
              {emailError && (
                <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[10px] flex flex-col gap-0.5 leading-tight">
                  <div className="flex items-center gap-1 font-semibold">
                    <AlertCircle size={12} className="shrink-0 text-red-600" />
                    <span>Failed to Send</span>
                  </div>
                  <span>{emailError}</span>
                </div>
              )}

              {/* ACTIONS */}
              <div className="flex items-center gap-2 mt-0.5">
                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={emailSending}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold text-white shadow-sm disabled:opacity-50 transition-colors"
                  style={{ background: emailFrom ? '#16a34a' : 'var(--brand-700)' }}
                  title={emailFrom ? "Send Real Email via Gmail" : "Dispatch Email"}
                >
                  {emailSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>{emailSending ? 'Sending...' : (emailFrom ? 'Send via Gmail' : 'Send Email')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="p-2 rounded-lg border bg-white hover:bg-gray-50 text-gray-700 transition-colors shadow-2xs"
                  title="Copy formatted email to clipboard"
                >
                  {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}


          {/* DELIVERABLE: DOCUMENT / FILE DOWNLOAD CARD */}
          {runResult?.filename && (
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col gap-2 shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <FileText size={14} />
                <span>Generated File Deliverable</span>
              </div>
              <div className="text-xs bg-white p-2.5 rounded-lg border border-emerald-100">
                <div className="font-semibold text-gray-900 truncate">{runResult.title || runResult.filename}</div>
                <div className="text-[10px] font-mono text-gray-500 mt-0.5">{runResult.filename}</div>
              </div>
              <button
                onClick={() => handleDownload(runResult.download_url || `/run/download/workflow/${selectedWf?.id}/${runResult.filename}`, runResult.filename)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 shadow-sm"
              >
                <Download size={13} />
                <span>Download {runResult.filename.endsWith('.pptx') ? 'Presentation (.pptx)' : 'Document (.docx)'}</span>
              </button>
            </div>
          )}

          {/* DELIVERABLE: CODE SANDBOX CARD */}
          {runResult?.patched && (
            <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/50 flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                <span className="flex items-center gap-1.5"><Code2 size={14} /> Sandbox Execution</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] ${runResult.passed ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                  {runResult.passed ? 'Tests Passed' : 'Tests Failed'}
                </span>
              </div>
              <div className="text-[10px] font-mono bg-white p-2 rounded border max-h-36 overflow-y-auto text-gray-800 whitespace-pre">
                {runResult.patched}
              </div>
              <div className="text-[10px] text-gray-600">
                {runResult.summary}
              </div>
            </div>
          )}

          {/* EXECUTION TRACE LOGS */}
          <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mt-1 px-1">
            Agent Activity Log
          </div>

          {runTrace.length === 0 && !runId && (
            <div className="flex flex-col items-center gap-2 pt-8" style={{ color: 'var(--text-tertiary)' }}>
              <Play size={24} opacity={0.2} />
              <p className="text-xs text-center">Run a workflow to see execution trace and outputs here.</p>
            </div>
          )}

          {runTrace.map((t, i) => (
            <div key={i} className="p-2.5 rounded-lg border text-xs" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-panel-raised)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-semibold" style={{ color: 'var(--brand-700)' }}>{t.agent}</span>
                {t.status && <span className="ml-auto text-[9px] px-1 py-0.5 rounded" style={{ background: 'var(--brand-100)', color: 'var(--brand-700)' }}>{t.status}</span>}
              </div>
              <div style={{ color: 'var(--text-secondary)' }} className="leading-relaxed">{t.text}</div>
            </div>
          ))}
        </div>
      </div>


      {/* Run Modal */}
      {showRunModal && selectedWf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 w-full max-w-md shadow-xl flex flex-col gap-4" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)' }}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Run: {selectedWf.name}</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{selectedWf.description}</p>
              </div>
              <button onClick={() => setShowRunModal(false)} style={{ color: 'var(--text-tertiary)' }}><X size={18} /></button>
            </div>
            <div>
              <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-secondary)' }}>Task / Input</label>
              <textarea
                value={runInput}
                onChange={e => setRunInput(e.target.value)}
                placeholder={`e.g. Analyze the uploaded inspection report and generate an approval note...`}
                className="w-full text-sm p-3 rounded-xl border outline-none resize-none"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', minHeight: '100px' }}
              />
            </div>
            <button
              onClick={() => { startRun(); setShowRunModal(false); }}
              className="py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: 'var(--brand-700)', color: 'white' }}
            >
              <Play size={16} /> Start Workflow
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

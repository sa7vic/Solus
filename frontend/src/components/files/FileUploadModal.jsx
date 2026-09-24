import { useRef, useState } from "react";
import { X, UploadCloud, Loader2, CheckCircle2, AlertTriangle, Eye, Radio } from "lucide-react";
import { api } from "../../lib/api.js";
import { useWorkbench } from "../../context/WorkbenchContext.jsx";
import TierChip from "../common/TierChip.jsx";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

export default function FileUploadModal({ onClose }) {
  const { role, workspace, refreshWorkspace } = useWorkbench();
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState(null); // { busy, result }
  const [lastFile, setLastFile] = useState(null);
  const inputRef = useRef(null);

  async function handleFiles(fileList) {
    const file = fileList?.[0];
    if (!file) return;
    setLastFile(file);
    setStatus({ busy: true });
    const result = await api.uploadFile(role.id, workspace.id, file);
    setStatus({ busy: false, result });
    refreshWorkspace();
  }

  const isImage = lastFile && lastFile.type.startsWith("image/");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "#1F2E3Dcc" }} onClick={onClose}>
      <div className="modal-in w-full max-w-md rounded-lg border p-5" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Upload to Uploads/</span>
          <button onClick={onClose} aria-label="Close"><X size={15} style={{ color: "var(--text-tertiary)" }} /></button>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className="rounded-md border-2 border-dashed flex flex-col items-center justify-center py-8 cursor-pointer text-center"
          style={{ borderColor: dragOver ? "var(--brand-700)" : "var(--border)", background: dragOver ? "var(--brand-200)22" : "var(--bg-panel-raised)" }}
        >
          <UploadCloud size={22} style={{ color: "var(--brand-700)" }} />
          <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>Drag a file here, or click to browse</p>
          <input ref={inputRef} type="file" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        </div>

        {status?.busy && (
          <div className="flex items-center gap-2 mt-3 text-xs" style={{ color: "var(--text-secondary)" }}>
            <Loader2 size={13} className="animate-spin" /> classifying sensitivity tier...
          </div>
        )}

        {status?.result && (
          <div className="mt-3 rounded-md border p-3 text-xs" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-1">
              <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{status.result.file}</span>
              <TierChip tier={status.result.tier} />
            </div>
            <div className="flex items-start gap-1.5" style={{ color: status.result.status === "pending_review" ? "var(--tier2)" : "var(--ok)" }}>
              {status.result.status === "pending_review" ? <AlertTriangle size={12} className="mt-0.5" /> : <CheckCircle2 size={12} className="mt-0.5" />}
              <span>{status.result.reason}</span>
            </div>
          </div>
        )}

        {isImage && status?.result && (
          <div className="mt-3">
            <VisionButton file={lastFile} />
          </div>
        )}

        <p className="text-[10px] mt-3" style={{ color: "var(--text-tertiary)" }}>
          Ingestion-time classifier (§4.2) — Tier 3 is never auto-assigned; ambiguous files queue
          as "pending review" for a human to confirm.
        </p>
      </div>
    </div>
  );
}

// Separate component so useAgentRun's SSE lifecycle is scoped cleanly to a
// real multipart upload (the shared hook assumes a JSON POST body, which a
// file upload isn't — this does the same start+stream pattern by hand).
function VisionButton({ file }) {
  const [state, setState] = useState({ status: "idle", trace: [], result: null, error: null });

  async function run() {
    setState({ status: "running", trace: [], result: null, error: null });
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "photograph");
      const token = localStorage.getItem("solus.token");
      const res = await fetch(`${BASE}/run/vision-describe`, {
        method: "POST",
        body: form,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Backend returned ${res.status}`);
      const { runId } = await res.json();
      const es = new EventSource(`${BASE}/run/${runId}/stream${token ? `?token=${encodeURIComponent(token)}` : ""}`);
      es.onmessage = (e) => {
        const entry = JSON.parse(e.data);
        setState((s) => ({ ...s, trace: [...s.trace, entry] }));
      };
      es.addEventListener("done", (e) => {
        const payload = JSON.parse(e.data);
        setState((s) => ({ ...s, status: payload.status, result: payload.result, error: payload.error }));
        es.close();
      });
      es.onerror = () => {
        setState((s) => ({ ...s, status: "error", error: s.error || "Lost connection to the backend." }));
        es.close();
      };
    } catch (err) {
      setState((s) => ({ ...s, status: "error", error: err.message }));
    }
  }

  return (
    <div className="rounded-md border p-3" style={{ borderColor: "var(--brand-700)44" }}>
      <button
        onClick={run}
        disabled={state.status === "running"}
        className="w-full flex items-center justify-center gap-2 text-xs rounded-md py-2"
        style={{ background: "var(--brand-700)", color: "#fff" }}
      >
        {state.status === "running" ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
        Analyze with VisionAgent (real — Qwen2.5-VL-7B)
      </button>
      {state.trace.length > 0 && (
        <div className="mt-2 space-y-1">
          {state.trace.map((e, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px]">
              <Radio size={9} style={{ color: "var(--brand-700)" }} />
              <span style={{ color: "var(--text-secondary)" }}>{e.agent}: {e.text}</span>
            </div>
          ))}
        </div>
      )}
      {state.result && (
        <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>{state.result.description}</p>
      )}
      {state.error && <p className="mt-2 text-xs" style={{ color: "var(--tier3)" }}>{state.error}</p>}
    </div>
  );
}

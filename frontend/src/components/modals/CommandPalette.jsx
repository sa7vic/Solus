import { useEffect, useRef, useState } from "react";
import { Command as CommandIcon, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ACTIONS_BY_ROLE = {
  inspection: [{ label: "New approval note from inspection report", hint: "Canvas", tab: "canvas" }],
  process: [{ label: "Run engineering calc: pipe sizing", hint: "Canvas", tab: "canvas" }],
  hse: [{ label: "Draft safety advisory from near-miss report", hint: "Canvas", tab: "canvas" }],
  procurement: [{ label: "Compare vendor quotes", hint: "Canvas", tab: "canvas" }],
  board: [{ label: "Build board presentation", hint: "Canvas", tab: "canvas" }],
  it: [{ label: "Open integrated terminal", hint: "Terminal", tab: "terminal" }],
};

const COMMON_ACTIONS = [
  { label: "Browse workspace files", hint: "Files", tab: "files" },
  { label: "Open plugin marketplace", hint: "Marketplace", route: "/marketplace" },
];

export default function CommandPalette({ roleId, onClose, onSetTab }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);
  const navigate = useNavigate();
  useEffect(() => inputRef.current?.focus(), []);

  const actions = [...(ACTIONS_BY_ROLE[roleId] || []), ...COMMON_ACTIONS];
  const filtered = actions.filter((a) => a.label.toLowerCase().includes(q.toLowerCase()));

  function run(a) {
    if (a.route) navigate(a.route);
    if (a.tab) onSetTab(a.tab);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-28" style={{ background: "#1F2E3Dcc" }} onClick={onClose}>
      <div className="modal-in w-full max-w-lg rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <CommandIcon size={15} style={{ color: "var(--text-tertiary)" }} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search workflows..." className="flex-1 bg-transparent outline-none text-sm" style={{ color: "var(--text-primary)" }} />
          <button onClick={onClose} aria-label="Close"><X size={15} style={{ color: "var(--text-tertiary)" }} /></button>
        </div>
        <div className="max-h-80 overflow-y-auto py-1.5">
          {filtered.length === 0 && <div className="px-4 py-6 text-center text-xs" style={{ color: "var(--text-tertiary)" }}>No matching workflow.</div>}
          {filtered.map((a) => (
            <button key={a.label} onClick={() => run(a)} className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-black/5">
              <span className="text-sm" style={{ color: "var(--text-primary)" }}>{a.label}</span>
              <span className="text-[10px]" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{a.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

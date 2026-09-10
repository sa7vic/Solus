import { KeyRound, X } from "lucide-react";
import { useWorkbench } from "../../context/WorkbenchContext.jsx";

export default function AuditDrawer({ onClose }) {
  const { audit } = useWorkbench();
  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "#1F2E3Dcc" }} onClick={onClose}>
      <div className="modal-in-side w-full max-w-md h-full border-l overflow-y-auto" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
          <div className="flex items-center gap-2">
            <KeyRound size={15} style={{ color: "var(--brand-700)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Audit log — immudb (mocked)</span>
          </div>
          <button onClick={onClose} aria-label="Close"><X size={15} style={{ color: "var(--text-tertiary)" }} /></button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-3">
          {audit.map((a, i) => (
            <div key={i} className="flex items-start gap-3 text-xs">
              <span className="w-12 shrink-0 pt-0.5" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{a.t}</span>
              <div className="flex-1 min-w-0">
                <div style={{ color: "var(--text-primary)" }}><span style={{ color: "var(--brand-700)" }}>{a.actor}</span> · {a.action}</div>
                <div className="truncate" style={{ color: "var(--text-secondary)" }}>{a.target}</div>
              </div>
              <span className="shrink-0 rounded-sm border px-1.5 py-0.5" style={{ borderColor: "var(--border)", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{a.hash}</span>
            </div>
          ))}
        </div>
        <div className="px-5 pb-5 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          Merkle-tree backed in the real system — any entry above is meant to be cryptographically
          verifiable against the log root. Version history on deliverables reads this same log.
        </div>
      </div>
    </div>
  );
}

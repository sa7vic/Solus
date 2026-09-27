import { useState } from "react";
import { Lock, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useWorkbench } from "../../context/WorkbenchContext.jsx";

export default function HumanGateModal({ entry, onClose }) {
  const [approved, setApproved] = useState(false);
  const { user } = useAuth();
  const { logAudit } = useWorkbench();

  async function approve() {
    setApproved(true);
    await logAudit({ actor: `user:${user?.username}`, action: "gate.approved", target: entry.text.slice(0, 40) });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "#1F2E3Dcc" }} onClick={onClose}>
      <div className="modal-in w-full max-w-md rounded-lg border p-5" style={{ borderColor: "var(--tier3)44", background: "var(--bg-panel)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--tier3)18" }}>
            <Lock size={15} style={{ color: "var(--tier3)" }} />
          </div>
          <div>
            <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>HumanGate — sign-off required</div>
            <div className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Tier 3 · Confidential data requested</div>
          </div>
        </div>
        <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>{entry.text}</p>
        <div className="rounded-md border p-2.5 mb-4 text-xs" style={{ borderColor: "var(--border)", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
          This step is paused until a human confirms use of this data. Nothing downstream runs until you approve or deny.
        </div>
        {approved ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--ok)" }}>
            <CheckCircle2 size={15} /> Approved — pipeline resumed. Logged to immudb.
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={approve} className="flex-1 rounded-md py-2 text-sm font-medium" style={{ background: "var(--brand-700)", color: "#fff" }}>Approve</button>
            <button onClick={onClose} className="flex-1 rounded-md py-2 text-sm border" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>Deny</button>
          </div>
        )}
      </div>
    </div>
  );
}

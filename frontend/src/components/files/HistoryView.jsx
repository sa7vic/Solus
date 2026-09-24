import { History, GitCommitVertical } from "lucide-react";
import { useWorkbench } from "../../context/WorkbenchContext.jsx";

// Draft-to-draft version history, read off the same audit log used by the
// Audit drawer (§10.5) — filtered to this workspace's generated files,
// not a separate versioning subsystem.
export default function HistoryView() {
  const { workspace, audit } = useWorkbench();
  const generated = (workspace.files?.Generated || []).map((f) => f.name);
  const relevant = audit.filter((a) => generated.some((name) => a.target?.includes(name.split(".")[0])) || a.action?.includes("gate"));

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <History size={15} style={{ color: "var(--brand-700)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Version history — {workspace?.name}</span>
        </div>
        <p className="text-xs mb-5" style={{ color: "var(--text-tertiary)" }}>
          Reads the immudb-backed audit log (§12), filtered to this workspace's write and gate
          events — not a separate versioning subsystem.
        </p>

        {relevant.length === 0 ? (
          <div className="text-xs rounded-md border p-4" style={{ borderColor: "var(--border)", color: "var(--text-tertiary)", background: "var(--bg-panel)" }}>
            No draft-to-draft events logged yet for this workspace's generated files.
          </div>
        ) : (
          <div className="flex flex-col">
            {relevant.map((a, i) => (
              <div key={i} className="flex gap-3 pb-5 relative">
                {i !== relevant.length - 1 && <div className="absolute left-[7px] top-4 bottom-0 w-px" style={{ background: "var(--border-soft)" }} />}
                <div className="w-3.5 h-3.5 rounded-full mt-1 shrink-0 z-10" style={{ background: "var(--bg-panel)", border: "1.5px solid var(--brand-700)" }} />
                <div className="rounded-md border px-3 py-2.5 flex-1" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <GitCommitVertical size={12} style={{ color: "var(--brand-700)" }} />
                    <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{a.actor}</span>
                    <span className="text-[10px] ml-auto" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{a.t}</span>
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{a.action} · {a.target}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

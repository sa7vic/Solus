import { Activity, FileText, ArrowUpRight, Search } from "lucide-react";
import TierChip from "../common/TierChip.jsx";
import { useWorkbench } from "../../context/WorkbenchContext.jsx";

const AGENT_COLOR = {
  Planner: "var(--brand-700)", Router: "var(--brand-700)", RetrievalAgent: "var(--brand-500)",
  VisionAgent: "var(--brand-500)", DocAgent: "var(--brand-500)", CodeAgent: "var(--brand-500)",
  CalcAgent: "var(--brand-500)", Verifier: "var(--tier2)", Composer: "var(--brand-700)", HumanGate: "var(--tier3)",
};

export default function RightRail({ rightTab, setRightTab, onOpenGate }) {
  const { workspace } = useWorkbench();
  const trace = workspace.trace || [];
  const evidence = workspace.evidence || [];

  return (
    <div className="w-80 shrink-0 border-l flex flex-col" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
      <div className="flex border-b shrink-0" style={{ borderColor: "var(--border)" }}>
        {[{ id: "trace", label: "Live Agent Trace", Icon: Activity }, { id: "evidence", label: "Evidence", Icon: FileText }].map((t) => (
          <button
            key={t.id}
            onClick={() => setRightTab(t.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs transition-colors hover:text-[var(--text-primary)]"
            style={{ color: rightTab === t.id ? "var(--text-primary)" : "var(--text-tertiary)", borderBottom: rightTab === t.id ? "2px solid var(--brand-700)" : "2px solid transparent" }}
          >
            <t.Icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {rightTab === "trace" ? (
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {trace.map((e, i) => {
            const color = AGENT_COLOR[e.agent] || "var(--text-secondary)";
            const clickable = e.tier === 3;
            return (
              <div key={i} className="flex gap-2.5 pb-4 relative">
                {i !== trace.length - 1 && <div className="absolute left-[9px] top-5 bottom-0 w-px" style={{ background: "var(--border-soft)" }} />}
                <div className="w-[19px] h-[19px] rounded-full flex items-center justify-center shrink-0 z-10" style={{ background: "var(--bg-panel-raised)", border: `1px solid ${e.flag ? "var(--tier2)" : "var(--border)"}` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{e.agent}</span>
                    <span className="text-[10px]" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{e.t}</span>
                    {e.tier && <TierChip tier={e.tier} compact />}
                  </div>
                  <p
                    className={`text-xs leading-relaxed ${clickable ? "cursor-pointer underline decoration-dotted" : ""}`}
                    style={{ color: e.flag ? "var(--tier2)" : "var(--text-secondary)" }}
                    onClick={() => clickable && onOpenGate(e)}
                  >
                    {e.text}
                  </p>
                </div>
              </div>
            );
          })}
          {trace.length === 0 && <div className="text-xs px-1" style={{ color: "var(--text-tertiary)" }}>No trace yet for this workspace.</div>}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2.5">
          {evidence.map((ev, i) => (
            <div key={i} className="rounded-md border p-3" style={{ borderColor: "var(--border)", background: "var(--bg-panel-raised)" }}>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-xs font-medium leading-snug" style={{ color: "var(--text-primary)" }}>{ev.src}</span>
                <TierChip tier={ev.tier} compact />
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{ev.snippet}</p>
              <button onClick={() => onOpenPassage(ev)} className="flex items-center gap-1 mt-2 text-[10px]" style={{ color: "var(--brand-700)", fontFamily: "var(--font-mono)" }}>
                open source passage <ArrowUpRight size={10} />
              </button>
            </div>
          ))}
          {evidence.length > 0 && (
            <a href="/knowledge-base" className="mt-2 flex items-center justify-center gap-2 py-2 rounded border border-[var(--border)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-base)] transition-colors">
              <Search size={14} /> Search KB
            </a>
          )}
        </div>
      )}
    </div>
  );
}

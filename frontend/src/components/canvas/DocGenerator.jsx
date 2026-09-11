import { useState } from "react";
import { Sparkles, Loader2, Download, Radio, FileText } from "lucide-react";
import { useWorkbench } from "../../context/WorkbenchContext.jsx";
import { useAgentRun } from "../../hooks/useAgentRun.js";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

const AGENT_DOT = {
  Planner: "var(--brand-700)", Router: "var(--brand-700)", RetrievalAgent: "var(--brand-500)",
  DocAgent: "var(--brand-500)", Verifier: "var(--tier2)", Composer: "var(--brand-700)", System: "var(--tier3)",
};

// The generic document/deck generator: describe what you need, get a real
// file back. No fixed scenario, no seed content — the result depends on
// what's typed in the box. Shared by every document-producing role;
// `format` picks docx vs pptx.
export default function DocGenerator({ format = "docx", placeholder }) {
  const { role, workspace } = useWorkbench();
  const [task, setTask] = useState("");
  const run = useAgentRun();

  function submit() {
    if (!task.trim() || run.status === "starting" || run.status === "running") return;
    run.start(`/run/generate-document/${role.id}/${workspace.id}`, { task, format });
  }

  const kind = format === "pptx" ? "slide deck" : "document";

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: "var(--bg-base)" }}>
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={15} style={{ color: "var(--brand-700)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Describe the {kind} you need
          </span>
        </div>
        <p className="text-xs mb-3" style={{ color: "var(--text-tertiary)" }}>
          Planner plans the structure, RetrievalAgent grounds each point against {role?.label}'s
          knowledge base, DocAgent drafts it, Verifier checks citations — using your local models.
        </p>

        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="w-full rounded-md border p-3 text-sm outline-none resize-y"
          style={{ borderColor: "var(--border)", color: "var(--text-primary)", background: "#fff" }}
        />

        <button
          onClick={submit}
          disabled={!task.trim() || run.status === "starting" || run.status === "running"}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--brand-700)", color: "#fff" }}
        >
          {run.status === "starting" || run.status === "running" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          Generate {kind}
        </button>

        {run.status !== "idle" && (
          <div className="mt-4 rounded-md border overflow-hidden" style={{ borderColor: "var(--brand-700)44" }}>
            <div className="flex items-center gap-2 px-3 py-2" style={{ background: "var(--brand-700)0d" }}>
              <Radio size={12} style={{ color: "var(--brand-700)" }} className={run.status === "running" ? "animate-pulse" : ""} />
              <span className="text-xs font-medium" style={{ color: "var(--brand-700)" }}>Live agent trace</span>
              <span className="ml-auto text-[10px] uppercase" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{run.status}</span>
            </div>
            <div className="max-h-64 overflow-y-auto px-3 py-2" style={{ background: "#fff" }}>
              {run.trace.map((e, i) => (
                <div key={i} className="flex items-start gap-2 py-0.5 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: AGENT_DOT[e.agent] || "var(--text-tertiary)" }} />
                  <span className="shrink-0" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 10 }}>{e.t}</span>
                  <span className="font-medium shrink-0" style={{ color: "var(--text-primary)" }}>{e.agent}</span>
                  <span style={{ color: e.flag ? "var(--tier2)" : "var(--text-secondary)" }}>{e.text}</span>
                </div>
              ))}
            </div>
            {run.error && <div className="px-3 py-2 text-xs" style={{ background: "var(--tier3)10", color: "var(--tier3)" }}>{run.error}</div>}
          </div>
        )}

        {run.status === "done" && run.result && (
          <div className="mt-4 rounded-md border p-4" style={{ borderColor: "var(--border)", background: "var(--paper)" }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{run.result.title}</div>
                <div className="text-[11px]" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{run.result.filename}</div>
              </div>
              <a
                href={`${BASE}/run/download/${role.id}/${workspace.id}/${run.result.filename}`}
                className="flex items-center gap-1.5 text-xs rounded-md px-3 py-2 shrink-0"
                style={{ background: "var(--brand-700)", color: "#fff" }}
              >
                <Download size={12} /> Download
              </a>
            </div>
            {run.result.sections.map((s, i) => (
              <div key={i} className="mb-3">
                <div className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>{s.heading}</div>
                <ul className="text-sm space-y-1 pl-4 list-disc" style={{ color: "var(--text-secondary)" }}>
                  {s.bullets.map((b, j) => (
                    <li key={j}>
                      {b.text}
                      {b.citation && (
                        <sup className="ml-0.5 rounded-sm px-1 text-[10px]" style={{ background: "var(--brand-200)", color: "var(--brand-700)" }}>{b.citation}</sup>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {run.result.citations?.length > 0 && (
              <div className="mt-3 pt-3 border-t text-xs" style={{ borderColor: "var(--border-soft)", color: "var(--text-tertiary)" }}>
                {run.result.citations.map((c) => <div key={c.n}>[{c.n}] {c.source}</div>)}
              </div>
            )}
          </div>
        )}

        {run.status === "idle" && (
          <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
            <FileText size={13} /> Nothing generated yet — describe what you need above.
          </div>
        )}
      </div>
    </div>
  );
}

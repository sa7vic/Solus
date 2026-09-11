import { useState } from "react";
import { FileCode2, ClipboardCheck, CheckCircle2, XCircle, Wrench, Loader2, Radio } from "lucide-react";
import { useAgentRun } from "../../hooks/useAgentRun.js";

const DEFAULT_SOURCE = `from datetime import datetime

def parse_timestamp(raw: str) -> datetime:
    # legacy sensors emit 'YYYY-DD-MM HH:MM' (day/month swapped) on some units
    return datetime.strptime(raw, "%Y-%m-%d %H:%M")
`;

const DEFAULT_TEST = `from sensor_ingest import parse_timestamp

def test_parse_standard_format():
    dt = parse_timestamp("2026-09-04 08:30")
    assert dt.year == 2026 and dt.month == 9 and dt.day == 4

def test_parse_swapped_day_month():
    dt = parse_timestamp("2026-30-08 08:30")
    assert dt.year == 2026 and dt.month == 8 and dt.day == 30

def test_parse_malformed_raises():
    try:
        parse_timestamp("not-a-timestamp")
        assert False, "expected ValueError"
    except ValueError:
        pass
`;

const AGENT_DOT = {
  Planner: "var(--brand-700)", Router: "var(--brand-700)", CodeAgent: "var(--brand-500)",
  Verifier: "var(--tier2)", System: "var(--tier3)",
};

// A real, general-purpose code-fix tool: whatever is in these three fields
// is what actually gets sent to the coder model and actually executed —
// not a fixed scenario. The prefilled content is a convenient starting
// point, fully editable/replaceable.
export default function CanvasCode() {
  const [filename, setFilename] = useState("sensor_ingest.py");
  const [sourceCode, setSourceCode] = useState(DEFAULT_SOURCE);
  const [testCode, setTestCode] = useState(DEFAULT_TEST);
  const [task, setTask] = useState("Fix the day/month-swapped timestamp format so all tests pass.");
  const [tab, setTab] = useState("source");
  const run = useAgentRun();

  const hasResult = run.status === "done" && run.result;
  const busy = run.status === "starting" || run.status === "running";

  function submit() {
    if (busy || !sourceCode.trim() || !testCode.trim() || !task.trim()) return;
    run.start("/run/fix-code", { task, sourceCode, testCode, filename: filename.trim() || "solution.py" });
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "var(--bg-base)" }}>
      <div className="p-4 border-b shrink-0 flex flex-col gap-2" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <input
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-xs w-48"
            style={{ borderColor: "var(--border)", fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}
            placeholder="filename.py"
          />
          <input
            value={task}
            onChange={(e) => setTask(e.target.value)}
            className="flex-1 rounded-md border px-2 py-1.5 text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
            placeholder="Describe what needs to change..."
          />
          <button
            onClick={submit}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            style={{ background: "var(--brand-700)", color: "#fff" }}
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Wrench size={12} />}
            Fix with CodeAgent
          </button>
        </div>

        {run.status !== "idle" && (
          <div className="rounded-md border overflow-hidden" style={{ borderColor: "var(--brand-700)44" }}>
            <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: "var(--brand-700)0d" }}>
              <Radio size={11} style={{ color: "var(--brand-700)" }} className={run.status === "running" ? "animate-pulse" : ""} />
              <span className="text-[11px] font-medium" style={{ color: "var(--brand-700)" }}>Live run</span>
              <span className="ml-auto text-[10px] uppercase" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{run.status}</span>
            </div>
            <div className="max-h-28 overflow-y-auto px-3 py-1.5" style={{ background: "#fff" }}>
              {run.trace.map((e, i) => (
                <div key={i} className="flex items-start gap-2 py-0.5 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ background: AGENT_DOT[e.agent] || "var(--text-tertiary)" }} />
                  <span className="font-medium shrink-0" style={{ color: "var(--text-primary)" }}>{e.agent}</span>
                  <span style={{ color: e.flag ? "var(--tier2)" : "var(--text-secondary)" }}>{e.text}</span>
                </div>
              ))}
            </div>
            {run.error && <div className="px-3 py-1.5 text-[11px]" style={{ background: "var(--tier3)10", color: "var(--tier3)" }}>{run.error}</div>}
          </div>
        )}
      </div>

      <div className="flex border-b shrink-0" style={{ borderColor: "var(--border)" }}>
        {["source", "test", "output"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 text-xs border-r flex items-center gap-1.5"
            style={{ borderColor: "var(--border)", background: tab === t ? "var(--bg-panel)" : "transparent", color: tab === t ? "var(--text-primary)" : "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
          >
            {t === "output" ? <ClipboardCheck size={12} /> : <FileCode2 size={12} />}
            {t === "source" ? filename : t === "test" ? `test_${filename}` : "test output"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === "source" && (
          <textarea
            value={hasResult ? run.result.patched : sourceCode}
            onChange={(e) => !hasResult && setSourceCode(e.target.value)}
            readOnly={hasResult}
            spellCheck={false}
            className="w-full h-full p-4 text-[13px] outline-none resize-none"
            style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)", background: hasResult ? "var(--ok)08" : "transparent" }}
          />
        )}
        {tab === "test" && (
          <textarea
            value={testCode}
            onChange={(e) => setTestCode(e.target.value)}
            spellCheck={false}
            className="w-full h-full p-4 text-[13px] outline-none resize-none"
            style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}
          />
        )}
        {tab === "output" && (
          <pre className="w-full h-full p-4 text-[12px] whitespace-pre-wrap overflow-y-auto" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
            {hasResult ? (run.result.stdout + "\n" + run.result.stderr).trim() : "Run the agent to see real test output here."}
          </pre>
        )}
      </div>

      <div className="shrink-0 border-t px-5 py-2.5 flex items-center gap-2 text-xs" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
        {hasResult ? (
          <>
            {run.result.passed ? <CheckCircle2 size={13} style={{ color: "var(--ok)" }} /> : <XCircle size={13} style={{ color: "var(--tier3)" }} />}
            <span style={{ color: run.result.passed ? "var(--ok)" : "var(--tier3)" }}>{run.result.summary}</span>
            <span style={{ color: "var(--text-tertiary)" }}>·</span>
            <span style={{ color: "var(--text-tertiary)" }}>{run.result.sandbox}</span>
          </>
        ) : (
          <span style={{ color: "var(--text-tertiary)" }}>Edit the source/test/task above, or use the prefilled example, then run the agent.</span>
        )}
      </div>
    </div>
  );
}

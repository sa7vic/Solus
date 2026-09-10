import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { History, Terminal as TerminalIcon, Download } from "lucide-react";
import { api } from "../lib/api.js";

export default function ActivityPage() {
  const [runs, setRuns] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.listRuns().then(setRuns).catch(console.error);
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Activity Log</h1>

      <div className="flex flex-col gap-3">
        {runs.map(run => {
          const isExp = expanded === run.id;
          const statusColor = run.status === 'done' ? 'var(--tier2)' : run.status === 'error' ? 'var(--tier3)' : 'var(--brand-500)';
          
          return (
            <div key={run.id} className="rounded-xl border overflow-hidden transition-colors" style={{ borderColor: isExp ? 'var(--brand-500)' : 'var(--border)', background: 'var(--bg-panel)' }}>
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--bg-panel-raised)]"
                onClick={() => setExpanded(isExp ? null : run.id)}
              >
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{run.type || 'Agent Task'}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${statusColor}20`, color: statusColor }}>
                      {run.status}
                    </span>
                  </div>
                  <div className="text-sm font-medium truncate pr-4" style={{ color: 'var(--text-primary)' }}>{run.task}</div>
                </div>
                <div className="text-xs text-right shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                  <div>{new Date(run.startedAt).toLocaleString()}</div>
                  {run.durationMs && <div>{(run.durationMs / 1000).toFixed(1)}s</div>}
                </div>
              </div>

              {isExp && (
                <div className="p-4 border-t bg-[var(--bg-base)] flex flex-col gap-4" style={{ borderColor: 'var(--border)' }}>
                  {run.result && (
                    <div className="p-3 rounded-lg border bg-[var(--bg-panel)] flex flex-col gap-2" style={{ borderColor: 'var(--border)' }}>
                      <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Result</h4>
                      {run.result.filename ? (
                        <div className="flex items-center gap-2">
                          <Download size={14} style={{ color: 'var(--brand-700)' }} />
                          <a href={`/api/run/download/${run.result.role}/${run.result.workspaceId}/${run.result.filename}`} className="text-sm text-[var(--brand-700)] hover:underline">
                            Download {run.result.filename}
                          </a>
                        </div>
                      ) : (
                        <pre className="text-xs whitespace-pre-wrap font-mono" style={{ color: 'var(--text-secondary)' }}>
                          {JSON.stringify(run.result, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}

                  {run.error && (
                    <div className="p-3 rounded-lg border bg-[var(--tier3)10] text-[var(--tier3)] text-xs font-mono whitespace-pre-wrap" style={{ borderColor: 'var(--tier3)30' }}>
                      {run.error}
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}><TerminalIcon size={14} /> Execution Trace</h4>
                    <div className="flex flex-col gap-3">
                      {(run.trace || []).map((t, i) => (
                        <div key={i} className="flex gap-2.5 relative">
                          {i !== run.trace.length - 1 && <div className="absolute left-[9px] top-5 bottom-0 w-px" style={{ background: "var(--border-soft)" }} />}
                          <div className="w-[19px] h-[19px] rounded-full flex items-center justify-center shrink-0 z-10 bg-[var(--bg-panel-raised)]" style={{ border: `1px solid ${t.flag ? "var(--tier2)" : "var(--border)"}` }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-500)]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{t.agent}</span>
                              <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{new Date(t.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-xs leading-relaxed" style={{ color: t.flag ? "var(--tier2)" : "var(--text-secondary)" }}>{t.text}</p>
                          </div>
                        </div>
                      ))}
                      {(!run.trace || run.trace.length === 0) && <div className="text-xs text-[var(--text-tertiary)]">No trace available.</div>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {runs.length === 0 && <div className="p-8 text-center text-sm text-[var(--text-tertiary)]">No runs yet. Go to Agents to start a task.</div>}
      </div>
    </div>
  );
}

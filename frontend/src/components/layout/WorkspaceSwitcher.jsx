import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, Plus, Clock, FileText, GitBranch, FolderKanban, Loader2 } from "lucide-react";
import { useWorkbench } from "../../context/WorkbenchContext.jsx";

function timeAgo(iso) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

const RESULT_ICON = { workspace: FolderKanban, file: FileText, trace: GitBranch };

// Doubles as §10.2 (persistent, named, resumable workspaces) and §10.3
// (session/deliverable search) — one dropdown, since the second is really
// just "find your way back into one of the first."
export default function WorkspaceSwitcher() {
  const { workspace, workspaceList, switchWorkspace, createWorkspace, searchWorkspaces } = useWorkbench();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
    else {
      setQuery("");
      setResults(null);
      setCreating(false);
      setNewName("");
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      searchWorkspaces(query).then((r) => {
        setResults(r);
        setSearching(false);
      });
    }, 200);
    return () => clearTimeout(t);
  }, [query, searchWorkspaces]);

  function pick(id) {
    switchWorkspace(id);
    setOpen(false);
  }

  async function submitCreate() {
    const name = newName.trim();
    if (!name) return;
    await createWorkspace(name);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-sm truncate max-w-[220px] transition-colors hover:text-[var(--brand-700)]"
        style={{ color: "var(--text-primary)" }}
      >
        <span className="truncate">{workspace?.name || "—"}</span>
        <ChevronDown size={13} style={{ color: "var(--text-tertiary)" }} className="shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="modal-in absolute left-0 top-full mt-2 w-80 rounded-lg border overflow-hidden z-50"
            style={{ borderColor: "var(--border)", background: "var(--bg-panel)", boxShadow: "0 8px 24px rgba(31,46,61,0.14)" }}
          >
            <div className="flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
              <Search size={13} style={{ color: "var(--text-tertiary)" }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search workspaces & past deliverables..."
                className="flex-1 bg-transparent outline-none text-xs"
                style={{ color: "var(--text-primary)" }}
              />
              {searching && <Loader2 size={12} className="animate-spin" style={{ color: "var(--text-tertiary)" }} />}
            </div>

            <div className="max-h-72 overflow-y-auto py-1">
              {results ? (
                results.length === 0 ? (
                  <div className="px-3 py-5 text-center text-xs" style={{ color: "var(--text-tertiary)" }}>No matches.</div>
                ) : (
                  results.map((r, i) => {
                    const Icon = RESULT_ICON[r.type] || FileText;
                    return (
                      <button
                        key={i}
                        onClick={() => pick(r.workspaceId)}
                        className="w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[var(--bg-panel-raised)]"
                      >
                        <Icon size={13} className="mt-0.5 shrink-0" style={{ color: "var(--brand-500)" }} />
                        <div className="min-w-0">
                          <div className="text-xs truncate" style={{ color: "var(--text-primary)" }}>{r.snippet}</div>
                          <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>in {r.workspaceName}</div>
                        </div>
                      </button>
                    );
                  })
                )
              ) : (
                workspaceList.map((ws) => {
                  const active = ws.id === workspace?.id;
                  return (
                    <button
                      key={ws.id}
                      onClick={() => pick(ws.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-panel-raised)]"
                      style={{ background: active ? "var(--brand-200)33" : "transparent" }}
                    >
                      <FolderKanban size={14} className="shrink-0" style={{ color: active ? "var(--brand-700)" : "var(--text-tertiary)" }} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs truncate" style={{ color: active ? "var(--brand-700)" : "var(--text-primary)" }}>{ws.name}</div>
                        <div className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                          <Clock size={9} /> {timeAgo(ws.lastActive)} · {ws.generatedCount} generated · {ws.uploadsCount} uploaded
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="border-t p-2" style={{ borderColor: "var(--border)" }}>
              {creating ? (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitCreate()}
                    placeholder="Workspace name..."
                    className="flex-1 rounded-md border px-2 py-1.5 text-xs outline-none"
                    style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                  />
                  <button onClick={submitCreate} className="rounded-md px-2.5 py-1.5 text-xs" style={{ background: "var(--brand-700)", color: "#fff" }}>Create</button>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-[var(--bg-panel-raised)]"
                  style={{ color: "var(--brand-700)" }}
                >
                  <Plus size={13} /> New workspace
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

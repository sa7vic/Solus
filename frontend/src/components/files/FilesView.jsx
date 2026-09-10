import { File, Download } from "lucide-react";
import TierChip from "../common/TierChip.jsx";
import { useWorkbench } from "../../context/WorkbenchContext.jsx";

export default function FilesView({ selectedFile, setSelectedFile }) {
  const { workspace } = useWorkbench();
  const tree = workspace.files || {};
  const all = Object.entries(tree).flatMap(([folder, files]) => files.map((f) => ({ folder, ...f })));

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-3xl mx-auto">
        <div className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          {workspace?.name} — project directory, mounted read/write for CodeAgent &amp; FileTool.
        </div>
        <div className="grid grid-cols-2 gap-2">
          {all.map((f) => {
            const active = f.name === selectedFile;
            return (
              <button
                key={f.name}
                onClick={() => setSelectedFile(f.name)}
                className="flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-left transition-colors hover:border-[var(--brand-700)]"
                style={{ borderColor: active ? "var(--brand-700)" : "var(--border)", background: active ? "var(--bg-panel-raised)" : "var(--bg-panel)" }}
              >
                <File size={14} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs truncate" style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{f.name}</div>
                  <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{f.folder}</div>
                </div>
                <TierChip tier={f.tier} compact />
              </button>
            );
          })}
          {all.length === 0 && <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>No files yet.</div>}
        </div>
        {selectedFile && (() => {
          const fileObj = all.find(f => f.name === selectedFile);
          if (!fileObj) return null;
          const { folder, name } = fileObj;
          const { roleId, id: workspaceId } = workspace;
          const previewUrl = `/api/files/serve/${roleId}/${workspaceId}/${folder}/${name}`;
          const ext = name.split('.').pop().toLowerCase();
          const isImg = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
          const isCode = ['txt', 'py', 'js', 'json', 'md', 'csv', 'sh'].includes(ext);
          const isDoc = ['docx', 'pptx', 'xlsx'].includes(ext);

          return (
            <div className="mt-5 rounded-md border overflow-hidden flex flex-col" style={{ borderColor: "var(--border)", background: "var(--bg-panel)", minHeight: "500px" }}>
              <div className="text-xs p-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", background: "var(--bg-panel-raised)" }}>
                <span>PREVIEW · {name}</span>
                <a href={`/api/run/download/${roleId}/${workspaceId}/${name}`} className="flex items-center gap-1 text-[var(--brand-700)] hover:underline">
                  <Download size={14} /> Download
                </a>
              </div>
              <div className="flex-1 relative overflow-auto p-4 flex items-center justify-center bg-[var(--bg-base)]">
                {ext === 'pdf' ? (
                  <iframe src={previewUrl} className="w-full h-full border-0 absolute inset-0" title="PDF Preview" />
                ) : isImg ? (
                  <img src={previewUrl} alt={name} className="max-w-full max-h-full object-contain" />
                ) : isCode ? (
                  <iframe src={previewUrl} className="w-full h-full border-0 absolute inset-0 bg-white" title="Code Preview" />
                ) : isDoc ? (
                  <div className="text-center flex flex-col items-center gap-3 p-8 rounded-lg border bg-[var(--bg-panel)]" style={{ borderColor: 'var(--border)' }}>
                    <File size={48} style={{ color: 'var(--brand-500)' }} />
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Office document - preview not supported</div>
                    <a href={`/api/run/download/${roleId}/${workspaceId}/${name}`} className="mt-2 px-4 py-2 rounded-md bg-[var(--brand-700)] text-white text-sm font-medium hover:opacity-90">Download File</a>
                  </div>
                ) : (
                  <div className="text-center flex flex-col items-center gap-3 p-8 rounded-lg border bg-[var(--bg-panel)]" style={{ borderColor: 'var(--border)' }}>
                    <File size={48} style={{ color: 'var(--text-tertiary)' }} />
                    <div className="text-sm text-[var(--text-secondary)]">Preview not available</div>
                    <a href={`/api/run/download/${roleId}/${workspaceId}/${name}`} className="mt-2 px-4 py-2 rounded-md border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--bg-panel-raised)]">Download File</a>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

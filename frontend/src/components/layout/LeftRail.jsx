import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, File, Upload, ShieldAlert } from "lucide-react";
import SectionLabel from "../common/SectionLabel.jsx";
import TierChip from "../common/TierChip.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useWorkbench } from "../../context/WorkbenchContext.jsx";

export default function LeftRail({ activeTab, setActiveTab, selectedFile, setSelectedFile, onOpenUpload }) {
  const { isAdmin, setAdminRole, effectiveRole, user } = useAuth();
  const { role, roles, workspace, logAudit } = useWorkbench();

  function switchRole(id) {
    if (id === effectiveRole) return;
    setAdminRole(id);
    logAudit({ actor: `admin:${user?.username}`, action: "role_view.switched", target: id });
  }
  const [openFolders, setOpenFolders] = useState({ "Knowledge Base": true, Uploads: true, Generated: true });
  const tree = workspace.files || {};

  return (
    <div className="w-64 shrink-0 border-r flex flex-col" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
      <SectionLabel>{isAdmin ? "ADMIN — ROLE VIEW (LOGGED)" : "ROLE WORKBENCH"}</SectionLabel>

      {isAdmin ? (
        <div className="px-2 pb-2 flex flex-col gap-0.5">
          <div className="mx-1 mb-1.5 flex items-center gap-1.5 text-[10px] px-1.5 py-1 rounded" style={{ background: "var(--tier2)14", color: "var(--tier2)" }}>
            <ShieldAlert size={11} /> Cross-role access — each switch is audit-logged
          </div>
          {roles.map((r) => {
            const active = r.id === effectiveRole;
            return (
              <button
                key={r.id}
                onClick={() => switchRole(r.id)}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-[var(--bg-panel-raised)]"
                style={{ background: active ? "var(--bg-panel-raised)" : "transparent", borderLeft: active ? "2px solid var(--brand-700)" : "2px solid transparent" }}
              >
                <span className="text-[13px] leading-tight" style={{ color: active ? "var(--text-primary)" : "var(--text-secondary)" }}>{r.label}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mx-3 mb-2 rounded-md border px-3 py-2.5" style={{ borderColor: "var(--brand-700)", background: "var(--brand-200)33" }}>
          <div className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>{role?.label}</div>
          <div className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>Locked to your account — no role switcher</div>
        </div>
      )}

      <div className="mx-3 h-px" style={{ background: "var(--border-soft)" }} />

      <SectionLabel>PRELOADED TOOLS</SectionLabel>
      <div className="px-3 pb-2 flex flex-wrap gap-1.5">
        {(role?.tools || []).map((t) => (
          <span key={t} className="rounded-sm border px-1.5 py-0.5 text-[10px]" style={{ borderColor: "var(--border)", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>{t}</span>
        ))}
      </div>
      <p className="px-3 pb-2 text-[10px] leading-snug" style={{ color: "var(--text-tertiary)" }}>
        Only tools relevant to this role are loaded — no local model or sandbox spin-up for
        agents this workbench doesn't need.
      </p>

      <div className="mx-3 h-px" style={{ background: "var(--border-soft)" }} />

      <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
        <span className="text-xs" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>WORKSPACE FILES</span>
        <div className="flex items-center gap-2">
          <button onClick={onOpenUpload} title="Upload a file" className="text-[10px] flex items-center gap-1" style={{ color: "var(--brand-700)" }}>
            <Upload size={11} /> upload
          </button>
          <button onClick={() => setActiveTab("files")} className="text-[10px]" style={{ color: activeTab === "files" ? "var(--brand-700)" : "var(--text-tertiary)" }}>expand</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {Object.entries(tree).map(([folder, files]) => (
          <div key={folder} className="mb-0.5">
            <button onClick={() => setOpenFolders((s) => ({ ...s, [folder]: !s[folder] }))} className="flex items-center gap-1.5 w-full rounded px-1.5 py-1 text-left">
              {openFolders[folder] ? <ChevronDown size={12} style={{ color: "var(--text-tertiary)" }} /> : <ChevronRight size={12} style={{ color: "var(--text-tertiary)" }} />}
              {openFolders[folder] ? <FolderOpen size={13} style={{ color: "var(--brand-500)" }} /> : <Folder size={13} style={{ color: "var(--brand-500)" }} />}
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{folder}</span>
              <span className="text-[10px] ml-auto" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{files.length}</span>
            </button>
            {openFolders[folder] && files.map((f) => {
              const active = selectedFile === f.name;
              return (
                <button
                  key={f.name}
                  onClick={() => { setSelectedFile(f.name); setActiveTab("files"); }}
                  className="flex items-center gap-1.5 w-full rounded pl-7 pr-1.5 py-1 text-left transition-colors hover:bg-[var(--bg-panel-raised)]"
                  style={{ background: active ? "var(--bg-panel-raised)" : "transparent" }}
                >
                  <File size={12} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
                  <span className="text-[11px] truncate flex-1" style={{ color: active ? "var(--text-primary)" : "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{f.name}</span>
                  <TierChip tier={f.tier} compact />
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

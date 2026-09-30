import { useState } from "react";
import { Layers, Folder, Terminal as TerminalIcon, History } from "lucide-react";
import { useWorkbench } from "../context/WorkbenchContext.jsx";
import { useHotkeys } from "../hooks/useHotkeys.js";

import TopBar from "../components/layout/TopBar.jsx";
import LeftRail from "../components/layout/LeftRail.jsx";
import RightRail from "../components/layout/RightRail.jsx";
import StatusBar from "../components/layout/StatusBar.jsx";
import ModelMissingBanner from "../components/banners/ModelMissingBanner.jsx";

import CanvasApproval from "../components/canvas/CanvasApproval.jsx";
import CanvasAdvisory from "../components/canvas/CanvasAdvisory.jsx";
import CanvasCalc from "../components/canvas/CanvasCalc.jsx";
import CanvasComparison from "../components/canvas/CanvasComparison.jsx";
import CanvasDeck from "../components/canvas/CanvasDeck.jsx";
import CanvasCode from "../components/canvas/CanvasCode.jsx";

import FilesView from "../components/files/FilesView.jsx";
import FileUploadModal from "../components/files/FileUploadModal.jsx";
import HistoryView from "../components/files/HistoryView.jsx";
import TerminalView from "../components/terminal/TerminalView.jsx";

import CommandPalette from "../components/modals/CommandPalette.jsx";
import HumanGateModal from "../components/modals/HumanGateModal.jsx";
import AuditDrawer from "../components/modals/AuditDrawer.jsx";
import ModelManagerModal from "../components/modals/ModelManagerModal.jsx";

const CANVAS_BY_TYPE = {
  approval: CanvasApproval,
  advisory: CanvasAdvisory,
  calc: CanvasCalc,
  comparison: CanvasComparison,
  deck: CanvasDeck,
  code: CanvasCode,
};

export default function WorkbenchPage() {
  const { role, loading } = useWorkbench();
  const [activeTab, setActiveTab] = useState("canvas");
  const [rightTab, setRightTab] = useState("trace");
  const [selectedFile, setSelectedFile] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [gateEntry, setGateEntry] = useState(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [passageModal, setPassageModal] = useState(null);

  useHotkeys({
    onTogglealette: () => setPaletteOpen((v) => !v),
    onEscape: () => { setPaletteOpen(false); setGateEntry(null); setAuditOpen(false); setModelsOpen(false); setUploadOpen(false); },
  });

  if (loading || !role) {
    return <div className="h-screen w-full flex items-center justify-center" style={{ background: "var(--bg-base)", color: "var(--text-tertiary)" }}>Loading workbench…</div>;
  }

  const CanvasComponent = CANVAS_BY_TYPE[role.canvas];

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden" style={{ background: "var(--bg-base)", fontFamily: "var(--font-sans)" }}>
      <TopBar role={role} onOpenPalette={() => setPaletteOpen(true)} />
      <ModelMissingBanner onOpenModels={() => setModelsOpen(true)} />

      <div className="flex-1 min-h-0 flex">
        <LeftRail
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          onOpenUpload={() => setUploadOpen(true)}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex border-b shrink-0" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
            {[
              { id: "canvas", label: "Deliverable Canvas", Icon: Layers },
              { id: "files", label: "Files", Icon: Folder },
              { id: "history", label: "History", Icon: History },
              { id: "terminal", label: "Terminal", Icon: TerminalIcon },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs border-r transition-colors hover:text-[var(--text-primary)]"
                style={{ borderColor: "var(--border-soft)", color: activeTab === t.id ? "var(--text-primary)" : "var(--text-tertiary)", borderBottom: activeTab === t.id ? "2px solid var(--brand-700)" : "2px solid transparent", marginBottom: -1 }}
              >
                <t.Icon size={13} />
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 flex">
            {activeTab === "canvas" && CanvasComponent && <CanvasComponent />}
            {activeTab === "files" && <FilesView selectedFile={selectedFile} setSelectedFile={setSelectedFile} />}
            {activeTab === "history" && <HistoryView />}
            {activeTab === "terminal" && <TerminalView />}
          </div>
        </div>

        <RightRail rightTab={rightTab} setRightTab={setRightTab} onOpenGate={setGateEntry} onOpenPassage={setPassageModal} />
      </div>

      <StatusBar onOpenAudit={() => setAuditOpen(true)} onOpenModels={() => setModelsOpen(true)} />

      {paletteOpen && <CommandPalette roleId={role.id} onClose={() => setPaletteOpen(false)} onSetTab={setActiveTab} />}
      {gateEntry && <HumanGateModal entry={gateEntry} onClose={() => setGateEntry(null)} />}
      {auditOpen && <AuditDrawer onClose={() => setAuditOpen(false)} />}
      {modelsOpen && <ModelManagerModal onClose={() => setModelsOpen(false)} />}
      {uploadOpen && <FileUploadModal onClose={() => setUploadOpen(false)} />}
      {passageModal && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-8 z-50" style={{ fontFamily: "var(--font-sans)" }}>
          <div className="bg-[var(--bg-base)] w-full max-w-2xl rounded-xl border shadow-xl flex flex-col" style={{ borderColor: 'var(--border)' }}>
            <div className="p-4 border-b flex items-center justify-between bg-[var(--bg-panel)] rounded-t-xl" style={{ borderColor: 'var(--border)' }}>
              <div className="flex flex-col">
                <span className="font-bold text-[var(--text-primary)]">Source Passage</span>
                <span className="text-xs text-[var(--text-tertiary)] font-mono">{passageModal.src}</span>
              </div>
              <button onClick={() => setPassageModal(null)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="p-6">
              <div className="p-4 rounded border bg-[var(--brand-50)] text-[var(--brand-900)] text-sm italic whitespace-pre-wrap" style={{ borderColor: 'var(--brand-200)' }}>
                "{passageModal.snippet}"
              </div>
              <div className="mt-4 flex justify-end">
                <a href="/knowledge-base" className="px-4 py-2 bg-[var(--brand-700)] text-white text-sm font-medium rounded-md hover:opacity-90">View in Knowledge Base</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

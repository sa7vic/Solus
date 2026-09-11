import TierChip from "../common/TierChip.jsx";

export default function PaperShell({ title, subtitle, tier, children }) {
  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: "var(--bg-base)" }}>
      <div className="mx-auto max-w-2xl rounded-sm p-8 shadow-xl" style={{ background: "var(--paper)", color: "var(--text-primary)" }}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-[11px] tracking-wide" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
              MRPL · SOLUS WORKBENCH OUTPUT
            </div>
            <h1 className="text-2xl font-semibold mt-1" style={{ letterSpacing: "-0.01em" }}>{title}</h1>
            <div className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{subtitle}</div>
          </div>
          <TierChip tier={tier} />
        </div>
        {children}
      </div>
    </div>
  );
}

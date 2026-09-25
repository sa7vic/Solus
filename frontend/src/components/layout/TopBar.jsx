import { useState } from "react";
import { ChevronRight, Search, PlugZap, Store } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "../common/Logo.jsx";
import ProfileMenu from "./ProfileMenu.jsx";
import WorkspaceSwitcher from "./WorkspaceSwitcher.jsx";

function SovereigntyBadge() {
  const [hover, setHover] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors hover:bg-[var(--brand-200)]" style={{ borderColor: "var(--tier1)33", background: "var(--tier1)0f" }}>
        <span className="relative flex h-2 w-2">
          <span className="pulse-dot absolute inline-flex h-full w-full rounded-full" style={{ background: "var(--tier1)" }} />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--tier1)" }} />
        </span>
        <span style={{ color: "var(--tier1)", fontFamily: "var(--font-mono)" }}>0 outbound</span>
      </div>
      {hover && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-md border p-3 text-xs z-50" style={{ borderColor: "var(--border)", background: "var(--bg-panel)", color: "var(--text-secondary)" }}>
          <div className="flex items-center gap-1.5 mb-1.5" style={{ color: "var(--text-primary)" }}>
            <PlugZap size={13} style={{ color: "var(--tier1)" }} />
            <span className="font-medium">Network enforcement: active</span>
          </div>
          Tetragon blocks any outbound syscall in-kernel before it completes. This counter isn't a
          monitor sampling traffic after the fact — there is structurally nothing to miss.
        </div>
      )}
    </div>
  );
}

export default function TopBar({ role, onOpenPalette }) {
  return (
    <div className="flex items-center justify-between px-4 border-b shrink-0" style={{ borderColor: "var(--border)", background: "var(--bg-panel)", height: 52, boxShadow: "0 1px 2px rgba(31,46,61,0.04)" }}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <Logo size={26} variant="on-light" />
          <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>Solus</span>
        </div>
        <ChevronRight size={14} style={{ color: "var(--text-tertiary)" }} />
        <span className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>{role?.label}</span>
        <ChevronRight size={14} style={{ color: "var(--text-tertiary)" }} />
        <WorkspaceSwitcher />
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenPalette}
          className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors hover:bg-[var(--bg-panel-raised)]"
          style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--bg-panel-raised)" }}
        >
          <Search size={13} />
          <span>Search workflows</span>
          <span className="ml-2 rounded border px-1" style={{ borderColor: "var(--border)", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>⌘K</span>
        </button>

        <Link
          to="/marketplace"
          className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors hover:bg-[var(--brand-200)]"
          style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--bg-panel-raised)" }}
        >
          <Store size={13} />
          Marketplace
        </Link>

        <SovereigntyBadge />

        <div className="pl-2 border-l" style={{ borderColor: "var(--border)" }}>
          <ProfileMenu />
        </div>
      </div>
    </div>
  );
}

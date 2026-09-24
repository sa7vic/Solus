import { useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, UserRound, ShieldAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";

function initials(name = "") {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export default function ProfileMenu() {
  const { user, logout, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full border transition-colors hover:bg-[var(--bg-panel-raised)]"
        style={{ borderColor: open ? "var(--brand-700)" : "var(--border)" }}
      >
        <div className="text-right leading-tight hidden sm:block">
          <div className="text-xs" style={{ color: "var(--text-primary)" }}>{user.name}</div>
          <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{user.title}</div>
        </div>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
          style={{ background: "var(--brand-700)", color: "#fff", fontFamily: "var(--font-mono)" }}
        >
          {initials(user.name)}
        </div>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="modal-in absolute right-0 top-full mt-2 w-64 rounded-lg border overflow-hidden z-50"
            style={{ borderColor: "var(--border)", background: "var(--bg-panel)", boxShadow: "0 8px 24px rgba(31,46,61,0.14)" }}
          >
            <div className="px-4 py-3.5 flex items-center gap-3" style={{ background: "var(--brand-200)33" }}>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                style={{ background: "var(--brand-700)", color: "#fff", fontFamily: "var(--font-mono)" }}
              >
                {initials(user.name)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{user.name}</div>
                <div className="text-[11px] truncate" style={{ color: "var(--text-secondary)" }}>@{user.username}</div>
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-1.5 px-4 py-2 text-[11px]" style={{ background: "var(--tier2)14", color: "var(--tier2)" }}>
                <ShieldAlert size={11} /> Cross-role admin — access is audit-logged
              </div>
            )}

            <div className="py-1.5">
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs transition-colors hover:bg-[var(--bg-panel-raised)]"
                style={{ color: "var(--text-secondary)" }}
              >
                <UserRound size={13} /> View full profile
              </Link>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left transition-colors hover:bg-[var(--tier3)10]"
                style={{ color: "var(--tier3)" }}
              >
                <LogOut size={13} /> Log out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

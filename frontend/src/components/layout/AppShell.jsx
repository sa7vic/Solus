import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, MessageSquare, Bot, FolderOpen, BookOpen, Store, Cpu, History, Settings, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import Logo from "../common/Logo.jsx";

export default function AppShell() {
  const { user, logout } = useAuth();
  const [ollamaOk, setOllamaOk] = useState(false);

  useEffect(() => {
    const check = () => api.ollamaHealth().then(r => setOllamaOk(r?.reachable)).catch(() => setOllamaOk(false));
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/chat", icon: MessageSquare, label: "Chat" },
    { to: "/agents", icon: Bot, label: "Agents" },
    { to: "/projects", icon: FolderOpen, label: "Projects" },
    { to: "/knowledge-base", icon: BookOpen, label: "Knowledge Base" },
    { to: "/marketplace", icon: Store, label: "Marketplace" },
    { to: "/models", icon: Cpu, label: "Models" },
    { to: "/activity", icon: History, label: "Activity" },
    { to: "/settings", icon: Settings, label: "Settings" }
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-base)' }}>
      <div className="w-[220px] flex flex-col border-r" style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
        <div className="p-4 flex items-center gap-2 mb-4">
          <Logo size={24} variant="on-light" />
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Solus</span>
        </div>
        
        <nav className="flex-1 px-2 flex flex-col gap-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${isActive ? 'bg-[var(--brand-100)] text-[var(--brand-700)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-panel-raised)] hover:text-[var(--text-primary)]'}`}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user?.name || 'User'}</span>
            <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: ollamaOk ? 'var(--tier2)' : 'var(--tier3)' }} />
              Ollama {ollamaOk ? 'Online' : 'Offline'}
            </div>
            <div className="flex items-center gap-1.5 text-[9px] mt-1 font-mono font-semibold" style={{ color: 'var(--tier2)' }}>
              <span>🔒 WAN: 0B · 100% Loopback</span>
            </div>
          </div>
          <button onClick={logout} className="p-1.5 rounded-md hover:bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <LogOut size={14} />
          </button>
        </div>
      </div>
      
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </div>
    </div>
  );
}

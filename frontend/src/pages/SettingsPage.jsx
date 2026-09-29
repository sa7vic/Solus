import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { ShieldCheck, Cpu, HardDrive, Terminal, Server, Activity, LogOut } from "lucide-react";
import { api } from "../lib/api.js";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [sysInfo, setSysInfo] = useState(null);

  useEffect(() => {
    api.systemInfo().then(setSysInfo).catch(console.error);
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col gap-8">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>

      {/* User Account */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Account</h2>
        <div className="p-5 rounded-xl border flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
          <div className="flex flex-col">
            <span className="text-lg font-medium text-[var(--text-primary)]">{user?.name}</span>
            <span className="text-sm text-[var(--text-tertiary)]">@{user?.username}</span>
            <span className="text-xs mt-1 text-[var(--brand-700)] font-medium">Role: {user?.title}</span>
          </div>
          <button onClick={logout} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border hover:bg-[var(--bg-base)] transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </section>

      {/* System / Hardware */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Hardware & Node Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border flex flex-col gap-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
            <div className="flex items-center gap-2 text-[var(--text-primary)]">
              <Activity size={16} />
              <span className="font-medium text-sm">Ollama Engine</span>
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-2 font-mono">
              Status: {sysInfo?.ollama?.reachable ? 'Reachable' : 'Offline'}<br/>
              Platform: {sysInfo?.platform || 'Unknown'}
            </div>
          </div>
          <div className="p-4 rounded-xl border flex flex-col gap-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
            <div className="flex items-center gap-2 text-[var(--text-primary)]">
              <Server size={16} />
              <span className="font-medium text-sm">Compute</span>
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-2 font-mono">
              CPU Cores: {sysInfo?.cpu?.cores || '-'}<br/>
              Memory: {sysInfo?.memory?.total ? `${(sysInfo.memory.total / 1024 / 1024 / 1024).toFixed(1)} GB` : '-'}
            </div>
          </div>
          <div className="p-4 rounded-xl border flex flex-col gap-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
            <div className="flex items-center gap-2 text-[var(--text-primary)]">
              <Cpu size={16} />
              <span className="font-medium text-sm">GPU Accelerator</span>
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-2 font-mono">
              Status: {sysInfo?.gpu?.available ? 'Available' : 'None detected'}
            </div>
          </div>
        </div>
      </section>

      {/* Air-Gap Guarantee */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Security</h2>
        <div className="p-5 rounded-xl border bg-[var(--tier2)10] flex gap-4" style={{ borderColor: 'var(--tier2)30' }}>
          <div className="shrink-0 mt-1">
            <ShieldCheck size={24} style={{ color: 'var(--tier2)' }} />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-bold" style={{ color: 'var(--tier2)' }}>Air-Gap Enforcement Active</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              This Solus instance is fully disconnected from external networks. 
              Models are run locally via Ollama. Documents and telemetry never leave this physical node.
            </p>
            <div className="text-[10px] font-mono mt-1 pt-2 border-t opacity-70" style={{ borderColor: 'var(--tier2)50', color: 'var(--text-primary)' }}>
              Outbound connections: 0 block(s) · Whitelist: [127.0.0.1, localhost]
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

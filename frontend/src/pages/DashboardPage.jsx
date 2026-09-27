import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, Bot, FolderOpen, Activity } from "lucide-react";
import { api } from "../lib/api.js";

export default function DashboardPage() {
  const [sysInfo, setSysInfo] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [runs, setRuns] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [sys, sesh, rns] = await Promise.all([
          api.systemInfo(),
          api.chatSessions(),
          api.listRuns()
        ]);
        setSysInfo(sys);
        setSessions(sesh.slice(0, 5));
        setRuns(rns.slice(0, 5));
      } catch (err) {
        console.error(err);
      }
    };
    fetchAll();
    const interval = setInterval(() => api.systemInfo().then(setSysInfo), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Model Status Card */}
        <div className="p-5 rounded-xl border flex flex-col gap-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>System Status</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full" style={{ background: sysInfo?.ollama?.reachable ? 'var(--tier2)20' : 'var(--tier3)20' }}>
              <Activity size={20} style={{ color: sysInfo?.ollama?.reachable ? 'var(--tier2)' : 'var(--tier3)' }} />
            </div>
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Ollama Node</div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {sysInfo?.ollama?.reachable ? 'Reachable' : 'Offline'}
              </div>
            </div>
          </div>
          {sysInfo && (
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <div className="p-2 rounded-md" style={{ background: 'var(--bg-base)' }}>
                CPU: {sysInfo.cpu?.cores || '-'} cores
              </div>
              <div className="p-2 rounded-md" style={{ background: 'var(--bg-base)' }}>
                RAM: {sysInfo.memory?.total ? `${(sysInfo.memory.total / 1024 / 1024 / 1024).toFixed(1)} GB` : '-'}
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions Card */}
        <div className="p-5 rounded-xl border flex flex-col gap-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Quick Actions</h2>
          <div className="flex flex-col gap-2">
            <Link to="/chat" className="flex items-center gap-3 p-3 rounded-lg border hover:bg-[var(--bg-base)] transition-colors" style={{ borderColor: 'var(--border)' }}>
              <MessageSquare size={16} style={{ color: 'var(--brand-700)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>New Chat Session</span>
            </Link>
            <Link to="/agents" className="flex items-center gap-3 p-3 rounded-lg border hover:bg-[var(--bg-base)] transition-colors" style={{ borderColor: 'var(--border)' }}>
              <Bot size={16} style={{ color: 'var(--brand-700)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Run Agent Task</span>
            </Link>
            <Link to="/projects" className="flex items-center gap-3 p-3 rounded-lg border hover:bg-[var(--bg-base)] transition-colors" style={{ borderColor: 'var(--border)' }}>
              <FolderOpen size={16} style={{ color: 'var(--brand-700)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Manage Projects</span>
            </Link>
          </div>
        </div>

        {/* Recent Chat Sessions */}
        <div className="p-5 rounded-xl border flex flex-col gap-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Chats</h2>
          <div className="flex flex-col gap-2">
            {sessions.map(s => (
              <Link key={s.id} to={`/chat/${s.id}`} className="block p-3 rounded-lg border hover:bg-[var(--bg-base)] transition-colors" style={{ borderColor: 'var(--border)' }}>
                <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{s.title || 'Untitled'}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{new Date(s.createdAt).toLocaleString()}</div>
              </Link>
            ))}
            {sessions.length === 0 && <div className="text-sm text-[var(--text-tertiary)]">No recent chats.</div>}
          </div>
        </div>

        {/* Recent Runs */}
        <div className="p-5 rounded-xl border flex flex-col gap-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Agent Runs</h2>
          <div className="flex flex-col gap-2">
            {runs.map(r => (
              <Link key={r.id} to="/activity" className="block p-3 rounded-lg border hover:bg-[var(--bg-base)] transition-colors" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold" style={{ color: 'var(--brand-700)' }}>{r.type}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: r.status === 'done' ? 'var(--tier2)20' : r.status === 'error' ? 'var(--tier3)20' : 'var(--brand-500)20', color: r.status === 'done' ? 'var(--tier2)' : r.status === 'error' ? 'var(--tier3)' : 'var(--brand-500)' }}>
                    {r.status}
                  </span>
                </div>
                <div className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{r.task}</div>
              </Link>
            ))}
            {runs.length === 0 && <div className="text-sm text-[var(--text-tertiary)]">No recent runs.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

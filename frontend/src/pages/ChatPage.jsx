import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Send, Bot, AlertTriangle, MessageSquarePlus, Edit2, Check, X, Trash2 } from "lucide-react";
import { api } from "../lib/api.js";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

export default function ChatPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamData, setStreamData] = useState("");
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const endRef = useRef(null);

  useEffect(() => {
    loadSessions();
    api.modelRegistry().then(r => {
      const installed = r.models.filter(m => m.installed);
      setModels(installed);
      if (installed.length > 0) setSelectedModel(installed[0].name);
    });
  }, []);

  useEffect(() => {
    if (sessionId) {
      api.getSession(sessionId).then(setCurrentSession).catch(console.error);
    } else {
      setCurrentSession(null);
    }
  }, [sessionId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages, streamData]);

  const loadSessions = () => api.chatSessions().then(setSessions);

  const handleNewSession = async () => {
    const s = await api.createSession();
    await loadSessions();
    navigate(`/chat/${s.id}`);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !sessionId || isStreaming || !selectedModel) return;

    const userMsg = { role: "user", content: input, id: Date.now().toString() };
    setCurrentSession(prev => ({ ...prev, messages: [...(prev.messages||[]), userMsg] }));
    setInput("");
    setIsStreaming(true);
    setStreamData("");

    try {
      const token = localStorage.getItem("solus.token");
      const res = await fetch(`${BASE}/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ content: userMsg.content, model: selectedModel, systemPrompt })
      });
      
      if (!res.ok) throw new Error("Failed to send message");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let streamed = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.delta) {
                  streamed += data.delta;
                  setStreamData(streamed);
                }
              } catch (err) {}
            } else if (line.startsWith("event: done")) {
              done = true;
              break;
            }
          }
        }
      }
      // Refresh session for final messages + title
      const updated = await api.getSession(sessionId);
      setCurrentSession(updated);
      await loadSessions(); // In case title changed
    } catch (err) {
      console.error(err);
      setCurrentSession(prev => ({ 
        ...prev, 
        messages: [...(prev.messages||[]), { role: "assistant", content: `Error: ${err.message}`, error: true }] 
      }));
    } finally {
      setIsStreaming(false);
      setStreamData("");
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Delete this chat?")) return;
    await api.deleteSession(id);
    await loadSessions();
    if (sessionId === id) navigate('/chat');
  };

  const startRename = (e, id, title) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(title);
  };

  const saveRename = async (e, id) => {
    e.stopPropagation();
    await api.renameSession(id, editTitle);
    setEditingId(null);
    loadSessions();
    if (sessionId === id) setCurrentSession(prev => ({...prev, title: editTitle}));
  };

  return (
    <div className="h-full flex" style={{ background: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <div className="w-64 border-r flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
        <div className="p-3">
          <button onClick={handleNewSession} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors" style={{ background: 'var(--brand-700)', color: 'white' }}>
            <MessageSquarePlus size={16} /> New Conversation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-1">
          {sessions.map(s => (
            <div 
              key={s.id} 
              className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer text-sm transition-colors ${sessionId === s.id ? 'bg-[var(--brand-100)]' : 'hover:bg-[var(--bg-base)]'}`}
              onClick={() => navigate(`/chat/${s.id}`)}
            >
              {editingId === s.id ? (
                <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                  <input autoFocus value={editTitle} onChange={e=>setEditTitle(e.target.value)} className="w-full text-xs px-1 py-0.5 rounded border outline-none text-black" onKeyDown={e => e.key === 'Enter' && saveRename(e, s.id)} />
                  <Check size={14} className="text-green-600 cursor-pointer" onClick={(e) => saveRename(e, s.id)} />
                  <X size={14} className="text-red-600 cursor-pointer" onClick={() => setEditingId(null)} />
                </div>
              ) : (
                <>
                  <div className="truncate flex-1 pr-2 font-medium" style={{ color: sessionId === s.id ? 'var(--brand-700)' : 'var(--text-primary)' }}>{s.title}</div>
                  <div className="hidden group-hover:flex items-center gap-1.5 shrink-0 text-[var(--text-tertiary)]">
                    <Edit2 size={13} className="hover:text-[var(--text-primary)]" onClick={(e) => startRename(e, s.id, s.title)} />
                    <Trash2 size={13} className="hover:text-red-500" onClick={(e) => handleDelete(e, s.id)} />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative">
        {models.length === 0 && (
          <div className="absolute top-0 left-0 right-0 p-3 bg-[var(--tier3)10] text-[var(--tier3)] text-sm flex items-center justify-center gap-2 border-b" style={{ borderColor: 'var(--tier3)30' }}>
            <AlertTriangle size={16} /> Ollama is not running or no models are installed. Go to Models to fix this.
          </div>
        )}

        {!sessionId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-tertiary)] gap-3">
            <Bot size={48} opacity={0.2} />
            <p>Select a conversation or start a new one.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
              <div className="max-w-3xl mx-auto flex flex-col gap-6">
                {(currentSession?.messages || []).map((msg, i) => (
                  <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[var(--brand-500)20]">
                        <Bot size={16} style={{ color: 'var(--brand-700)' }} />
                      </div>
                    )}
                    <div className={`px-4 py-3 rounded-2xl max-w-[85%] text-sm shadow-sm ${msg.role === 'user' ? 'bg-[var(--brand-700)] text-white rounded-br-none' : 'bg-[var(--bg-panel)] text-[var(--text-primary)] border rounded-bl-none'} ${msg.error ? 'border-red-400 bg-red-50' : 'border-[var(--border)]'}`}>
                      <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                      {msg.model && <div className="mt-2 pt-2 text-[10px] opacity-70 font-mono border-t border-black/10">Model: {msg.model}</div>}
                    </div>
                  </div>
                ))}
                {isStreaming && (
                  <div className="flex gap-4 justify-start">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[var(--brand-500)20]">
                      <Bot size={16} style={{ color: 'var(--brand-700)' }} />
                    </div>
                    <div className="px-4 py-3 rounded-2xl max-w-[85%] text-sm shadow-sm bg-[var(--bg-panel)] text-[var(--text-primary)] border border-[var(--border)] rounded-bl-none">
                      <div className="whitespace-pre-wrap leading-relaxed">{streamData}</div>
                      <span className="inline-block w-2 h-4 ml-1 align-middle bg-[var(--text-primary)] animate-pulse" />
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>
            </div>

            <div className="p-4 bg-[var(--bg-base)] border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="max-w-3xl mx-auto relative flex flex-col gap-2">
                <div className="flex gap-2 text-xs">
                  <select value={selectedModel} onChange={e=>setSelectedModel(e.target.value)} className="p-1 rounded border bg-[var(--bg-panel)] text-[var(--text-primary)]" style={{ borderColor: 'var(--border)' }}>
                    {models.map(m => <option key={m.name} value={m.name}>{m.displayName || m.name}</option>)}
                  </select>
                  <input type="text" placeholder="System prompt (optional)..." value={systemPrompt} onChange={e=>setSystemPrompt(e.target.value)} className="flex-1 p-1 rounded border px-2 bg-[var(--bg-panel)] text-[var(--text-primary)]" style={{ borderColor: 'var(--border)' }} />
                </div>
                <form onSubmit={handleSend} className="relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                    placeholder="Message agent..."
                    className="w-full rounded-xl border pl-4 pr-12 py-3 text-sm outline-none resize-none shadow-sm focus:shadow-[0_0_0_2px_var(--brand-200)]"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)', color: 'var(--text-primary)', minHeight: '60px', maxHeight: '200px' }}
                  />
                  <button type="submit" disabled={!input.trim() || isStreaming || !selectedModel} className="absolute right-3 bottom-3 p-2 rounded-lg bg-[var(--brand-700)] text-white disabled:opacity-50 transition-opacity">
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

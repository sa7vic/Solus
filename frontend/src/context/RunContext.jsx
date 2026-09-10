import { createContext, useCallback, useContext, useRef, useState } from 'react';

const RunContext = createContext(null);
const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export function RunProvider({ children }) {
  const [runId, setRunId] = useState(() => localStorage.getItem('solus.activeRunId') || null);
  const [status, setStatus] = useState('idle');
  const [trace, setTrace] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [agent, setAgent] = useState(null);
  const [task, setTask] = useState(null);
  const esRef = useRef(null);

  const startRun = useCallback(async (startPath, body, agentName) => {
    esRef.current?.close();
    setStatus('starting');
    setTrace([]);
    setResult(null);
    setError(null);
    setAgent(agentName || 'Agent');
    setTask(body?.task || (body?.sourceCode ? 'Code fix' : 'Task'));

    try {
      const token = localStorage.getItem('solus.token');
      let res;
      if (body instanceof FormData) {
        res = await fetch(`${BASE}${startPath}`, {
          method: 'POST',
          body,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      } else {
        res = await fetch(`${BASE}${startPath}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: body ? JSON.stringify(body) : undefined,
        });
      }

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || `Backend returned ${res.status}`);
      }

      const { runId: newRunId } = await res.json();
      setRunId(newRunId);
      localStorage.setItem('solus.activeRunId', newRunId);
      setStatus('running');

      const streamUrl = `${BASE}/run/${newRunId}/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      const es = new EventSource(streamUrl);
      esRef.current = es;
      es.onmessage = (e) => {
        const entry = JSON.parse(e.data);
        setTrace(t => [...t, entry]);
      };
      es.addEventListener('done', (e) => {
        const payload = JSON.parse(e.data);
        setStatus(payload.status);
        setResult(payload.result);
        if (payload.error) setError(payload.error);
        es.close();
      });
      es.onerror = () => {
        setStatus(s => s === 'running' ? 'error' : s);
        setError(e => typeof e === 'string' ? e : 'Lost connection to backend stream.');
        es.close();
      };
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }, []);

  const clearRun = useCallback(() => {
    esRef.current?.close();
    setRunId(null);
    setStatus('idle');
    setTrace([]);
    setResult(null);
    setError(null);
    localStorage.removeItem('solus.activeRunId');
  }, []);

  return (
    <RunContext.Provider value={{ runId, status, trace, result, error, agent, task, startRun, clearRun }}>
      {children}
    </RunContext.Provider>
  );
}

export function useRun() {
  const ctx = useContext(RunContext);
  if (!ctx) throw new Error('useRun must be used within RunProvider');
  return ctx;
}

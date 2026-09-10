import { useCallback, useRef, useState } from "react";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

// Starts a real backend run (POST, optional JSON body) and streams its real
// trace via SSE. This is not a UI simulation — if the backend/Ollama isn't
// reachable, this surfaces a real connection error rather than falling
// back to fake data. `start` can be called repeatedly with a fresh task.
export function useAgentRun() {
  const [status, setStatus] = useState("idle"); // idle | starting | running | done | error
  const [trace, setTrace] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const esRef = useRef(null);

  const start = useCallback(async (startPath, body) => {
    esRef.current?.close();
    setStatus("starting");
    setTrace([]);
    setResult(null);
    setError(null);
    try {
      const token = localStorage.getItem("solus.token");
      const res = await fetch(`${BASE}${startPath}`, {
        method: "POST",
        headers: {
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || `Backend returned ${res.status} — is it running on ${BASE}?`);
      }
      const { runId } = await res.json();
      setStatus("running");

      // EventSource can't set an Authorization header, so the token travels
      // as a query param here — the backend's auth middleware accepts either.
      const streamUrl = `${BASE}/run/${runId}/stream${token ? `?token=${encodeURIComponent(token)}` : ""}`;
      const es = new EventSource(streamUrl);
      esRef.current = es;
      es.onmessage = (e) => {
        const entry = JSON.parse(e.data);
        setTrace((t) => [...t, entry]);
      };
      es.addEventListener("done", (e) => {
        const payload = JSON.parse(e.data);
        setStatus(payload.status);
        setResult(payload.result);
        if (payload.error) setError(payload.error);
        es.close();
      });
      es.onerror = () => {
        setStatus((s) => (s === "running" ? "error" : s));
        setError((e) => e || "Lost connection to the backend stream.");
        es.close();
      };
    } catch (err) {
      setStatus("error");
      setError(err.message);
    }
  }, []);

  return { status, trace, result, error, start };
}

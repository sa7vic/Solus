// Thin fetch wrapper around the dummy backend. Every function falls back to
// an in-memory "offline store" seeded from bundled mock data if the backend
// isn't reachable, so the frontend still renders — and still behaves —
// standalone. The offline store is real (mutable, per-session) state, not
// static constants re-returned by reference: without that, toggling a
// plugin, downloading a model, or creating a workspace offline would never
// re-render, because React bails out on a setState call with the same
// object reference.

import {
  FALLBACK_ROLES, FALLBACK_MODELS, FALLBACK_PLUGINS, FALLBACK_AUDIT,
  FALLBACK_DEMO_ACCOUNTS, FALLBACK_WORKSPACES,
} from "../data/fallback.js";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

async function safeFetch(path, opts, fallbackFn) {
  try {
    const token = localStorage.getItem("solus.token");
    const res = await fetch(`${BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...opts,
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[api] ${path} unreachable, using offline store:`, err.message);
    return typeof fallbackFn === "function" ? fallbackFn() : fallbackFn;
  }
}

// ---- offline store: mutable clones, never the imported constants ----
const offline = {
  models: FALLBACK_MODELS.map((m) => ({ ...m, _progress: m.installed ? 100 : 0 })),
  plugins: FALLBACK_PLUGINS.map((p) => ({ ...p })),
  // role -> array of full workspace objects {id, name, createdAt, lastActive, trace, evidence, files}
  workspaces: Object.fromEntries(
    Object.entries(FALLBACK_WORKSPACES).map(([role, list]) => [
      role,
      list.map((ws) => ({
        ...ws,
        trace: [...ws.trace],
        evidence: [...ws.evidence],
        files: Object.fromEntries(Object.entries(ws.files).map(([k, v]) => [k, [...v]])),
      })),
    ])
  ),
  audit: [...FALLBACK_AUDIT],
  downloadTimers: {},
};

function classify(filename) {
  const f = filename.toLowerCase();
  if (f.includes("financ") || f.includes("confidential") || f.includes("strategy")) {
    return { tier: null, status: "pending_review", reason: "Ambiguous / high-sensitivity filename — Tier 3 is never auto-assigned." };
  }
  if (f.includes("sop") || f.includes("inspection") || f.includes("incident") || f.includes("quote")) {
    return { tier: 2, status: "classified", reason: "Matched a restricted-document pattern." };
  }
  return { tier: 1, status: "classified", reason: "No restricted/confidential pattern matched." };
}

function summarize(ws) {
  return {
    id: ws.id,
    name: ws.name,
    createdAt: ws.createdAt,
    lastActive: ws.lastActive,
    generatedCount: (ws.files?.Generated || []).length,
    uploadsCount: (ws.files?.Uploads || []).length,
  };
}

export const api = {
  login: (username, password) =>
    safeFetch("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }, () => null),

  demoAccounts: () => safeFetch("/auth/demo-accounts", {}, () => FALLBACK_DEMO_ACCOUNTS),

  roles: () => safeFetch("/roles", {}, () => FALLBACK_ROLES),

  listWorkspaces: (roleId) =>
    safeFetch(`/workspaces/${roleId}`, {}, () => {
      const list = offline.workspaces[roleId] || [];
      return list.map(summarize).sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive));
    }),

  getWorkspace: (roleId, workspaceId) =>
    safeFetch(`/workspaces/${roleId}/${workspaceId}`, {}, () => {
      const ws = (offline.workspaces[roleId] || []).find((w) => w.id === workspaceId);
      if (!ws) return null;
      ws.lastActive = new Date().toISOString();
      return { ...ws };
    }),

  createWorkspace: (roleId, name) =>
    safeFetch(`/workspaces/${roleId}`, { method: "POST", body: JSON.stringify({ name }) }, () => {
      const list = offline.workspaces[roleId];
      if (!list) return null;
      const kb = list[0]?.files?.["Knowledge Base"] ?? [];
      const now = new Date().toISOString();
      const ws = {
        id: `ws_${Date.now().toString(36)}`,
        name,
        createdAt: now,
        lastActive: now,
        trace: [],
        evidence: [],
        files: { "Knowledge Base": [...kb], "Uploads": [], "Generated": [] },
      };
      list.push(ws);
      return ws;
    }),

  searchWorkspaces: (roleId, query) =>
    safeFetch(`/search/${roleId}?q=${encodeURIComponent(query)}`, {}, () => {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      const list = offline.workspaces[roleId] || [];
      const results = [];
      for (const ws of list) {
        if (ws.name.toLowerCase().includes(q)) {
          results.push({ workspaceId: ws.id, workspaceName: ws.name, type: "workspace", snippet: ws.name });
        }
        for (const folder of ["Uploads", "Generated"]) {
          for (const f of ws.files?.[folder] || []) {
            if (f.name.toLowerCase().includes(q)) {
              results.push({ workspaceId: ws.id, workspaceName: ws.name, type: "file", snippet: `${folder}/${f.name}` });
            }
          }
        }
        for (const t of ws.trace || []) {
          if (t.text.toLowerCase().includes(q)) {
            results.push({ workspaceId: ws.id, workspaceName: ws.name, type: "trace", snippet: `${t.agent}: ${t.text}` });
          }
        }
      }
      return results.slice(0, 25);
    }),

  uploadFile: async (roleId, workspaceId, file) => {
    try {
      const form = new FormData();
      form.append("file", file);
      const token = localStorage.getItem("solus.token");
      const res = await fetch(`${BASE}/workspaces/${roleId}/${workspaceId}/upload`, {
        method: "POST",
        body: form,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`${res.status}`);
      return await res.json();
    } catch (err) {
      const classification = classify(file.name);
      const ws = (offline.workspaces[roleId] || []).find((w) => w.id === workspaceId);
      if (ws) {
        ws.files.Uploads = [...ws.files.Uploads, { name: file.name, tier: classification.tier, status: classification.status }];
        ws.lastActive = new Date().toISOString();
      }
      return { file: file.name, ...classification, reason: `${classification.reason} (offline store)` };
    }
  },

  plugins: () => safeFetch("/plugins", {}, () => [...offline.plugins]),

  togglePlugin: (id, installed) =>
    safeFetch(`/plugins/${id}`, { method: "PATCH", body: JSON.stringify({ installed }) }, () => {
      const p = offline.plugins.find((x) => x.id === id);
      if (p) p.installed = installed;
      return p ?? { id, installed };
    }),

  models: () => safeFetch("/models", {}, () => [...offline.models]),

  startDownload: (name) =>
    safeFetch(`/models/${name}/download`, { method: "POST" }, () => {
      const m = offline.models.find((x) => x.name === name);
      if (!m || m.installed) return { status: "already_installed" };
      clearInterval(offline.downloadTimers[name]);
      m._progress = 0;
      offline.downloadTimers[name] = setInterval(() => {
        m._progress = Math.min(100, m._progress + Math.round(8 + Math.random() * 12));
        if (m._progress >= 100) {
          clearInterval(offline.downloadTimers[name]);
          m.installed = true;
        }
      }, 400);
      return { status: "started" };
    }),

  modelStatus: (name) =>
    safeFetch(`/models/${name}/status`, {}, () => {
      const m = offline.models.find((x) => x.name === name);
      if (!m) return null;
      return { installed: m.installed, progress: m.installed ? 100 : m._progress };
    }),

  audit: () => safeFetch("/audit", {}, () => [...offline.audit]),

  appendAudit: (entry) =>
    safeFetch("/audit", { method: "POST", body: JSON.stringify(entry) }, () => {
      const saved = { t: new Date().toTimeString().slice(0, 8), ...entry, hash: `${Math.random().toString(16).slice(2, 6)}....${Math.random().toString(16).slice(2, 6)}` };
      offline.audit.unshift(saved);
      return saved;
    }),

  // Distinct from safeFetch's pattern on purpose: a real 401 (bad/expired
  // token) and a network failure (backend not running) need different
  // outcomes — the first should log the user out, the second shouldn't
  // (offline mode is intentionally supported for the six-role UI shell).
  verifyToken: async () => {
    const token = localStorage.getItem("solus.token");
    if (!token) return { ok: false, offline: false };
    try {
      const res = await fetch(`${BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) return { ok: false, offline: false };
      return { ok: res.ok, offline: false };
    } catch {
      return { ok: false, offline: true };
    }
  },

  // Chat
  chatSessions: () => safeFetch("/chat/sessions", {}, () => []),
  createSession: (title) => safeFetch("/chat/sessions", { method: "POST", body: JSON.stringify({ title }) }, () => ({ id: `chat_${Date.now()}`, title: title || "New conversation", messages: [], createdAt: new Date().toISOString() })),
  getSession: (id) => safeFetch(`/chat/sessions/${id}`, {}, () => null),
  deleteSession: (id) => safeFetch(`/chat/sessions/${id}`, { method: "DELETE" }, () => ({ ok: true })),
  renameSession: (id, title) => safeFetch(`/chat/sessions/${id}`, { method: "PATCH", body: JSON.stringify({ title }) }, () => ({ id, title })),

  // KB
  kbCollections: () => safeFetch("/kb/collections", {}, () => []),
  createKbCollection: (name) => safeFetch("/kb/collections", { method: "POST", body: JSON.stringify({ name }) }, () => ({ id: name.toLowerCase().replace(/\s+/g, "_"), name })),
  kbSearch: (q, collection) => safeFetch(`/kb/search?q=${encodeURIComponent(q)}${collection ? `&collection=${collection}` : ""}`, {}, () => []),
  kbPassage: (collectionId, docId, q) => safeFetch(`/kb/passage/${collectionId}/${encodeURIComponent(docId)}${q ? `?q=${encodeURIComponent(q)}` : ""}`, {}, () => null),
  deleteKbDoc: (collectionId, name) => safeFetch(`/kb/collections/${collectionId}/documents/${encodeURIComponent(name)}`, { method: "DELETE" }, () => ({ ok: true })),

  // Models (real registry)
  modelRegistry: () => safeFetch("/models/registry", {}, () => ({ models: [], assignments: {} })),
  addToRegistry: (data) => safeFetch("/models/registry", { method: "POST", body: JSON.stringify(data) }, () => ({})),
  removeFromRegistry: (name) => safeFetch(`/models/registry/${encodeURIComponent(name)}`, { method: "DELETE" }, () => ({})),
  setModelAssignment: (name, capability) => safeFetch(`/models/registry/${encodeURIComponent(name)}/use`, { method: "POST", body: JSON.stringify({ capability }) }, () => ({})),

  // Runs
  listRuns: () => safeFetch("/runs", {}, () => []),
  getRunDetail: (id) => safeFetch(`/run/${id}`, {}, () => null),

  // Workspace folder/file ops
  createFolder: (roleId, workspaceId, name) => safeFetch(`/workspaces/${roleId}/${workspaceId}/folders`, { method: "POST", body: JSON.stringify({ name }) }, () => ({ name })),
  deleteFolder: (roleId, workspaceId, name) => safeFetch(`/workspaces/${roleId}/${workspaceId}/folders/${encodeURIComponent(name)}`, { method: "DELETE" }, () => ({ ok: true })),
  deleteFile: (roleId, workspaceId, folder, filename) => safeFetch(`/workspaces/${roleId}/${workspaceId}/files/${encodeURIComponent(folder)}/${encodeURIComponent(filename)}`, { method: "DELETE" }, () => ({ ok: true })),

  // System & Air-Gap Watchdog
  systemInfo: () => safeFetch("/system/info", {}, () => ({ cpu: {}, memory: {}, gpu: { available: false }, ollama: { reachable: false, installedModels: [] } })),
  ollamaHealth: () => safeFetch("/ollama/health", {}, () => ({ reachable: false })),
  networkStats: () => safeFetch("/network/stats", {}, () => ({ wan_outbound_bytes: 0, airgap_active: true, blocked_external_attempts: 0, status: "SECURE" })),
  networkLog: () => safeFetch("/network/log", {}, () => []),

  // Blueprint & OCR Agents
  analyzeBlueprint: async (formData) => {
    const token = localStorage.getItem("solus.token");
    const res = await fetch(`${BASE}/run/analyze-blueprint`, {
      method: "POST",
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    return await res.json();
  },
  ocrPdf: async (formData) => {
    const token = localStorage.getItem("solus.token");
    const res = await fetch(`${BASE}/run/ocr-pdf`, {
      method: "POST",
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    return await res.json();
  },
};

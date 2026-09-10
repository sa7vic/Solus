import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "./AuthContext.jsx";
import { FALLBACK_ROLES } from "../data/fallback.js";

const WorkbenchContext = createContext(null);

function storageKey(role) {
  return `solus.workspaceId.${role}`;
}

export function WorkbenchProvider({ children }) {
  const { effectiveRole } = useAuth();
  const [roles, setRoles] = useState(FALLBACK_ROLES);
  const [workspaceList, setWorkspaceList] = useState([]);
  const [workspace, setWorkspace] = useState({ trace: [], evidence: [], files: {} });
  const [models, setModels] = useState([]);
  const [plugins, setPlugins] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.roles().then(setRoles);
    api.models().then(setModels);
    api.plugins().then(setPlugins);
    api.audit().then(setAudit);
  }, []);

  const openWorkspace = useCallback(
    async (roleId, workspaceId) => {
      const ws = await api.getWorkspace(roleId, workspaceId);
      if (ws) {
        setWorkspace(ws);
        localStorage.setItem(storageKey(roleId), workspaceId);
      }
    },
    []
  );

  useEffect(() => {
    if (!effectiveRole) return;
    let cancelled = false;
    setLoading(true);
    api.listWorkspaces(effectiveRole).then(async (list) => {
      if (cancelled) return;
      setWorkspaceList(list);
      const stored = localStorage.getItem(storageKey(effectiveRole));
      const target = list.find((w) => w.id === stored) || list[0];
      if (target) await openWorkspace(effectiveRole, target.id);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [effectiveRole, openWorkspace]);

  const role = roles.find((r) => r.id === effectiveRole) || roles[0];

  const switchWorkspace = useCallback(
    async (workspaceId) => {
      if (!effectiveRole) return;
      await openWorkspace(effectiveRole, workspaceId);
      const list = await api.listWorkspaces(effectiveRole);
      setWorkspaceList(list);
    },
    [effectiveRole, openWorkspace]
  );

  const createWorkspace = useCallback(
    async (name) => {
      if (!effectiveRole) return null;
      const ws = await api.createWorkspace(effectiveRole, name);
      if (ws) {
        await switchWorkspace(ws.id);
      }
      return ws;
    },
    [effectiveRole, switchWorkspace]
  );

  const searchWorkspaces = useCallback(
    (query) => (effectiveRole ? api.searchWorkspaces(effectiveRole, query) : Promise.resolve([])),
    [effectiveRole]
  );

  const refreshWorkspace = useCallback(() => {
    if (!effectiveRole || !workspace?.id) return;
    openWorkspace(effectiveRole, workspace.id);
  }, [effectiveRole, workspace?.id, openWorkspace]);

  const refreshModels = useCallback(() => {
    api.models().then(setModels);
  }, []);

  const refreshPlugins = useCallback(() => {
    api.plugins().then(setPlugins);
  }, []);

  const logAudit = useCallback(async (entry) => {
    const saved = await api.appendAudit(entry);
    setAudit((a) => [saved, ...a]);
  }, []);

  return (
    <WorkbenchContext.Provider
      value={{
        role, roles, workspace, workspaceList, models, plugins, audit, loading,
        switchWorkspace, createWorkspace, searchWorkspaces,
        refreshWorkspace, refreshModels, refreshPlugins, logAudit,
      }}
    >
      {children}
    </WorkbenchContext.Provider>
  );
}

export function useWorkbench() {
  const ctx = useContext(WorkbenchContext);
  if (!ctx) throw new Error("useWorkbench must be used within WorkbenchProvider");
  return ctx;
}

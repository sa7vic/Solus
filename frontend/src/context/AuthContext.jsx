import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginAt, setLoginAt] = useState(null);
  // Admin-only: which role the cross-role admin is currently viewing.
  const [adminViewRole, setAdminViewRole] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("solus.user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        setLoginAt(Number(localStorage.getItem("solus.loginAt")) || Date.now());
        if (parsed.crossRole) setAdminViewRole(localStorage.getItem("solus.adminViewRole") || "inspection");

        // Confirm the stored token is still genuinely valid (not expired/
        // tampered) rather than assuming it — but don't punish being
        // offline: only a real 401 forces logout.
        api.verifyToken().then(({ ok, offline }) => {
          if (!ok && !offline) logout();
        });
      } catch {
        localStorage.removeItem("solus.user");
      }
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(username, password) {
    const result = await api.login(username, password);
    if (!result || !result.user) {
      throw new Error(result?.error || "Invalid username or password.");
    }
    const now = Date.now();
    setUser(result.user);
    setLoginAt(now);
    localStorage.setItem("solus.user", JSON.stringify(result.user));
    localStorage.setItem("solus.token", result.token);
    localStorage.setItem("solus.loginAt", String(now));
    if (result.user.crossRole) {
      setAdminViewRole("inspection");
      localStorage.setItem("solus.adminViewRole", "inspection");
    }
    return result.user;
  }

  function logout() {
    setUser(null);
    setLoginAt(null);
    setAdminViewRole(null);
    localStorage.removeItem("solus.user");
    localStorage.removeItem("solus.token");
    localStorage.removeItem("solus.loginAt");
    localStorage.removeItem("solus.adminViewRole");
  }

  function setAdminRole(roleId) {
    setAdminViewRole(roleId);
    localStorage.setItem("solus.adminViewRole", roleId);
  }

  // The role actually rendered: an admin can switch (every switch is
  // auditable — see AuditDrawer); every other account is locked to the
  // single role on their account record.
  const effectiveRole = user?.crossRole ? adminViewRole : user?.role;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, effectiveRole, setAdminRole, isAdmin: !!user?.crossRole, loginAt }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

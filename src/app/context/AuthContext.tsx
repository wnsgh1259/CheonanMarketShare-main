import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router";
import { setOwnerMode } from "../components/BottomNav";
import {
  clearAuthSession,
  loginAsAdminShortcut,
  loginAsGuest,
  loginAsRegisteredUser,
  loginWithCredentials,
  readAuthSession,
  type AuthSession,
  type LoginResult,
} from "../data/authSession";
import type { RegisteredUser } from "../data/userAccounts";

type AuthContextValue = {
  session: AuthSession;
  login: (phoneDigits: string, pin: string) => LoginResult;
  loginAsUser: (user: RegisteredUser) => LoginResult;
  loginAdminShortcut: () => LoginResult;
  enterGuest: () => LoginResult;
  logout: () => void;
  refresh: () => void;
  isAdmin: boolean;
  isOwner: boolean;
  isCustomer: boolean;
  isGuest: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession>(() => readAuthSession());
  const location = useLocation();

  const refresh = useCallback(() => {
    setSession(readAuthSession());
  }, []);

  useEffect(() => {
    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  useEffect(() => {
    setSession(readAuthSession());
  }, [location.pathname]);

  const login = useCallback((phoneDigits: string, pin: string) => {
    const result = loginWithCredentials(phoneDigits, pin);
    if (result.ok) {
      setOwnerMode(false);
      setSession(readAuthSession());
    }
    return result;
  }, []);

  const loginAsUser = useCallback((user: RegisteredUser) => {
    const result = loginAsRegisteredUser(user);
    if (result.ok) {
      setOwnerMode(false);
    }
    return result;
  }, []);

  const loginAdminShortcut = useCallback(() => {
    const result = loginAsAdminShortcut();
    if (result.ok) {
      setOwnerMode(false);
      setSession(readAuthSession());
    }
    return result;
  }, []);

  const enterGuest = useCallback(() => {
    setOwnerMode(false);
    const result = loginAsGuest();
    setSession(readAuthSession());
    return result;
  }, []);

  const logout = useCallback(() => {
    setOwnerMode(false);
    clearAuthSession();
    setSession(readAuthSession());
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    login,
    loginAsUser,
    loginAdminShortcut,
    enterGuest,
    logout,
    refresh,
    isAdmin: session.role === "admin",
    isOwner: session.role === "owner" && session.status === "active",
    isCustomer: session.role === "customer",
    isGuest: session.role === "guest",
  }), [session, login, loginAsUser, loginAdminShortcut, enterGuest, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

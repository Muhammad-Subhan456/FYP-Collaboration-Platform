"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { bootstrapAuthUser, clearStoredToken } from "@/lib/auth";
import { resetAppState } from "@/store";
import { useAppDispatch } from "@/store/hooks";
import { authService } from "@/services/auth.service";
import { profileService } from "@/services/profile.service";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { UserProfile } from "@/types/profile";
import type { AuthUser, UserRole } from "@/types";

interface AuthContextValue {
  user: AuthUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    fullName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  selectContext: (workspaceId: string, role: UserRole) => Promise<void>;
  switchContext: (workspaceId: string, role: UserRole) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<UserProfile | null>;
  syncSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const {
    login: sessionLogin,
    selectContext: sessionSelectContext,
    switchContext: sessionSwitchContext,
    clearUserQueries,
  } = useAuthSession();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const bootstrapStarted = useRef(false);

  const loadProfile = useCallback(async () => {
    try {
      const data = await profileService.getMyProfile();
      setProfile(data);
      return data;
    } catch {
      setProfile(null);
      return null;
    }
  }, []);

  const syncSession = useCallback(async () => {
    const authUser = bootstrapAuthUser();
    if (!authUser) {
      setUser(null);
      setProfile(null);
      return;
    }

    setUser(authUser);

    if (authUser.role === "SUPER_ADMIN") {
      setProfile(null);
      return;
    }

    await loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (bootstrapStarted.current) return;
    bootstrapStarted.current = true;

    let cancelled = false;

    async function bootstrap() {
      await syncSession();
      if (!cancelled) {
        setIsLoading(false);
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [syncSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      await sessionLogin(email, password);
      await syncSession();
    },
    [sessionLogin, syncSession],
  );

  const selectContext = useCallback(
    async (workspaceId: string, role: UserRole) => {
      // Workspace switch must isolate all workspace-scoped UI state.
      resetAppState(dispatch);
      await sessionSelectContext(workspaceId, role);
      await syncSession();
    },
    [dispatch, sessionSelectContext, syncSession],
  );

  const switchContext = useCallback(
    async (workspaceId: string, role: UserRole) => {
      // Workspace switch must isolate all workspace-scoped UI state.
      resetAppState(dispatch);
      await sessionSwitchContext(workspaceId, role);
      await syncSession();
    },
    [dispatch, sessionSwitchContext, syncSession],
  );

  const register = useCallback(
    async (data: {
      fullName: string;
      email: string;
      password: string;
    }) => {
      await authService.register(data);
    },
    [],
  );

  const logout = useCallback(() => {
    clearUserQueries();
    resetAppState(dispatch);
    clearStoredToken();
    setUser(null);
    setProfile(null);
    router.push("/auth/login");
  }, [clearUserQueries, dispatch, router]);

  const value = useMemo(
    () => ({
      user,
      profile,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      selectContext,
      switchContext,
      logout,
      refreshProfile: loadProfile,
      syncSession,
    }),
    [
      user,
      profile,
      isLoading,
      login,
      register,
      selectContext,
      switchContext,
      logout,
      loadProfile,
      syncSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

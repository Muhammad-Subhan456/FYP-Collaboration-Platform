"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  clearStoredToken,
  decodeToken,
  getDashboardPath,
  getStoredToken,
  isTokenExpired,
  setStoredToken,
} from "@/lib/auth";
import { authService } from "@/services/auth.service";
import { profileService } from "@/services/profile.service";
import { getOnboardingPath } from "@/constants/navigation";
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
  logout: () => void;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const bootstrap = useCallback(async () => {
    const token = getStoredToken();
    if (!token || isTokenExpired(token)) {
      clearStoredToken();
      setUser(null);
      setProfile(null);
      setIsLoading(false);
      return;
    }

    const payload = decodeToken(token);
    if (!payload) {
      clearStoredToken();
      setIsLoading(false);
      return;
    }

    setUser({
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    });

    await loadProfile();
    setIsLoading(false);
  }, [loadProfile]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { accessToken } = await authService.login({ email, password });
      setStoredToken(accessToken);

      const payload = decodeToken(accessToken);
      if (!payload) throw new Error("Invalid token received");

      const authUser: AuthUser = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      setUser(authUser);

      const existingProfile = await loadProfile();
      if (!existingProfile) {
        router.push(getOnboardingPath(authUser.role));
        return;
      }

      router.push(getDashboardPath(authUser.role));
    },
    [loadProfile, router],
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
    clearStoredToken();
    setUser(null);
    setProfile(null);
    router.push("/auth/login");
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      profile,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      refreshProfile: loadProfile,
    }),
    [user, profile, isLoading, login, register, logout, loadProfile],
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

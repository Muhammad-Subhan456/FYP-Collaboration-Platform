"use client";

import { Toaster } from "sonner";

import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";
import { RealtimeProvider } from "@/providers/realtime-provider";
import { StoreProvider } from "@/providers/store-provider";
import { ThemeProvider } from "@/providers/theme-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <StoreProvider>
          <AuthProvider>
            <RealtimeProvider>
              {children}
              <Toaster richColors position="top-right" closeButton />
            </RealtimeProvider>
          </AuthProvider>
        </StoreProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}

import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { clearStoredToken, getStoredToken } from "@/lib/auth";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string | string[] }>) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      clearStoredToken();
      if (!window.location.pathname.startsWith("/auth")) {
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(error: unknown): string {
  const fallback = "Something went wrong. Please try again.";

  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined;
    const message = data?.message;

    if (Array.isArray(message) && message.length > 0) {
      return message.filter((part) => typeof part === "string").join(", ");
    }

    if (typeof message === "string" && message.trim()) {
      const trimmed = message.trim();
      if (
        trimmed === "Internal server error" ||
        trimmed === "Internal Server Error"
      ) {
        return fallback;
      }
      return trimmed.length > 300 ? `${trimmed.slice(0, 297)}…` : trimmed;
    }

    if (error.response?.status === 403) {
      return "You do not have permission to perform this action";
    }
    if (error.response?.status === 404) {
      return "Resource not found";
    }
    if (error.response?.status === 409) {
      return "A conflicting record already exists";
    }

    return fallback;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
}

export default api;

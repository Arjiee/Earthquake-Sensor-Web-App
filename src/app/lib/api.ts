// Thin REST client for the SEERS backend. Every call returns typed data or
// throws. Callers handle failures (e.g. backend offline in the preview).

import { API_BASE_URL } from "./config";
import type { AdminUser, EarthquakeEvent, LogEntry, Student, SystemStatus } from "./types";

const TOKEN_KEY = "seers_token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.error || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  // --- Auth ---
  login: (username: string, password: string) =>
    request<{ token: string; user: AdminUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  me: () => request<AdminUser>("/api/auth/me"),

  // --- Students ---
  listStudents: () => request<Student[]>("/api/students"),
  addStudent: (s: { id: string; name: string; yearSection: string }) =>
    request<Student>("/api/students", { method: "POST", body: JSON.stringify(s) }),
  updateStudent: (id: string, s: { name: string; yearSection: string }) =>
    request<Student>(`/api/students/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(s),
    }),
  deleteStudent: (id: string) =>
    request<void>(`/api/students/${encodeURIComponent(id)}`, { method: "DELETE" }),
  // Face enrollment: images are JPEG data URLs captured from the webcam.
  enrollFace: (id: string, images: string[]) =>
    request<{ saved: number; student: Student }>(`/api/students/${encodeURIComponent(id)}/enroll`, {
      method: "POST",
      body: JSON.stringify({ images }),
    }),
  clearFace: (id: string) =>
    request<Student>(`/api/students/${encodeURIComponent(id)}/enroll`, { method: "DELETE" }),
  // Mark a student safe manually (QR / manual override).
  markSafe: (id: string, method: "qr" | "manual") =>
    request<Student>(`/api/students/${encodeURIComponent(id)}/safe`, {
      method: "POST",
      body: JSON.stringify({ method }),
    }),

  // --- System ---
  status: () => request<SystemStatus>("/api/status"),
  logs: () => request<LogEntry[]>("/api/logs"),
  earthquakes: () => request<EarthquakeEvent[]>("/api/earthquakes"),
  resetEvent: () => request<void>("/api/earthquakes/reset", { method: "POST" }),
};

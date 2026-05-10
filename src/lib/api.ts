export type ApiEnvelope<T> = {
  success: boolean;
  path: string;
  timestamp: string;
  data: T;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001/v1";
const TOKEN_KEY = "distribev.accessToken";
const REFRESH_KEY = "distribev.refreshToken";
const USER_KEY = "distribev.user";

const isBrowser = typeof window !== "undefined";

export function getStoredAuth() {
  if (!isBrowser) {
    return { accessToken: null, refreshToken: null, user: null };
  }

  const userJson = window.localStorage.getItem(USER_KEY);

  return {
    accessToken: window.localStorage.getItem(TOKEN_KEY),
    refreshToken: window.localStorage.getItem(REFRESH_KEY),
    user: userJson ? (JSON.parse(userJson) as AuthUser) : null,
  };
}

export function storeAuth(auth: LoginResponse) {
  if (!isBrowser) {
    return;
  }

  window.localStorage.setItem(TOKEN_KEY, auth.accessToken);
  window.localStorage.setItem(REFRESH_KEY, auth.refreshToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
}

export function clearAuth() {
  if (!isBrowser) {
    return;
  }

  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const { accessToken } = getStoredAuth();
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | { message?: string } | null;

  if (!response.ok) {
    if (response.status === 401) {
      clearAuth();
    }

    const message = payload && "message" in payload ? payload.message : "Falha na comunicacao com a API";
    throw new Error(message ?? "Falha na comunicacao com a API");
  }

  if (!payload || !("data" in payload)) {
    return payload as T;
  }

  return payload.data;
}

export function apiGet<T>(path: string) {
  return apiRequest<T>(path);
}

export function apiPost<T>(path: string, body: unknown) {
  return apiRequest<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function apiPatch<T>(path: string, body: unknown = {}) {
  return apiRequest<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function apiDelete<T>(path: string) {
  return apiRequest<T>(path, {
    method: "DELETE",
  });
}

export function login(email: string, password: string) {
  return apiPost<LoginResponse>("/auth/login", { email, password });
}

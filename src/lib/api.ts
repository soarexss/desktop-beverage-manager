export type ApiEnvelope<T> = { success: boolean; data: T };

export type AuthUser = { id: string; name: string; email: string; role: string };

export type LoginResponse = { user: AuthUser };

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001/v1";

let currentUser: AuthUser | null = null;

let refreshing: Promise<boolean> | null = null;

export function getStoredAuth() {
  return { user: currentUser };
}

export function clearAuth() {
  currentUser = null;

  if (typeof window !== "undefined")
    for (const key of ["distribev.accessToken", "distribev.refreshToken", "distribev.user"])
      window.localStorage.removeItem(key);
}

export function storeAuth(auth: LoginResponse) {
  clearAuth();
  currentUser = auth.user;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  retried = false,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
      signal: options.signal ?? AbortSignal.timeout(20000),
    });
  } catch {
    throw new Error("Servidor indisponível. Confira sua conexão e tente novamente.");
  }

  if (response.status === 401 && !["/auth/login", "/auth/refresh"].includes(path) && !retried) {
    refreshing ??= fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      signal: AbortSignal.timeout(15000),
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });

    if (await refreshing) return apiRequest<T>(path, options, true);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && path !== "/auth/login") {
      clearAuth();
      if (typeof window !== "undefined") window.dispatchEvent(new Event("erp-session-expired"));
    }

    const record =
      payload && typeof payload === "object"
        ? (payload as { message?: unknown; error?: { message?: unknown } })
        : null;

    const message = record?.error?.message ?? record?.message;

    throw new Error(
      Array.isArray(message)
        ? message.join("; ")
        : typeof message === "string"
          ? message
          : `Não foi possível concluir (${response.status})`,
    );
  }

  return (
    payload && typeof payload === "object" && "data" in payload ? payload.data : payload
  ) as T;
}

export function apiGet<T>(path: string) {
  return apiRequest<T>(path);
}

export function apiPost<T>(path: string, body: unknown) {
  return apiRequest<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function apiPatch<T>(path: string, body: unknown = {}) {
  return apiRequest<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export function apiDelete<T>(path: string) {
  return apiRequest<T>(path, { method: "DELETE" });
}

export function login(email: string, password: string) {
  return apiPost<LoginResponse>("/auth/login", { email, password });
}

let restoringSession: Promise<AuthUser> | null = null;
export function restoreSession() {
  restoringSession ??= apiPost("/auth/refresh", {})
    .then(() => apiGet<AuthUser>("/auth/me"))
    .finally(() => {
      restoringSession = null;
    });
  return restoringSession;
}

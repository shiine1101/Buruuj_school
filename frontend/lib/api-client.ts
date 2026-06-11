const TOKEN_KEY = "buruuj_access_token";
const REFRESH_TOKEN_KEY = "buruuj_refresh_token";
const USER_KEY = "buruuj_auth_user";
const DEFAULT_BACKEND_URL = "https://zealous-empathy-production-1b10.up.railway.app";

type BackendRole = "ADMIN" | "FINANCIAL_OFFICER" | "DRIVER" | "PARENT";

type JwtPayload = {
  sub: string;
  email: string;
  role: BackendRole;
  exp?: number;
};

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: BackendRole;
};

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string, persist = false) {
  const primary = persist ? localStorage : sessionStorage;
  const secondary = persist ? sessionStorage : localStorage;
  secondary.removeItem(TOKEN_KEY);
  primary.setItem(TOKEN_KEY, token);
}

export function setRefreshToken(token: string, persist = false) {
  const primary = persist ? localStorage : sessionStorage;
  const secondary = persist ? sessionStorage : localStorage;
  secondary.removeItem(REFRESH_TOKEN_KEY);
  primary.setItem(REFRESH_TOKEN_KEY, token);
}

function setStoredAuthUser(user: AuthUser, persist = false) {
  const primary = persist ? localStorage : sessionStorage;
  const secondary = persist ? sessionStorage : localStorage;
  secondary.removeItem(USER_KEY);
  primary.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const value = sessionStorage.getItem(USER_KEY) ?? localStorage.getItem(USER_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as AuthUser;
  } catch {
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function clearAccessToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(USER_KEY);
}

function forceLogout() {
  clearAccessToken();
  if (typeof window !== "undefined" && window.location.pathname !== "/") {
    window.location.href = "/";
  }
}

export function getApiBaseUrl(): string {
  return "";
}

export function getSocketBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SOCKET_URL ?? process.env.NEXT_PUBLIC_API_URL;
  return (url ?? DEFAULT_BACKEND_URL).replace(/\/$/, "");
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return atob(padded);
}

export function getBackendAuthSession(): JwtPayload | null {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    const session = JSON.parse(decodeBase64Url(payload)) as JwtPayload;
    if (!session.sub || !session.email || !session.role) return null;
    if (session.exp && session.exp * 1000 <= Date.now()) {
      clearAccessToken();
      return null;
    }

    return session;
  } catch {
    clearAccessToken();
    return null;
  }
}

async function readErrorMessage(response: Response) {
  const fallback = `Request failed (${response.status})`;
  const text = await response.text();
  if (!text) return fallback;

  try {
    const body = JSON.parse(text) as { message?: string | string[]; error?: string };
    const message = Array.isArray(body.message) ? body.message.join(", ") : body.message;
    return message ?? body.error ?? text;
  } catch {
    return text;
  }
}

export function getSessionExpiryMs(): number | null {
  const session = getBackendAuthSession();
  return session?.exp ? session.exp * 1000 : null;
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(REFRESH_TOKEN_KEY) ?? localStorage.getItem(REFRESH_TOKEN_KEY);
}

export async function refreshAuthSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    forceLogout();
    throw new Error("Session expired. Please sign in again.");
  }

  const persist = Boolean(localStorage.getItem(REFRESH_TOKEN_KEY));
  const response = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });

  if (!response.ok) {
    forceLogout();
    throw new Error("Session expired. Please sign in again.");
  }

  const data = (await response.json()) as {
    accessToken: string;
    refreshToken?: string;
    user: AuthUser;
  };

  setAccessToken(data.accessToken, persist);
  if (data.refreshToken) setRefreshToken(data.refreshToken, persist);
  setStoredAuthUser(data.user, persist);
  return data;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let session = getBackendAuthSession();
  let token = getAccessToken();

  if (!session || !token) {
    try {
      await refreshAuthSession();
      session = getBackendAuthSession();
      token = getAccessToken();
    } catch {
      forceLogout();
      throw new Error("Authentication expired. Please sign in again.");
    }
  }

  const method = options.method ?? "GET";
  const response = await fetch(`${getApiBaseUrl()}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    if (response.status === 401) {
      try {
        await refreshAuthSession();
        return apiFetch<T>(path, options);
      } catch {
        forceLogout();
      }
    }
    throw new Error(`${method} /api${path} failed (${response.status}): ${message}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return null as T;
  }

  return JSON.parse(text) as T;
}

export async function loginWithBackend(usernameOrEmail: string, password: string, persist = false) {
  const response = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernameOrEmail, password })
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(`POST /api/auth/login failed (${response.status}): ${message}`);
  }

  const data = (await response.json()) as {
    accessToken: string;
    refreshToken?: string;
    user: AuthUser;
  };
  setAccessToken(data.accessToken, persist);
  if (data.refreshToken) setRefreshToken(data.refreshToken, persist);
  setStoredAuthUser(data.user, persist);
  return data;
}

export async function changePasswordWithBackend(currentPassword: string, newPassword: string) {
  return apiFetch<{ ok: true }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword })
  });
}

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { message?: string };
};

const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
let accessToken: string | null = null;
let refreshToken: string | null = null;
const requestTimeoutMs = 10000;

export function resolveApiUrl(path: string | null | undefined) {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

async function fetchWithTimeout(url: string, options: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export function setAuthTokens(tokens: {
  accessToken: string;
  refreshToken?: string;
}) {
  accessToken = tokens.accessToken;
  if (tokens.refreshToken) refreshToken = tokens.refreshToken;
}

export function clearAuthTokens() {
  accessToken = null;
  refreshToken = null;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const rawBody = await response.text();
  let body = {} as ApiEnvelope<T>;

  if (rawBody) {
    try {
      body = JSON.parse(rawBody) as ApiEnvelope<T>;
    } catch {
      throw new Error(
        `Máy chủ trả về dữ liệu không hợp lệ (${response.status}).`,
      );
    }
  }

  if (!response.ok || !body.success || body.data === undefined) {
    throw new Error(
      body.error?.message || `Máy chủ trả về lỗi ${response.status}.`,
    );
  }
  return body.data;
}

export async function request<T>(path: string, options: RequestInit = {}) {
  if (!apiBaseUrl)
    throw new Error("Chưa cấu hình EXPO_PUBLIC_API_URL cho ứng dụng.");
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetchWithTimeout(`${apiBaseUrl}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        "Không thể kết nối tới máy chủ. Kiểm tra backend, Wi-Fi và địa chỉ API.",
      );
    }
    throw new Error(
      "Mất kết nối tới máy chủ. Hãy kiểm tra iPhone và máy tính cùng Wi-Fi.",
    );
  }

  if (response.status === 401 && refreshToken && path !== "/auth/refresh") {
    const refreshResponse = await fetchWithTimeout(
      `${apiBaseUrl}/auth/refresh`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      },
    );
    if (refreshResponse.ok) {
      const refreshed = await parseResponse<{
        accessToken: string;
        refreshToken: string;
      }>(refreshResponse);
      setAuthTokens(refreshed);
      headers.set("Authorization", `Bearer ${refreshed.accessToken}`);
      response = await fetchWithTimeout(`${apiBaseUrl}${path}`, {
        ...options,
        headers,
      });
    } else clearAuthTokens();
  }
  return parseResponse<T>(response);
}

export const authApi = {
  login: (payload: {
    identifier: string;
    password: string;
    platform: "android" | "ios" | "web" | "other";
  }) =>
    request<{
      account: Record<string, unknown>;
      accessToken: string;
      refreshToken: string;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  register: (payload: Record<string, string>) =>
    request<{
      account: Record<string, unknown>;
      target: string;
      debugOtp?: string;
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  verifyOtp: (payload: { target: string; code: string }) =>
    request<{ account: Record<string, unknown> }>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

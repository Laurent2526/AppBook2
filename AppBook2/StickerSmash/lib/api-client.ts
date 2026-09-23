type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { message?: string };
};

const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
let accessToken: string | null = null;
let refreshToken: string | null = null;

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
  const body = (await response.json()) as ApiEnvelope<T>;
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
  if (options.body) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  let response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers });
  if (response.status === 401 && refreshToken && path !== "/auth/refresh") {
    const refreshResponse = await fetch(`${apiBaseUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });
    if (refreshResponse.ok) {
      const refreshed = await parseResponse<{
        accessToken: string;
        refreshToken: string;
      }>(refreshResponse);
      setAuthTokens(refreshed);
      headers.set("Authorization", `Bearer ${refreshed.accessToken}`);
      response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers });
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

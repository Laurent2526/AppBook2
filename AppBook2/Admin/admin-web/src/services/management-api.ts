export type AdminAccount = {
  id: number;
  username: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  role: string;
  status: "pending_verify" | "active" | "locked" | "deleted";
  is_author: number | boolean;
  created_at: string;
  last_login_at: string | null;
};

export type AdminBook = {
  id: number;
  title: string;
  author_name: string | null;
  description?: string | null;
  status: string;
  writing_status: string;
  cover_url: string | null;
  view_count: number;
  purchase_count: number;
  total_revenue: string;
  updated_at: string;
  owner_id: number;
  owner_username: string;
  owner_name: string | null;
};

export type AdminChapter = {
  id: number;
  chapter_number: number;
  title: string;
  status: string;
  is_free: number | boolean;
  price: string;
  view_count: number;
  purchase_count: number;
};

type ListResult<T> = { rows: T[]; total: number; page: number; limit: number };

const apiUrl = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"
).replace(/\/$/, "");

export function resolveAdminAssetUrl(path: string | null | undefined) {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(path.startsWith("/") ? path : `/${path}`, apiUrl).toString();
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as {
    success?: boolean;
    data?: T;
    error?: { message?: string };
  };
  if (!response.ok || !body.success || body.data === undefined) {
    throw new Error(body.error?.message || `API lỗi ${response.status}`);
  }
  return body.data;
}

async function call<T>(token: string, path: string, init?: RequestInit) {
  return parseResponse<T>(
    await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
      cache: "no-store",
    }),
  );
}

export function listAccounts(
  token: string,
  params: { search?: string; status?: string; page?: number; limit?: number },
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, String(value));
  }
  return call<ListResult<AdminAccount>>(
    token,
    `/admin/accounts?${query.toString()}`,
  );
}

export function setAccountStatus(
  token: string,
  id: number,
  status: "active" | "locked",
) {
  return call<{ id: number; status: string }>(
    token,
    `/admin/accounts/${id}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) },
  );
}

export function deleteAccount(token: string, id: number) {
  return call<{ id: number; status: string }>(token, `/admin/accounts/${id}`, {
    method: "DELETE",
  });
}

export function listBooks(
  token: string,
  params: { search?: string; status?: string; page?: number; limit?: number },
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, String(value));
  }
  return call<ListResult<AdminBook>>(token, `/admin/books?${query.toString()}`);
}

export function getAdminBook(token: string, id: number) {
  return call<{ book: AdminBook; chapters: AdminChapter[] }>(
    token,
    `/admin/books/${id}`,
  );
}

export function updateAdminBook(
  token: string,
  id: number,
  payload: { title: string; authorName: string; description: string },
) {
  return call<{ book: AdminBook }>(token, `/admin/books/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function setAdminBookStatus(
  token: string,
  id: number,
  status: "published" | "hidden" | "rejected",
) {
  return call<{ id: number; status: string }>(
    token,
    `/admin/books/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status,
        ...(status === "rejected" ? { reason: "Nội dung không phù hợp" } : {}),
      }),
    },
  );
}

export function deleteBook(token: string, id: number) {
  return call<{ id: number; status: string }>(token, `/admin/books/${id}`, {
    method: "DELETE",
  });
}

export type DailyPlatformStats = {
  stat_date: string;
  new_users: number;
  active_readers: number;
  active_authors: number;
  total_sessions: number;
  new_books: number;
  new_chapters: number;
  total_views: number;
  chapters_sold: number;
  gross_revenue: string;
  platform_revenue: string;
  author_revenue: string;
  total_topup: string;
  total_withdraw: string;
  total_refund: string;
};

export type DailyBookStats = {
  stat_date: string;
  book_id: number;
  views: number;
  unique_readers: number;
  chapters_sold: number;
  revenue: string;
  new_followers: number;
  new_comments: number;
};

export type DailyAuthorStats = {
  stat_date: string;
  account_id: number;
  total_views: number;
  book_count: number;
  chapters_sold: number;
  revenue: string;
  new_followers: number;
};

export type Withdrawal = {
  id: number;
  code: string;
  account_id: number;
  account_username?: string | null;
  account_full_name?: string | null;
  account_email?: string | null;
  bank_snapshot: string | Record<string, string>;
  amount: string;
  actual_amount: string;
  currency: string;
  status: "pending" | "approved" | "rejected" | "completed" | string;
  reject_reason?: string | null;
  transfer_ref?: string | null;
  created_at: string;
};

export type Report = {
  id: number;
  reporter_id: number;
  target_type: "book" | "chapter" | "comment" | "account" | "message" | string;
  target_id: number;
  reason: string;
  description?: string | null;
  evidence_urls?: string | string[] | null;
  status: string;
  created_at: string;
};

const apiUrl = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"
).replace(/\/$/, "");

async function call<T>(token: string, path: string, init?: RequestInit) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
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

export function getPlatformStats(
  token: string,
  from: string,
  to: string,
) {
  const query = new URLSearchParams({ from, to });
  return call<{ from: string; to: string; items: DailyPlatformStats[] }>(
    token,
    `/admin/statistics/platform?${query}`,
  );
}

export function getBookStats(token: string, from: string, to: string) {
  const query = new URLSearchParams({ from, to });
  return call<{ from: string; to: string; items: DailyBookStats[] }>(
    token,
    `/admin/statistics/books?${query}`,
  );
}

export function getAuthorStats(token: string, from: string, to: string) {
  const query = new URLSearchParams({ from, to });
  return call<{ from: string; to: string; items: DailyAuthorStats[] }>(
    token,
    `/admin/statistics/authors?${query}`,
  );
}

export function listWithdrawals(token: string) {
  return call<{ withdrawals: Withdrawal[] }>(token, "/admin/withdrawals");
}

export function approveWithdrawal(token: string, id: number) {
  return call<{ id: number; status: string }>(
    token,
    `/admin/withdrawals/${id}/approve`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export function rejectWithdrawal(
  token: string,
  id: number,
  rejectReason: string,
) {
  return call<{ id: number; status: string }>(
    token,
    `/admin/withdrawals/${id}/reject`,
    { method: "POST", body: JSON.stringify({ rejectReason }) },
  );
}

export function completeWithdrawal(
  token: string,
  id: number,
  transferRef: string,
) {
  return call<{ id: number; status: string }>(
    token,
    `/admin/withdrawals/${id}/complete`,
    { method: "POST", body: JSON.stringify({ transferRef }) },
  );
}

export function listReports(token: string) {
  return call<{ items: Report[] }>(token, "/admin/reports");
}

export function resolveReport(
  token: string,
  id: number,
  actionTaken: "none" | "hidden" | "deleted" | "account_locked",
  adminNote?: string,
) {
  return call<{ report: Report }>(token, `/admin/reports/${id}/resolve`, {
    method: "POST",
    body: JSON.stringify({
      actionTaken,
      ...(adminNote?.trim() ? { adminNote: adminNote.trim() } : {}),
    }),
  });
}

export function dismissReport(token: string, id: number, adminNote?: string) {
  return call<{ report: Report }>(token, `/admin/reports/${id}/dismiss`, {
    method: "POST",
    body: JSON.stringify(adminNote?.trim() ? { adminNote: adminNote.trim() } : {}),
  });
}

export type ModerationRequest = {
  id: number;
  request_type: string;
  target_type: "book" | "chapter" | string;
  target_id: number;
  requester_id?: number;
  status: "pending" | "approved" | "rejected" | string;
  title?: string | null;
  book_title?: string | null;
  chapter_number?: number | null;
  chapter_title?: string | null;
  author_name?: string | null;
  created_at?: string;
  reason?: string | null;
};

type QueueResponse = {
  rows: ModerationRequest[];
  page: number;
  limit: number;
};

const apiUrl = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"
).replace(/\/$/, "");

function headers(token: string) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
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

export async function listModerationRequests(token: string) {
  const response = await fetch(`${apiUrl}/admin/moderation?limit=100`, {
    headers: headers(token),
    cache: "no-store",
  });
  return parseResponse<QueueResponse>(response);
}

export async function decideModerationRequest(
  token: string,
  requestId: number,
  action: "approve" | "reject",
  adminNote?: string,
) {
  const response = await fetch(
    `${apiUrl}/admin/moderation/${requestId}/${action}`,
    {
      method: "POST",
      headers: { ...headers(token), "Content-Type": "application/json" },
      body: JSON.stringify(
        adminNote?.trim() ? { adminNote: adminNote.trim() } : {},
      ),
    },
  );
  return parseResponse<{ moderationRequestId: number; status: string }>(
    response,
  );
}

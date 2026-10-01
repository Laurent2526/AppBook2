import { request, resolveApiUrl } from "@/lib/api-client";

export type ReadingHistory = {
  id: string;
  book_id: string;
  last_chapter_id?: string | null;
  progress_percent?: string | number | null;
  chapters_read?: number;
  total_read_time?: number;
  last_read_at?: string;
};

export type Bookmark = {
  id: string;
  book_id: string;
  folder?: string | null;
  created_at?: string;
};

export type Purchase = {
  id: string;
  book_id: string;
  chapter_id: string;
  price_paid?: string | number;
  is_revoked?: number | boolean;
  purchased_at?: string;
  book_title?: string;
  chapter_title?: string;
  chapter_number?: number;
};

export type MyBook = {
  id: string;
  title: string;
  status?: string;
  writing_status?: string;
  author_name?: string | null;
  description?: string | null;
  cover_url?: string | null;
  slug?: string;
  created_at?: string;
  updated_at?: string;
};

export type Wallet = {
  balance: string | number;
  pending_withdraw?: string | number;
  total_topup?: string | number;
  total_spent?: string | number;
  total_earned?: string | number;
  total_withdrawn?: string | number;
  currency?: string;
};

export type WalletEntry = {
  id: string;
  transaction_id?: string | null;
  direction: "credit" | "debit" | string;
  amount: string | number;
  balance_after?: string | number;
  reason?: string | null;
  note?: string | null;
  created_at?: string;
};

export function getReadingHistory() {
  return request<{ items: ReadingHistory[] }>("/me/reading-history").then(
    (data) => ({
      items: data.items.map((item) => ({
        ...item,
        id: String(item.id),
        book_id: String(item.book_id),
        last_chapter_id: item.last_chapter_id
          ? String(item.last_chapter_id)
          : item.last_chapter_id,
      })),
    }),
  );
}

export function updateReadingHistory(
  bookId: string,
  payload: {
    lastChapterId?: string;
    progressPercent?: string;
    chaptersRead?: number;
    totalReadTime?: number;
  },
) {
  return request<{ history: ReadingHistory }>(`/me/reading-history/${bookId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getBookmarks() {
  return request<{ items: Bookmark[] }>("/me/bookmarks").then((data) => ({
    items: data.items.map((item) => ({
      ...item,
      id: String(item.id),
      book_id: String(item.book_id),
    })),
  }));
}

export function createBookmark(bookId: string) {
  return request<{ bookmark: Bookmark }>("/bookmarks", {
    method: "POST",
    body: JSON.stringify({ bookId: Number(bookId) }),
  });
}

export function getPurchases() {
  return request<{ rows: Purchase[] }>("/me/purchases?limit=100").then(
    (data) => ({
      rows: data.rows.map((item) => ({
        ...item,
        id: String(item.id),
        book_id: String(item.book_id),
        chapter_id: String(item.chapter_id),
      })),
    }),
  );
}

export function getMyBooks(
  params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {},
) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);

  return request<{
    rows: MyBook[];
    page: number;
    limit: number;
    summary: {
      total: number;
      pending: number;
      published: number;
      rejected: number;
      pendingDelete: number;
    };
  }>(query.toString() ? `/me/books?${query.toString()}` : "/me/books").then(
    (data) => ({
      rows: (data.rows || []).map((book) => ({
        ...book,
        id: String(book.id),
        title: book.title,
        status: book.status,
        writing_status: book.writing_status,
        author_name: book.author_name ?? null,
        description: book.description ?? null,
        cover_url: resolveApiUrl(book.cover_url) ?? null,
      })),
      page: data.page,
      limit: data.limit,
      summary: data.summary,
    }),
  );
}

export function getWallet() {
  return request<{ wallet: Wallet }>("/me/wallet");
}

export function getWalletEntries() {
  return request<{ rows: WalletEntry[] }>("/me/wallet/entries?limit=100").then(
    (data) => ({
      rows: data.rows.map((item) => ({ ...item, id: String(item.id) })),
    }),
  );
}

export function createBook(payload: {
  title: string;
  authorName?: string;
  cover?: { uri: string; name?: string; type?: string };
  description?: string;
  categoryIds: number[];
  writingStatus?: "ongoing" | "completed" | "paused";
  language?: string;
}) {
  const formData = new FormData();
  formData.append("title", payload.title);
  if (payload.authorName) formData.append("authorName", payload.authorName);
  if (payload.description) formData.append("description", payload.description);
  formData.append("categoryIds", JSON.stringify(payload.categoryIds));
  if (payload.writingStatus)
    formData.append("writingStatus", payload.writingStatus);
  if (payload.language) formData.append("language", payload.language);
  if (payload.cover) {
    formData.append("cover", {
      uri: payload.cover.uri,
      name: payload.cover.name ?? "cover.jpg",
      type: payload.cover.type ?? "image/jpeg",
    } as unknown as Blob);
  }
  return request<{ book: Record<string, unknown> }>("/books", {
    method: "POST",
    body: formData,
  });
}
export function createChapter(
  bookId: string,
  payload: {
    chapterNumber: number;
    title: string;
    content?: string;
    contentUrl?: string;
    previewText?: string;
    isFree?: boolean;
    price?: string;
  },
) {
  return request<{ chapter: Record<string, unknown> }>(
    `/books/${bookId}/chapters`,
    {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        price: payload.price ?? "0.00",
        isFree: payload.isFree ?? true,
      }),
    },
  );
}

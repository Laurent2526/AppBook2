import { request } from "@/lib/api-client";

export type BookRating = {
  id: string;
  book_id: string;
  book_title: string;
  score: number;
  created_at: string;
  updated_at?: string;
};

export type BookComment = {
  id: string;
  account_id: string;
  account_username?: string | null;
  account_name?: string | null;
  book_id: string;
  chapter_id?: string | null;
  parent_id?: string | null;
  content: string;
  created_at: string;
};

export function rateBook(bookId: string, score: number) {
  return request<{ rating: { id: string; score: number }; updated: boolean }>(
    `/books/${bookId}/ratings`,
    { method: "POST", body: JSON.stringify({ score }) },
  );
}

export function getMyRatings() {
  return request<{ items: BookRating[] }>("/me/ratings").then((data) => ({
    items: data.items.map((item) => ({
      ...item,
      id: String(item.id),
      book_id: String(item.book_id),
    })),
  }));
}

export function getBookComments(bookId: string) {
  return request<{ items: BookComment[] }>(`/books/${bookId}/comments`).then(
    (data) => ({
      items: data.items.map((item) => ({
        ...item,
        id: String(item.id),
        account_id: String(item.account_id),
        book_id: String(item.book_id),
      })),
    }),
  );
}

export function createBookComment(
  bookId: string,
  content: string,
  chapterId?: string,
) {
  return request<{ comment: BookComment }>(`/books/${bookId}/comments`, {
    method: "POST",
    body: JSON.stringify({
      content,
      ...(chapterId ? { chapterId: Number(chapterId) } : {}),
    }),
  });
}

export function reportTarget(
  targetType: "book" | "comment",
  targetId: string,
  reason:
    | "copyright"
    | "sensitive_content"
    | "spam"
    | "hate_speech"
    | "harassment"
    | "misinformation"
    | "other",
) {
  return request<{ report: Record<string, unknown> }>("/reports", {
    method: "POST",
    body: JSON.stringify({ targetType, targetId: Number(targetId), reason }),
  });
}

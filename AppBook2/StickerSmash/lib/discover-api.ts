import { request, resolveApiUrl } from "@/lib/api-client";

export type DiscoverBook = {
  id: string;
  title: string;
  description?: string;
  author?: string;
  category?: string;
  status?: string;
  coverUrl?: string;
  categoryIds?: string[];
};

export type DiscoverGenre = {
  id: string;
  name: string;
};

export type FollowingUser = {
  id: string;
  name: string;
  avatarUrl?: string;
  latestBook?: DiscoverBook;
};

export type DiscoverResponse = {
  recommendations: DiscoverBook[];
  shelf: DiscoverBook[];
  following: FollowingUser[];
  saved: DiscoverBook[];
};

type BackendBook = {
  id: number | string;
  title: string;
  description?: string | null;
  author_name?: string | null;
  cover_url?: string | null;
  writing_status?: string;
  category_ids?: Array<number | string> | null;
};

type BackendCategory = {
  id: number | string;
  name: string;
  is_active?: number | boolean;
};

type BackendChapter = {
  id: number | string;
  book_id?: number | string | null;
  chapter_number?: number | string;
  title?: string;
  content?: string | null;
  preview_text?: string | null;
  is_free?: number | boolean;
  price?: number | string | null;
  status?: string;
};

const mapBook = (book: BackendBook): DiscoverBook => ({
  id: String(book.id),
  title: book.title,
  description: book.description || undefined,
  author: book.author_name || undefined,
  status: book.writing_status,
  coverUrl: resolveApiUrl(book.cover_url),
  categoryIds: Array.isArray(book.category_ids)
    ? book.category_ids.map((categoryId) => String(categoryId))
    : undefined,
});

export function getCategories() {
  return request<{ categories: BackendCategory[] }>("/categories").then(
    (data) => ({
      categories: data.categories.map((category) => ({
        id: String(category.id),
        name: category.name,
      })),
    }),
  );
}

export function listBooks(
  params: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string | number;
    writingStatus?: string;
  } = {},
) {
  const query = new URLSearchParams();

  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.categoryId) query.set("categoryId", String(params.categoryId));
  if (params.writingStatus) query.set("writingStatus", params.writingStatus);

  const queryString = query.toString();

  return request<{ rows: BackendBook[]; page?: number; limit?: number }>(
    queryString ? `/books?${queryString}` : "/books",
  ).then((data) => ({
    rows: (data.rows || []).map(mapBook),
    page: data.page,
    limit: data.limit,
  }));
}

export function getBookById(bookId: string) {
  return request<{ book: BackendBook }>(`/books/${bookId}`).then((data) => ({
    book: mapBook(data.book),
  }));
}

export function getBookChapters(bookId: string) {
  return request<{ chapters: BackendChapter[] }>(
    `/books/${bookId}/chapters`,
  ).then((data) => ({
    chapters: (data.chapters || []).map((chapter) => ({
      ...chapter,
      id: String(chapter.id),
      book_id: chapter.book_id ? String(chapter.book_id) : chapter.book_id,
      chapter_number:
        chapter.chapter_number !== undefined
          ? Number(chapter.chapter_number)
          : chapter.chapter_number,
    })),
  }));
}

export function getChapterById(chapterId: string) {
  return request<{ chapter: BackendChapter }>(`/chapters/${chapterId}`).then(
    (data) => ({
      chapter: {
        ...data.chapter,
        id: String(data.chapter.id),
        book_id: data.chapter.book_id
          ? String(data.chapter.book_id)
          : undefined,
      },
    }),
  );
}

export function getGenres() {
  return request<{ categories: DiscoverGenre[] }>("/categories").then(
    (data) => ({
      genres: data.categories.map((category) => ({
        ...category,
        id: String(category.id),
      })),
    }),
  );
}

export function getRecommendations(_userId?: string, genreIds: string[] = []) {
  const params = new URLSearchParams();
  if (genreIds.length > 0) params.set("categoryId", genreIds[0]);
  params.set("limit", "20");
  return request<{ rows: BackendBook[] }>(`/books?${params.toString()}`).then(
    (data) => ({
      recommendations: data.rows.map(mapBook),
    }),
  );
}

export function getFollowingFeed(_userId: string) {
  return request<{ rows: BackendBook[] }>("/books?limit=20").then((data) => ({
    following: [],
    saved: data.rows.map(mapBook),
  }));
}

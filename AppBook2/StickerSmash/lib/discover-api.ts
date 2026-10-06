import { request, resolveApiUrl } from "@/lib/api-client";

export type DiscoverBook = {
  id: string;
  ownerId?: string;
  title: string;
  description?: string;
  author?: string;
  category?: string;
  status?: string;
  coverUrl?: string;
  categoryIds?: string[];
  views?: number;
  purchases?: number;
  followers?: number;
  revenue?: string;
  rating?: number;
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

export type FeaturedAuthor = {
  id: string;
  name: string;
  avatarUrl?: string;
  bookCount: number;
  views: number;
  purchases: number;
  followers: number;
  revenue: string;
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
  owner_id?: number | string;
  cover_url?: string | null;
  writing_status?: string;
  category_ids?: (number | string)[] | string | null;
  view_count?: number | string;
  purchase_count?: number | string;
  follower_count?: number | string;
  total_revenue?: number | string;
  rating_avg?: number | string;
};

type BackendAuthor = {
  id: number | string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  book_count?: number | string;
  total_views?: number | string;
  total_purchases?: number | string;
  total_revenue?: number | string;
  follower_count?: number | string;
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
  ownerId: book.owner_id ? String(book.owner_id) : undefined,
  title: book.title,
  description: book.description || undefined,
  author: book.author_name || undefined,
  status: book.writing_status,
  coverUrl: resolveApiUrl(book.cover_url),
  categoryIds: Array.isArray(book.category_ids)
    ? book.category_ids.map((categoryId) => String(categoryId))
    : typeof book.category_ids === "string" && book.category_ids.length > 0
      ? book.category_ids.split(",").map((categoryId) => categoryId.trim())
      : [],
  views: Number(book.view_count || 0),
  purchases: Number(book.purchase_count || 0),
  followers: Number(book.follower_count || 0),
  revenue: String(book.total_revenue || "0.00"),
  rating: Number(book.rating_avg || 0),
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
    sortBy?: "latest" | "hot";
  } = {},
) {
  const query = new URLSearchParams();

  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.categoryId) query.set("categoryId", String(params.categoryId));
  if (params.writingStatus) query.set("writingStatus", params.writingStatus);
  if (params.sortBy) query.set("sortBy", params.sortBy);

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

export function recordChapterView(chapterId: string) {
  return request<{ counted: boolean }>(`/chapters/${chapterId}/view`, {
    method: "POST",
  });
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
  if (genreIds.length > 0) params.set("categoryIds", genreIds.join(","));
  params.set("limit", "20");
  return request<{
    rows: BackendBook[];
    categoryIds: (number | string)[];
    basedOn: "reading_history" | "selected_categories" | "popular_books";
  }>(`/discovery/recommendations?${params.toString()}`).then((data) => ({
    recommendations: data.rows.map(mapBook),
    categoryIds: data.categoryIds.map(String),
    basedOn: data.basedOn,
  }));
}

export function getFollowingFeed(_userId?: string) {
  return request<{
    following: {
      id: number | string;
      name: string;
      avatar_url?: string | null;
      latest_book?: BackendBook | null;
    }[];
    followingBooks: BackendBook[];
    savedBooks: BackendBook[];
  }>("/discovery/following").then((data) => ({
    following: data.following.map((user) => ({
      id: String(user.id),
      name: user.name,
      avatarUrl: resolveApiUrl(user.avatar_url),
      latestBook: user.latest_book ? mapBook(user.latest_book) : undefined,
    })),
    followingBooks: data.followingBooks.map(mapBook),
    saved: data.savedBooks.map(mapBook),
  }));
}

export function getFeaturedAuthors(limit = 10, search?: string) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (search) params.set("search", search);
  return request<{ authors: BackendAuthor[] }>(
    `/discovery/featured-authors?${params.toString()}`,
  ).then((data) => ({
    authors: data.authors.map((author) => ({
      id: String(author.id),
      name: author.full_name || author.username,
      avatarUrl: resolveApiUrl(author.avatar_url),
      bookCount: Number(author.book_count || 0),
      views: Number(author.total_views || 0),
      purchases: Number(author.total_purchases || 0),
      followers: Number(author.follower_count || 0),
      revenue: String(author.total_revenue || "0.00"),
    })),
  }));
}

export function followTarget(targetType: "account" | "book", targetId: string) {
  return request<{ item: Record<string, unknown> }>("/follows", {
    method: "POST",
    body: JSON.stringify({ targetType, targetId: Number(targetId) }),
  });
}

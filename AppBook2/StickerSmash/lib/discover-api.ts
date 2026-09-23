import { request } from "@/lib/api-client";

export type DiscoverBook = {
  id: string;
  title: string;
  description?: string;
  author?: string;
  category?: string;
  status?: string;
  coverUrl?: string;
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
};

const mapBook = (book: BackendBook): DiscoverBook => ({
  id: String(book.id),
  title: book.title,
  description: book.description || undefined,
  author: book.author_name || undefined,
  status: book.writing_status,
  coverUrl: book.cover_url || undefined,
});

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

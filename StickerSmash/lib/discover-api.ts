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

const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");

async function request<T>(path: string, userId?: string): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error("Chưa cấu hình EXPO_PUBLIC_API_URL cho ứng dụng.");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      Accept: "application/json",
      ...(userId ? { "X-User-Id": userId } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Máy chủ trả về lỗi ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

export function getGenres() {
  return request<{ genres: DiscoverGenre[] }>("/discover/genres");
}

export function getRecommendations(userId?: string, genreIds: string[] = []) {
  const params = new URLSearchParams();
  if (genreIds.length > 0) params.set("genres", genreIds.join(","));
  const query = params.toString();

  return request<Pick<DiscoverResponse, "recommendations">>(
    `/discover/recommendations${query ? `?${query}` : ""}`,
    userId,
  );
}

export function getFollowingFeed(userId: string) {
  return request<Omit<DiscoverResponse, "recommendations">>(
    "/discover/following",
    userId,
  );
}

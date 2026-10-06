import React from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/components/auth-provider";
import { BookCover } from "@/components/book-cover";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { getReadingHistory, type ReadingHistory } from "@/lib/account-api";
import {
  getBookById,
  getCategories,
  listBooks,
  type DiscoverBook,
} from "@/lib/discover-api";
import { SafeAreaView } from "react-native-safe-area-context";

type ContinueReading = {
  book: DiscoverBook;
  history: ReadingHistory;
};

const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const getCoverColor = (index: number) => {
  const colors = [
    "#F59E0B",
    "#A78BFA",
    "#34D399",
    "#60A5FA",
    "#FB7185",
    "#FBBF24",
  ];
  return colors[index % colors.length];
};

const openAllTab = (tab: string, router: ReturnType<typeof useRouter>) => {
  router.push({ pathname: "/(user)/home/explore", params: { tab } });
};

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [categories, setCategories] = React.useState<
    { id: string; name: string }[]
  >([{ id: "all", name: "Tất cả" }]);
  const [newBooks, setNewBooks] = React.useState<any[]>([]);
  const [hotBooks, setHotBooks] = React.useState<any[]>([]);
  const [continueReading, setContinueReading] =
    React.useState<ContinueReading | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      const loadContinueReading = async () => {
        if (!isAuthenticated) {
          if (active) setContinueReading(null);
          return;
        }

        try {
          const { items } = await getReadingHistory();
          const latest = items[0];
          if (!latest) {
            if (active) setContinueReading(null);
            return;
          }

          const { book } = await getBookById(latest.book_id);
          if (active) setContinueReading({ book, history: latest });
        } catch (error) {
          console.warn("continue reading fetch failed", error);
          if (active) setContinueReading(null);
        }
      };

      const load = async () => {
        try {
          const [
            { categories: categoryList },
            { rows: latestRows },
            { rows: hotRows },
          ] = await Promise.all([
            getCategories(),
            listBooks({ limit: 10, sortBy: "latest" }),
            listBooks({ limit: 10, sortBy: "hot" }),
          ]);

          if (!active) return;

          const mappedCategories = [
            { id: "all", name: "Tất cả" },
            ...categoryList,
          ];
          setCategories(mappedCategories);
          const categoryName = (book: any) =>
            book.categoryIds
              ?.map(
                (id: string) =>
                  categoryList.find((category) => category.id === id)?.name,
              )
              .filter(Boolean)
              .join(" · ") || "Truyện";

          setNewBooks(
            latestRows.map((book: any, index: number) => ({
              ...book,
              category: categoryName(book),
              coverColor: getCoverColor(index),
            })),
          );
          setHotBooks(
            hotRows.map((book: any, index: number) => ({
              ...book,
              category: categoryName(book),
              coverColor: getCoverColor(index + 2),
            })),
          );
        } catch (error) {
          console.warn("home fetch failed", error);
        } finally {
          if (active) setLoading(false);
        }
      };

      load();
      void loadContinueReading();
      return () => {
        active = false;
      };
    }, [isAuthenticated]),
  );

  const greeting = isAuthenticated
    ? `Chào buổi sáng, ${user?.name ?? "bạn"}! 👋`
    : "Chào mừng bạn! 👋";

  const continueReadingProgress = Math.min(
    100,
    Math.max(0, Number(continueReading?.history.progress_percent || 0)),
  );

  const openBook = (id: string, title?: string) => {
    router.push({
      pathname: "/book-detail",
      params: { id, title: title ?? "" },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <View>
              <ThemedText type="subtitle">{greeting}</ThemedText>
            </View>
            <Pressable
              style={styles.notificationButton}
              onPress={() => router.push("/(user)/messages")}
            >
              <ThemedText style={styles.notificationIcon}>🔔</ThemedText>
            </Pressable>
            <Pressable
              style={styles.notificationButton}
              onPress={() => router.push("/settings")}
            >
              <ThemedText style={styles.notificationIcon}>⚙️</ThemedText>
            </Pressable>
          </View>

          <View style={styles.searchBar}>
            <ThemedText style={styles.searchIcon}>🔍</ThemedText>
            <TextInput
              placeholder="Tìm kiếm tên sách, tác giả, thể loại..."
              placeholderTextColor="#8A8A8A"
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              onSubmitEditing={() => {
                const term = search.trim();
                if (term) {
                  router.push({
                    pathname: "/(user)/home/explore",
                    params: { tab: "new", search: term },
                  });
                }
              }}
            />
            <Pressable
              style={styles.filterButton}
              onPress={() =>
                router.push({
                  pathname: "/(user)/home/explore",
                  params: { tab: "categories" },
                })
              }
            >
              <ThemedText style={styles.filterIcon}>☰</ThemedText>
            </Pressable>
          </View>
          {loading ? (
            <ThemedText style={styles.newBookMeta}>
              Đang tải sách/truyện...
            </ThemedText>
          ) : null}

          {continueReading && (
            <Pressable
              style={styles.continueCard}
              onPress={() =>
                openBook(continueReading.book.id, continueReading.book.title)
              }
            >
              <BookCover
                uri={continueReading.book.coverUrl}
                title={continueReading.book.title}
                fallbackColor="#F59E0B"
                style={styles.bookCover}
              />

              <View style={styles.bookInfo}>
                <ThemedText type="defaultSemiBold" style={styles.bookTitle}>
                  {continueReading.book.title}
                </ThemedText>
                <ThemedText style={styles.authorText}>
                  {continueReading.book.author || "Tác giả"}
                </ThemedText>
                <ThemedText style={styles.progressText}>
                  Đã đọc {Math.floor(continueReadingProgress)}% · Chương{" "}
                  {continueReading.history.chapters_read || 1}
                </ThemedText>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${continueReadingProgress}%` },
                    ]}
                  />
                </View>
              </View>

              <Pressable
                style={styles.playButton}
                onPress={() =>
                  router.push({
                    pathname: "/reader",
                    params: {
                      bookId: continueReading.history.book_id,
                      chapterId:
                        continueReading.history.last_chapter_id || undefined,
                      chapter: String(
                        continueReading.history.chapters_read || 1,
                      ),
                      scrollPosition: String(
                        continueReading.history.scroll_position || 0,
                      ),
                    },
                  })
                }
              >
                <ThemedText style={styles.playIcon}>▶</ThemedText>
              </Pressable>
            </Pressable>
          )}

          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">Danh mục</ThemedText>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
          >
            {categories.map((category) => (
              <Pressable
                key={category.id}
                onPress={() =>
                  router.push({
                    pathname: "/(user)/home/explore",
                    params: { tab: "categories", category: category.id },
                  })
                }
                style={[
                  styles.categoryChip,
                  category.id === "all" && styles.categoryChipActive,
                ]}
              >
                <ThemedText
                  style={[
                    styles.categoryText,
                    category.id === "all" && styles.categoryTextActive,
                  ]}
                >
                  {category.name}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.sectionHeaderRow}>
            <ThemedText type="subtitle">Sách/truyện mới</ThemedText>
            <Pressable onPress={() => openAllTab("new", router)}>
              <ThemedText style={styles.viewAllText}>Xem tất cả</ThemedText>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalCardList}
          >
            {newBooks.map((book) => (
              <Pressable
                key={book.id}
                style={styles.newBookCard}
                onPress={() => openBook(book.id, book.title)}
              >
                <BookCover
                  uri={book.coverUrl}
                  title={book.title}
                  fallbackColor={book.coverColor}
                  style={styles.newBookCover}
                />
                <ThemedText style={styles.newBookTitle}>
                  {book.title}
                </ThemedText>
                <ThemedText style={styles.newBookMeta}>
                  {book.author || "Tác giả"}
                </ThemedText>
                <View style={styles.newBookFooter}>
                  <ThemedText style={styles.newBookBadge}>
                    {book.category}
                  </ThemedText>
                  <ThemedText style={styles.newBookRating}>
                    {book.rating ? `★ ${book.rating}` : ""}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.sectionHeaderRow}>
            <ThemedText type="subtitle">Sách/truyện hot</ThemedText>
            <Pressable onPress={() => openAllTab("hot", router)}>
              <ThemedText style={styles.viewAllText}>Xem tất cả</ThemedText>
            </Pressable>
          </View>

          <View style={styles.hotMetaRow}>
            <ThemedText style={styles.hotMetaText}>
              Xếp hạng theo lượt đọc, lượt mua và lượt theo dõi
            </ThemedText>
          </View>

          <View style={styles.hotList}>
            {hotBooks.map((book, index) => (
              <Pressable
                key={book.id}
                style={styles.hotBookCard}
                onPress={() => openBook(book.id, book.title)}
              >
                <View style={styles.hotRankBadge}>
                  <ThemedText style={styles.hotRankText}>
                    #{index + 1}
                  </ThemedText>
                </View>
                <BookCover
                  uri={book.coverUrl}
                  title={book.title}
                  fallbackColor={book.coverColor || getCoverColor(index + 2)}
                  style={styles.hotBookCover}
                />
                <View style={styles.hotBookInfo}>
                  <ThemedText style={styles.hotBookTitle}>
                    {book.title}
                  </ThemedText>
                  <ThemedText style={styles.hotBookAuthor}>
                    {book.author || "Tác giả"}
                  </ThemedText>
                  <ThemedText style={styles.hotBookCategory}>
                    {book.category}
                  </ThemedText>
                  <View style={styles.hotMetricsRow}>
                    <ThemedText style={styles.hotMetric}>
                      👁 {formatCompactNumber(book.views || 0)}
                    </ThemedText>
                    <ThemedText style={styles.hotMetric}>
                      🛒 {formatCompactNumber(book.purchases || 0)}
                    </ThemedText>
                    <ThemedText style={styles.hotMetric}>
                      ♥ {formatCompactNumber(book.followers || 0)}
                    </ThemedText>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F7F9" },
  container: {
    flex: 1,
    backgroundColor: "#F7F7F9",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  notificationIcon: {
    fontSize: 18,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 12,
    height: 52,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
  },
  filterButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  filterIcon: {
    fontSize: 16,
  },
  continueCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 14,
    marginTop: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  bookCover: {
    width: 72,
    height: 100,
    borderRadius: 14,
    marginRight: 14,
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  authorText: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },
  progressText: {
    fontSize: 12,
    color: "#374151",
    marginBottom: 6,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#F59E0B",
    borderRadius: 999,
  },
  playButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  playIcon: {
    fontSize: 16,
    color: "#111827",
    marginLeft: 3,
  },
  sectionHeader: {
    marginTop: 28,
    marginBottom: 12,
  },
  categoryScroll: {
    marginBottom: 18,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryChipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  categoryText: {
    fontSize: 13,
    color: "#374151",
  },
  categoryTextActive: {
    color: "#FFFFFF",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 14,
  },
  viewAllText: {
    color: "#4F46E5",
    fontSize: 13,
    fontWeight: "600",
  },
  horizontalCardList: {
    paddingRight: 8,
    gap: 12,
  },
  newBookCard: {
    width: 150,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  newBookCover: {
    height: 150,
    borderRadius: 14,
    marginBottom: 10,
  },
  newBookTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  newBookMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },
  newBookFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  newBookBadge: {
    fontSize: 11,
    color: "#4F46E5",
    backgroundColor: "#EEF2FF",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: "hidden",
  },
  newBookRating: {
    fontSize: 12,
    color: "#374151",
  },
  hotMetaRow: {
    marginBottom: 12,
  },
  hotMetaText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  hotList: {
    gap: 12,
  },
  hotBookCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  hotRankBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  hotRankText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  hotBookCover: {
    width: 74,
    height: 96,
    borderRadius: 14,
    marginRight: 12,
  },
  hotBookInfo: {
    flex: 1,
  },
  hotBookTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  hotBookAuthor: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  hotBookCategory: {
    fontSize: 11,
    color: "#4F46E5",
    marginBottom: 8,
  },
  hotMetricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  hotMetric: {
    fontSize: 11,
    color: "#374151",
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: "hidden",
  },
  publisherCard: {
    width: 180,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    alignItems: "center",
    marginRight: 12,
  },
  publisherAvatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  publisherAvatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  publisherName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  publisherSpecialty: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 10,
    textAlign: "center",
  },
  publisherStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 6,
    gap: 8,
  },
  publisherStat: {
    fontSize: 11,
    color: "#374151",
    flex: 1,
  },
});

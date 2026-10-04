import { useAuth } from "@/components/auth-provider";
import { BackHeader } from "@/components/back-header";
import { BookCover } from "@/components/book-cover";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  getBookmarks,
  getPurchases,
  getReadingHistory,
} from "@/lib/account-api";
import { getMyRatings } from "@/lib/interaction-api";
import { getBookById } from "@/lib/discover-api";
import { useFocusEffect, useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const tabs = ["Lịch sử", "Tủ truyện", "Mua combo", "Đánh giá"];

type LibraryItem = {
  id: string;
  title: string;
  coverUrl?: string;
  chapter: string;
  bookId: string;
  chapterId?: string;
  scrollPosition?: number;
  progressPercent?: number;
  color: string;
  time?: string;
  score?: number;
};

const colors = ["#F59E0B", "#A78BFA", "#60A5FA", "#34D399", "#F97316"];

export default function LibraryScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = React.useState("Lịch sử");
  const [items, setItems] = React.useState<Record<string, LibraryItem[]>>({
    "Lịch sử": [],
    "Tủ truyện": [],
    "Mua combo": [],
    "Đánh giá": [],
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      if (!isAuthenticated) return;
      let active = true;
      const load = async () => {
        setLoading(true);
        setError(null);
        try {
          const [historyResult, bookmarkResult, purchaseResult, ratingResult] =
            await Promise.all([
              getReadingHistory(),
              getBookmarks(),
              getPurchases(),
              getMyRatings(),
            ]);
          const bookIds = [
            ...historyResult.items.map((item) => item.book_id),
            ...bookmarkResult.items.map((item) => item.book_id),
            ...purchaseResult.rows.map((item) => item.book_id),
            ...ratingResult.items.map((item) => item.book_id),
          ];
          const uniqueBookIds = [...new Set(bookIds)];
          const books = await Promise.all(
            uniqueBookIds.map(async (bookId) => {
              try {
                const result = await getBookById(bookId);
                return [
                  bookId,
                  { title: result.book.title, coverUrl: result.book.coverUrl },
                ] as const;
              } catch {
                return [
                  bookId,
                  { title: "Truyện không còn khả dụng", coverUrl: undefined },
                ] as const;
              }
            }),
          );
          const titles = Object.fromEntries(books);

          if (!active) return;
          setItems({
            "Lịch sử": historyResult.items.map((item, index) => ({
              id: item.id,
              title: titles[item.book_id]?.title || "Truyện",
              coverUrl: titles[item.book_id]?.coverUrl,
              chapter: item.last_chapter_id
                ? `Chương ${item.chapters_read || 1}`
                : "Chưa có chương đọc",
              bookId: item.book_id,
              chapterId: item.last_chapter_id || undefined,
              scrollPosition: Number(item.scroll_position || 0),
              progressPercent: Number(item.progress_percent || 0),
              color: colors[index % colors.length],
              time: item.last_read_at,
            })),
            "Tủ truyện": bookmarkResult.items.map((item, index) => ({
              id: item.id,
              title: titles[item.book_id]?.title || "Truyện",
              coverUrl: titles[item.book_id]?.coverUrl,
              chapter: "Đã lưu",
              bookId: item.book_id,
              color: colors[index % colors.length],
            })),
            "Mua combo": purchaseResult.rows.map((item, index) => ({
              id: item.id,
              title: item.book_title || titles[item.book_id]?.title || "Truyện",
              coverUrl: titles[item.book_id]?.coverUrl,
              chapter:
                item.chapter_title || `Chương ${item.chapter_number || ""}`,
              bookId: item.book_id,
              chapterId: item.chapter_id,
              color: colors[index % colors.length],
            })),
            "Đánh giá": ratingResult.items.map((item, index) => ({
              id: item.id,
              title: item.book_title,
              coverUrl: titles[item.book_id]?.coverUrl,
              chapter: `${item.score}/5 sao`,
              bookId: item.book_id,
              color: colors[index % colors.length],
              score: item.score,
              time: item.updated_at || item.created_at,
            })),
          });
        } catch (loadError) {
          console.warn("library fetch failed", loadError);
          if (active) setError("Không tải được dữ liệu thư viện.");
        } finally {
          if (active) setLoading(false);
        }
      };

      void load();
      return () => {
        active = false;
      };
    }, [isAuthenticated]),
  );

  const data = items[activeTab] || [];

  const openItem = (item: LibraryItem) => {
    router.push({
      pathname: "/reader",
      params: {
        bookId: item.bookId,
        chapterId: item.chapterId,
        chapter: item.chapter.match(/\d+/)?.[0],
        scrollPosition:
          item.scrollPosition !== undefined
            ? String(item.scrollPosition)
            : undefined,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ThemedView style={styles.container}>
        <BackHeader title="Thư viện" style={styles.backHeader} />
        <View style={styles.header}>
          <ThemedText style={styles.caption}>Của bạn</ThemedText>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {tabs.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={styles.tab}
            >
              <Text
                style={[styles.tabText, activeTab === tab && styles.activeText]}
              >
                {tab}
              </Text>
              {activeTab === tab && <View style={styles.line} />}
            </Pressable>
          ))}
        </ScrollView>
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {loading
                ? "Đang tải dữ liệu..."
                : error ||
                  (isAuthenticated
                    ? "Chưa có dữ liệu trong mục này."
                    : "Đăng nhập để xem thư viện cá nhân.")}
            </Text>
          }
          renderItem={({ item }: { item: LibraryItem }) => (
            <Pressable style={styles.item} onPress={() => openItem(item)}>
              <BookCover
                uri={item.coverUrl}
                title={item.title}
                fallbackColor={item.color}
                style={styles.cover}
              />
              <View style={styles.info}>
                <ThemedText style={styles.title}>{item.title}</ThemedText>
                <Text style={styles.meta}>{item.chapter}</Text>
                {item.progressPercent ? (
                  <Text style={styles.meta}>
                    Đã đọc {Math.floor(item.progressPercent)}% chương
                  </Text>
                ) : null}
                {item.score ? (
                  <Text style={styles.rating}>★ {item.score}/5</Text>
                ) : null}
                {item.time && <Text style={styles.meta}>{item.time}</Text>}
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          )}
        />
      </ThemedView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F5F7FA" },
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  backHeader: {
    paddingHorizontal: 18,
    marginTop: 8,
  },
  header: {
    paddingTop: 8,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  caption: { color: "#6B7280" },
  tabs: { paddingHorizontal: 18, gap: 20, paddingVertical: 18 },
  tab: { alignItems: "center" },
  tabText: { color: "#6B7280", fontWeight: "600" },
  activeText: { color: "#0F766E" },
  line: {
    marginTop: 8,
    width: 44,
    height: 3,
    borderRadius: 99,
    backgroundColor: "#0EA5A4",
  },
  list: { padding: 14, gap: 10 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FFF",
    borderRadius: 18,
  },
  cover: {
    width: 62,
    height: 86,
    borderRadius: 12,
    marginRight: 12,
  },
  info: { flex: 1 },
  title: { fontWeight: "700", color: "#111827", marginBottom: 6 },
  meta: { color: "#6B7280", fontSize: 12, marginTop: 3 },
  rating: { color: "#C28719", fontSize: 12, fontWeight: "700", marginTop: 4 },
  arrow: { color: "#9CA3AF", fontSize: 28 },
  empty: { color: "#6B7280", textAlign: "center", padding: 28, lineHeight: 22 },
});

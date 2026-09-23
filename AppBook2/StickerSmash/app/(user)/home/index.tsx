import { useRouter } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/components/auth-provider";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { SafeAreaView } from "react-native-safe-area-context";

const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const homeApiResponse = {
  categories: [
    { id: "all", name: "Tất cả" },
    { id: "comic", name: "Truyện tranh" },
    { id: "fairy", name: "Cổ tích" },
    { id: "science", name: "Khoa học & Khám phá" },
    { id: "life", name: "Kỹ năng sống" },
    { id: "bilingual", name: "Sách song ngữ" },
  ],
  continueReading: {
    id: "continue-1",
    title: "Dế Mèn Phiêu Lưu Ký",
    author: "Tô Hoài",
    progress: 65,
    accent: "#F59E0B",
  },
  newBooks: [
    {
      id: "new-1",
      title: "Bí Mật Vùng Đất Mới",
      author: "Lan Anh",
      category: "Phiêu lưu",
      coverColor: "#F59E0B",
      publishedAt: "2 giờ trước",
      rating: 4.9,
    },
    {
      id: "new-2",
      title: "Cổng Trời Huyền Bí",
      author: "Hữu Minh",
      category: "Kỳ ảo",
      coverColor: "#A78BFA",
      publishedAt: "1 ngày trước",
      rating: 4.8,
    },
    {
      id: "new-3",
      title: "Từ Đêm Sáng Tạo",
      author: "Quỳnh Hà",
      category: "Kỹ năng",
      coverColor: "#34D399",
      publishedAt: "3 ngày trước",
      rating: 4.7,
    },
    {
      id: "new-4",
      title: "Khám Phá Không Gian",
      author: "Khoa Học VN",
      category: "Khoa học",
      coverColor: "#60A5FA",
      publishedAt: "5 ngày trước",
      rating: 4.9,
    },
  ],
  hotBooks: [
    {
      id: "hot-1",
      title: "Dế Mèn Phiêu Lưu Ký",
      author: "Tô Hoài",
      category: "Truyện cổ điển",
      coverColor: "#FBBF24",
      period: "30 ngày gần nhất",
      reads: 124000,
      purchases: 8600,
      likes: 47400,
      rating: 4.8,
    },
    {
      id: "hot-2",
      title: "Vùng Đất Của Những Giấc Mơ",
      author: "Minh Anh",
      category: "Truyện ngắn",
      coverColor: "#FB7185",
      period: "30 ngày gần nhất",
      reads: 98000,
      purchases: 7100,
      likes: 39200,
      rating: 4.7,
    },
    {
      id: "hot-3",
      title: "Khoa Học Cho Thiếu Nhi",
      author: "Khoa Học VN",
      category: "Khoa học",
      coverColor: "#38BDF8",
      period: "30 ngày gần nhất",
      reads: 112000,
      purchases: 9200,
      likes: 54100,
      rating: 4.9,
    },
  ],
  publishers: [
    {
      id: "publisher-1",
      name: "Mộc Nhi",
      avatarText: "MN",
      coverColor: "#34D399",
      followers: 18200,
      reads: 50200,
      storyCount: 24,
      specialty: "Truyện thiếu nhi",
    },
    {
      id: "publisher-2",
      name: "Bảo Châu",
      avatarText: "BC",
      coverColor: "#F472B6",
      followers: 26400,
      reads: 68200,
      storyCount: 18,
      specialty: "Khoa học & sáng tạo",
    },
    {
      id: "publisher-3",
      name: "Đông Thiên",
      avatarText: "DT",
      coverColor: "#60A5FA",
      followers: 21400,
      reads: 61100,
      storyCount: 31,
      specialty: "Truyện tranh",
    },
  ],
};

const openAllTab = (tab: string, router: ReturnType<typeof useRouter>) => {
  router.push({ pathname: "/(user)/home/explore", params: { tab } });
};

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  const greeting = isAuthenticated
    ? `Chào buổi sáng, ${user?.name ?? "bạn"}! 👋`
    : "Chào mừng bạn! 👋";

  const openBook = (title: string) => {
    router.push({ pathname: "/book-detail", params: { id: title } });
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
            />
            <Pressable style={styles.filterButton}>
              <ThemedText style={styles.filterIcon}>☰</ThemedText>
            </Pressable>
          </View>

          <Pressable
            style={styles.continueCard}
            onPress={() => openBook(homeApiResponse.continueReading.title)}
          >
            <View
              style={[
                styles.bookCover,
                { backgroundColor: homeApiResponse.continueReading.accent },
              ]}
            >
              <ThemedText style={styles.coverText}>
                {homeApiResponse.continueReading.title
                  .slice(0, 2)
                  .toUpperCase()}
              </ThemedText>
            </View>

            <View style={styles.bookInfo}>
              <ThemedText type="defaultSemiBold" style={styles.bookTitle}>
                {homeApiResponse.continueReading.title}
              </ThemedText>
              <ThemedText style={styles.authorText}>
                {homeApiResponse.continueReading.author}
              </ThemedText>
              <ThemedText style={styles.progressText}>
                Đã đọc {homeApiResponse.continueReading.progress}%
              </ThemedText>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${homeApiResponse.continueReading.progress}%`,
                    },
                  ]}
                />
              </View>
            </View>

            <Pressable
              style={styles.playButton}
              onPress={() =>
                router.push({
                  pathname: "/reader",
                  params: { chapter: "65" },
                })
              }
            >
              <ThemedText style={styles.playIcon}>▶</ThemedText>
            </Pressable>
          </Pressable>

          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">Danh mục</ThemedText>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
          >
            {homeApiResponse.categories.map((category) => (
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
            {homeApiResponse.newBooks.map((book) => (
              <Pressable
                key={book.id}
                style={styles.newBookCard}
                onPress={() => openBook(book.title)}
              >
                <View
                  style={[
                    styles.newBookCover,
                    { backgroundColor: book.coverColor },
                  ]}
                >
                  <ThemedText style={styles.newBookCoverText}>
                    {book.title.split(" ")[0]}
                  </ThemedText>
                </View>
                <ThemedText style={styles.newBookTitle}>
                  {book.title}
                </ThemedText>
                <ThemedText style={styles.newBookMeta}>
                  {book.author}
                </ThemedText>
                <View style={styles.newBookFooter}>
                  <ThemedText style={styles.newBookBadge}>
                    {book.category}
                  </ThemedText>
                  <ThemedText style={styles.newBookRating}>
                    ⭐ {book.rating}
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
              Tổng dữ liệu trong 30 ngày
            </ThemedText>
          </View>

          <View style={styles.hotList}>
            {homeApiResponse.hotBooks.map((book, index) => (
              <Pressable
                key={book.id}
                style={styles.hotBookCard}
                onPress={() => openBook(book.title)}
              >
                <View style={styles.hotRankBadge}>
                  <ThemedText style={styles.hotRankText}>
                    #{index + 1}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.hotBookCover,
                    { backgroundColor: book.coverColor },
                  ]}
                >
                  <ThemedText style={styles.hotBookCoverText}>
                    {book.title.split(" ")[0]}
                  </ThemedText>
                </View>
                <View style={styles.hotBookInfo}>
                  <ThemedText style={styles.hotBookTitle}>
                    {book.title}
                  </ThemedText>
                  <ThemedText style={styles.hotBookAuthor}>
                    {book.author}
                  </ThemedText>
                  <ThemedText style={styles.hotBookCategory}>
                    {book.category}
                  </ThemedText>
                  <View style={styles.hotMetricsRow}>
                    <ThemedText style={styles.hotMetric}>
                      👁 {formatCompactNumber(book.reads)}
                    </ThemedText>
                    <ThemedText style={styles.hotMetric}>
                      🛒 {formatCompactNumber(book.purchases)}
                    </ThemedText>
                    <ThemedText style={styles.hotMetric}>
                      ♥ {formatCompactNumber(book.likes)}
                    </ThemedText>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>

          <View style={styles.sectionHeaderRow}>
            <ThemedText type="subtitle">Người đăng nổi bật</ThemedText>
            <Pressable onPress={() => openAllTab("publishers", router)}>
              <ThemedText style={styles.viewAllText}>Xem tất cả</ThemedText>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalCardList}
          >
            {homeApiResponse.publishers.map((publisher) => (
              <View key={publisher.id} style={styles.publisherCard}>
                <View
                  style={[
                    styles.publisherAvatar,
                    { backgroundColor: publisher.coverColor },
                  ]}
                >
                  <ThemedText style={styles.publisherAvatarText}>
                    {publisher.avatarText}
                  </ThemedText>
                </View>
                <ThemedText style={styles.publisherName}>
                  {publisher.name}
                </ThemedText>
                <ThemedText style={styles.publisherSpecialty}>
                  {publisher.specialty}
                </ThemedText>
                <View style={styles.publisherStats}>
                  <ThemedText style={styles.publisherStat}>
                    👥 {formatCompactNumber(publisher.followers)}
                  </ThemedText>
                  <ThemedText style={styles.publisherStat}>
                    📖 {formatCompactNumber(publisher.reads)}
                  </ThemedText>
                </View>
                <ThemedText style={styles.publisherStat}>
                  📚 {publisher.storyCount} truyện
                </ThemedText>
              </View>
            ))}
          </ScrollView>
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
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  coverText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
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
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  newBookCoverText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
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
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  hotBookCoverText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
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

import { BackHeader } from "@/components/back-header";
import { BookCover } from "@/components/book-cover";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  getCategories,
  getFeaturedAuthors,
  listBooks,
} from "@/lib/discover-api";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const tabs = ["Danh mục", "Truyện mới", "Truyện hot", "Người đăng nổi bật"];
const compact = (value: number) =>
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

export default function HomeExploreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    tab?: string;
    category?: string;
    search?: string;
  }>();
  const routeTab =
    params.tab === "new"
      ? "Truyện mới"
      : params.tab === "hot"
        ? "Truyện hot"
        : params.tab === "publishers"
          ? "Người đăng nổi bật"
          : params.tab === "categories"
            ? "Danh mục"
            : undefined;
  const [selectedTab, setSelectedTab] = React.useState<{
    route: string | undefined;
    value: string;
  } | null>(null);
  const activeTab =
    selectedTab && selectedTab.route === params.tab
      ? selectedTab.value
      : (routeTab ?? "Danh mục");
  const [categories, setCategories] = React.useState<
    { id: string; name: string }[]
  >([]);
  const [books, setBooks] = React.useState<any[]>([]);
  const [featuredAuthors, setFeaturedAuthors] = React.useState<any[]>([]);
  const [categoryId, setCategoryId] = React.useState(
    String(params.category || "all"),
  );
  const [search, setSearch] = React.useState(String(params.search || ""));
  const [appliedSearch, setAppliedSearch] = React.useState(
    String(params.search || ""),
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const category =
    categories.find((item) => item.id === categoryId)?.name || "Tất cả";

  React.useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const { categories: categoryList } = await getCategories();
        const selectedCategoryId =
          categoryId === "all" ? undefined : categoryId;
        let nextBooks: any[] = [];
        let nextAuthors: any[] = [];

        if (activeTab === "Người đăng nổi bật") {
          const result = await getFeaturedAuthors(
            20,
            appliedSearch || undefined,
          );
          nextAuthors = result.authors;
        } else {
          const { rows } = await listBooks({
            limit: 30,
            search: appliedSearch || undefined,
            categoryId:
              activeTab === "Danh mục" ? selectedCategoryId : undefined,
            sortBy: activeTab === "Truyện hot" ? "hot" : "latest",
          });
          nextBooks = rows;
        }

        if (!active) return;

        const mappedCategories = [
          { id: "all", name: "Tất cả" },
          ...categoryList,
        ];
        setCategories(mappedCategories);
        setBooks(
          nextBooks.map((book: any, index: number) => ({
            ...book,
            color: getCoverColor(index),
            tag:
              book.categoryIds
                ?.map(
                  (id: string) =>
                    categoryList.find((item) => item.id === id)?.name,
                )
                .filter(Boolean)
                .join(" · ") || "Truyện",
          })),
        );
        setFeaturedAuthors(nextAuthors);
      } catch (error) {
        console.warn("explore fetch failed", error);
        if (active)
          setError(
            error instanceof Error
              ? error.message
              : "Không tải được dữ liệu khám phá.",
          );
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [activeTab, appliedSearch, categoryId]);

  const openBook = (id: string) =>
    router.push({ pathname: "/book-detail", params: { id } });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ThemedView style={styles.container}>
        <BackHeader title="Khám phá" style={styles.backHeader} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {tabs.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => {
                setLoading(true);
                setError("");
                setSelectedTab({ route: params.tab, value: tab });
              }}
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
        <View style={styles.search}>
          <Text>⌕</Text>
          <TextInput
            placeholder="Tìm tên truyện, tác giả, thẻ..."
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={() => {
              setLoading(true);
              setError("");
              setAppliedSearch(search.trim());
            }}
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? (
          <Text style={styles.loading}>Đang tải dữ liệu...</Text>
        ) : null}
        {activeTab === "Danh mục" && (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.pills}>
              {categories.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setLoading(true);
                    setError("");
                    setCategoryId(item.id);
                  }}
                  style={[
                    styles.pill,
                    categoryId === item.id && styles.selectedPill,
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      categoryId === item.id && styles.selectedText,
                    ]}
                  >
                    {item.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            <ThemedText type="subtitle">
              {category} · danh sách truyện
            </ThemedText>
            <FlatList
              data={books}
              horizontal
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.cards}
              renderItem={({ item }) => (
                <BookCard item={item} onPress={() => openBook(item.id)} />
              )}
            />
          </ScrollView>
        )}
        {activeTab === "Truyện mới" && (
          <ScrollView contentContainerStyle={styles.content}>
            <ThemedText type="subtitle">
              Mới đăng hoặc vừa cập nhật chương
            </ThemedText>
            <FlatList
              data={books}
              horizontal
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.cards}
              renderItem={({ item }) => (
                <BookCard
                  item={item}
                  onPress={() => openBook(item.id)}
                  meta={item.status || "Mới cập nhật"}
                />
              )}
            />
          </ScrollView>
        )}
        {activeTab === "Truyện hot" && (
          <ScrollView contentContainerStyle={styles.content}>
            {books.map((item, index) => (
              <Pressable
                key={item.id}
                style={styles.hotRow}
                onPress={() => openBook(item.id)}
              >
                <Text style={styles.rank}>#{index + 1}</Text>
                <View
                  style={styles.hotCover}
                >
                  <BookCover
                    uri={item.coverUrl}
                    title={item.title}
                    fallbackColor={item.color}
                    style={styles.hotCoverImage}
                  />
                </View>
                <View style={styles.info}>
                  <ThemedText style={styles.title}>{item.title}</ThemedText>
                  <Text style={styles.meta}>
                    {item.author || "Tác giả"} · {item.tag}
                  </Text>
                  <Text style={styles.metrics}>
                    👁 {compact(item.views || 0)} · 🛒{" "}
                    {compact(item.purchases || 0)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
        {activeTab === "Người đăng nổi bật" && (
          <ScrollView contentContainerStyle={styles.content}>
            <ThemedText type="subtitle">
              Người đăng tiêu biểu trong 30 ngày
            </ThemedText>
            <FlatList
              data={featuredAuthors}
              horizontal
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.cards}
              renderItem={({ item }) => (
                <View style={styles.publisher}>
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: getCoverColor(Number(item.id) % 6) },
                    ]}
                  >
                    <Text style={styles.avatarText}>
                      {(item.name || "A").slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <ThemedText style={styles.publisherName}>
                    {item.name || "Tác giả"}
                  </ThemedText>
                  <Text style={styles.meta}>{item.bookCount} truyện</Text>
                  <Text style={styles.metrics}>
                    👁 {compact(item.views)} đọc
                  </Text>
                  <Text style={styles.metrics}>
                    ♥ {compact(item.followers)} theo dõi
                  </Text>
                </View>
              )}
            />
          </ScrollView>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

function BookCard({
  item,
  onPress,
  meta,
}: {
  item: {
    id: string;
    title: string;
    coverUrl?: string;
    author?: string;
    tag?: string;
    color?: string;
  };
  onPress: () => void;
  meta?: string;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <BookCover
        uri={item.coverUrl}
        title={item.title}
        fallbackColor={item.color}
        style={styles.cover}
      />
      <ThemedText style={styles.title}>{item.title}</ThemedText>
      <Text style={styles.meta}>{item.author || "Tác giả"}</Text>
      <Text style={styles.metrics}>
        {item.tag || "Truyện"} {meta ? `· ${meta}` : "· ⭐ 4.8"}
      </Text>
    </Pressable>
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
    paddingTop: 28,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  close: { color: "#4F46E5", fontWeight: "700" },
  tabs: { paddingHorizontal: 18, gap: 18, paddingVertical: 18 },
  tab: { alignItems: "center" },
  tabText: { color: "#6B7280", fontWeight: "600", fontSize: 13 },
  activeText: { color: "#111827" },
  line: {
    marginTop: 8,
    height: 3,
    width: 48,
    borderRadius: 99,
    backgroundColor: "#4F46E5",
  },
  search: {
    marginHorizontal: 18,
    height: 50,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: { flex: 1, color: "#111827" },
  content: { padding: 18, paddingBottom: 40 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 22 },
  pill: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 99,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#FFF",
  },
  selectedPill: { backgroundColor: "#111827", borderColor: "#111827" },
  pillText: { color: "#374151", fontSize: 12, fontWeight: "600" },
  selectedText: { color: "#FFF" },
  cards: { gap: 12, paddingTop: 16, paddingRight: 10 },
  card: { width: 155, padding: 12, borderRadius: 18, backgroundColor: "#FFF" },
  cover: {
    height: 150,
    borderRadius: 13,
    marginBottom: 10,
  },
  title: { color: "#111827", fontWeight: "700", marginBottom: 4 },
  meta: { color: "#6B7280", fontSize: 12, marginBottom: 6 },
  metrics: { color: "#374151", fontSize: 11, lineHeight: 20 },
  error: { color: "#B44D4D", paddingHorizontal: 18, paddingTop: 8 },
  loading: { color: "#6B7280", paddingHorizontal: 18, paddingTop: 8 },
  hotRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginTop: 12,
  },
  rank: { width: 30, fontWeight: "700", color: "#111827" },
  hotCover: {
    width: 70,
    height: 92,
    marginRight: 12,
  },
  hotCoverImage: { flex: 1, borderRadius: 12 },
  info: { flex: 1 },
  publisher: {
    width: 180,
    padding: 16,
    backgroundColor: "#FFF",
    borderRadius: 18,
    alignItems: "center",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  avatarText: { color: "#FFF", fontWeight: "700", fontSize: 18 },
  publisherName: { fontWeight: "700", color: "#111827", marginBottom: 4 },
});

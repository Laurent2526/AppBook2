import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
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
const categories = [
  "Tất cả",
  "Truyện tranh",
  "Cổ tích",
  "Khoa học",
  "Kỹ năng sống",
  "Sách song ngữ",
];
const categoryIds: Record<string, string> = {
  all: "Tất cả",
  comic: "Truyện tranh",
  fairy: "Cổ tích",
  science: "Khoa học",
  life: "Kỹ năng sống",
  bilingual: "Sách song ngữ",
};
const books = [
  {
    id: "new-1",
    title: "Bí Mật Vùng Đất Mới",
    author: "Lan Anh",
    tag: "Phiêu lưu",
    color: "#F59E0B",
    updated: "2 giờ trước",
  },
  {
    id: "new-2",
    title: "Cổng Trời Huyền Bí",
    author: "Hữu Minh",
    tag: "Kỳ ảo",
    color: "#A78BFA",
    updated: "1 ngày trước",
  },
  {
    id: "new-3",
    title: "Từ Đêm Sáng Tạo",
    author: "Quỳnh Hà",
    tag: "Kỹ năng",
    color: "#34D399",
    updated: "3 ngày trước",
  },
  {
    id: "new-4",
    title: "Khám Phá Không Gian",
    author: "Khoa Học VN",
    tag: "Khoa học",
    color: "#60A5FA",
    updated: "5 ngày trước",
  },
];
const hotBooks = books.map((book, index) => ({
  ...book,
  reads: [124000, 112000, 98000, 90500][index],
  vipReads: [52000, 47600, 43100, 40300][index],
  likes: [47400, 54100, 39200, 35600][index],
}));
const publishers = [
  {
    id: "p1",
    name: "Mộc Nhi",
    initials: "MN",
    color: "#34D399",
    stories: 24,
    reads: 50200,
    followers: 26400,
    specialty: "Truyện thiếu nhi",
  },
  {
    id: "p2",
    name: "Bảo Châu",
    initials: "BC",
    color: "#F472B6",
    stories: 18,
    reads: 68200,
    followers: 31200,
    specialty: "Khoa học & sáng tạo",
  },
  {
    id: "p3",
    name: "Đông Thiên",
    initials: "DT",
    color: "#60A5FA",
    stories: 31,
    reads: 61100,
    followers: 19100,
    specialty: "Truyện tranh",
  },
];
const compact = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

export default function HomeExploreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; category?: string }>();
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
    selectedTab?.route === params.tab
      ? selectedTab.value
      : (routeTab ?? "Danh mục");
  const [category, setCategory] = React.useState(
    categoryIds[params.category ?? "all"] ?? "Tất cả",
  );
  const openBook = (title: string) =>
    router.push({ pathname: "/book-detail", params: { id: title } });
  const visibleBooks =
    category === "Tất cả"
      ? books
      : books.filter((book) =>
          book.tag
            .toLowerCase()
            .includes(
              category
                .toLowerCase()
                .replace("kỹ năng sống", "kỹ năng")
                .replace("khoa học", "khoa học"),
            ),
        );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.close}>Đóng</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {tabs.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setSelectedTab({ route: params.tab, value: tab })}
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
          />
        </View>
        {activeTab === "Danh mục" && (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.pills}>
              {categories.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setCategory(item)}
                  style={[
                    styles.pill,
                    category === item && styles.selectedPill,
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      category === item && styles.selectedText,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>
            <ThemedText type="subtitle">
              {category} · truyện có gắn tag
            </ThemedText>
            <FlatList
              data={visibleBooks}
              horizontal
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.cards}
              renderItem={({ item }) => (
                <BookCard item={item} onPress={() => openBook(item.title)} />
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
                  onPress={() => openBook(item.title)}
                  meta={item.updated}
                />
              )}
            />
          </ScrollView>
        )}
        {activeTab === "Truyện hot" && (
          <ScrollView contentContainerStyle={styles.content}>
            {hotBooks.map((item, index) => (
              <Pressable
                key={item.id}
                style={styles.hotRow}
                onPress={() => openBook(item.title)}
              >
                <Text style={styles.rank}>#{index + 1}</Text>
                <View
                  style={[styles.hotCover, { backgroundColor: item.color }]}
                >
                  <Text style={styles.coverText}>
                    {item.title.split(" ")[0]}
                  </Text>
                </View>
                <View style={styles.info}>
                  <ThemedText style={styles.title}>{item.title}</ThemedText>
                  <Text style={styles.meta}>
                    {item.author} · {item.tag}
                  </Text>
                  <Text style={styles.metrics}>
                    👁 {compact(item.reads)} 💎 {compact(item.vipReads)} ♥{" "}
                    {compact(item.likes)}
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
              data={publishers}
              horizontal
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.cards}
              renderItem={({ item }) => (
                <View style={styles.publisher}>
                  <View
                    style={[styles.avatar, { backgroundColor: item.color }]}
                  >
                    <Text style={styles.avatarText}>{item.initials}</Text>
                  </View>
                  <ThemedText style={styles.publisherName}>
                    {item.name}
                  </ThemedText>
                  <Text style={styles.meta}>{item.specialty}</Text>
                  <Text style={styles.metrics}>📚 {item.stories} truyện</Text>
                  <Text style={styles.metrics}>
                    👁 {compact(item.reads)} đọc
                  </Text>
                  <Text style={styles.metrics}>
                    👥 {compact(item.followers)} follow
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
  item: (typeof books)[number];
  onPress: () => void;
  meta?: string;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.cover, { backgroundColor: item.color }]}>
        <Text style={styles.coverText}>{item.title.split(" ")[0]}</Text>
      </View>
      <ThemedText style={styles.title}>{item.title}</ThemedText>
      <Text style={styles.meta}>{item.author}</Text>
      <Text style={styles.metrics}>
        {item.tag} {meta ? `· ${meta}` : "· ⭐ 4.8"}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F5F7FA" },
  container: { flex: 1, backgroundColor: "#F5F7FA" },
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
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  coverText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  title: { color: "#111827", fontWeight: "700", marginBottom: 4 },
  meta: { color: "#6B7280", fontSize: 12, marginBottom: 6 },
  metrics: { color: "#374151", fontSize: 11, lineHeight: 20 },
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
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
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

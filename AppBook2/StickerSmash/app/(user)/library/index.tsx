import { useAuth } from "@/components/auth-provider";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useRouter } from "expo-router";
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
const saved = [
  {
    id: "saved-1",
    title: "Dế Mèn Phiêu Lưu Ký",
    chapter: "Chương 12",
    color: "#F59E0B",
  },
  {
    id: "saved-2",
    title: "Cổng Trời Huyền Bí",
    chapter: "Chương 8",
    color: "#A78BFA",
  },
];
const purchases = [
  {
    id: "combo-1",
    title: "Combo Truyện phiêu lưu",
    chapter: "12 chương VIP",
    color: "#60A5FA",
  },
  {
    id: "combo-2",
    title: "Combo Khoa học thiếu nhi",
    chapter: "8 chương VIP",
    color: "#34D399",
  },
];
const reviews = [
  {
    id: "review-1",
    title: "Dế Mèn Phiêu Lưu Ký",
    chapter: "Đã đánh giá 5 sao",
    color: "#FBBF24",
  },
  {
    id: "review-2",
    title: "Khoa Học Cho Thiếu Nhi",
    chapter: "Đã đánh giá 4 sao",
    color: "#38BDF8",
  },
];

export default function LibraryScreen() {
  const router = useRouter();
  const { readingHistory } = useAuth();
  const [activeTab, setActiveTab] = React.useState("Lịch sử");
  const data =
    activeTab === "Lịch sử"
      ? readingHistory
      : activeTab === "Tủ truyện"
        ? saved
        : activeTab === "Mua combo"
          ? purchases
          : reviews;
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title">Thư viện</ThemedText>
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
              Chưa có lịch sử đọc. Hãy mở một truyện hoặc chương để lưu lại tại
              đây.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.item}
              onPress={() =>
                router.push({
                  pathname: "/reader",
                  params: {
                    bookId: item.title,
                    chapter: item.chapter.replace("Chương ", ""),
                  },
                })
              }
            >
              <View style={[styles.cover, { backgroundColor: item.color }]}>
                <Text style={styles.coverText}>
                  {item.title.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.info}>
                <ThemedText style={styles.title}>{item.title}</ThemedText>
                <Text style={styles.meta}>{item.chapter}</Text>
                {"time" in item && <Text style={styles.meta}>{item.time}</Text>}
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
  header: {
    paddingTop: 28,
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
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  coverText: { color: "#FFF", fontSize: 18, fontWeight: "700" },
  info: { flex: 1 },
  title: { fontWeight: "700", color: "#111827", marginBottom: 6 },
  meta: { color: "#6B7280", fontSize: 12, marginTop: 3 },
  arrow: { color: "#9CA3AF", fontSize: 28 },
  empty: { color: "#6B7280", textAlign: "center", padding: 28, lineHeight: 22 },
});

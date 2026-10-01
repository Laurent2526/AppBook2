import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackHeader } from "@/components/back-header";
import { getMyBooks, MyBook } from "@/lib/account-api";

export default function MyBooksScreen() {
  const router = useRouter();
  const [books, setBooks] = React.useState<MyBook[]>([]);
  const [summary, setSummary] = React.useState({
    total: 0,
    pending: 0,
    published: 0,
    rejected: 0,
    pendingDelete: 0,
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const result = await getMyBooks({ page: 1, limit: 50 });
        if (!active) return;
        setBooks(result.rows);
        setSummary(result.summary);
      } catch (error) {
        console.warn("my books fetch failed", error);
        Alert.alert(
          "Không tải được truyện của bạn",
          error instanceof Error ? error.message : "Vui lòng thử lại sau.",
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const openAddChapter = (bookId: string, bookTitle: string) => {
    router.push({
      pathname: "/(user)/account/add-chapter",
      params: { bookId, bookTitle },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackHeader title="Quản lý truyện" />

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{summary.pending}</Text>
            <Text style={styles.summaryLabel}>Đang duyệt</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{summary.published}</Text>
            <Text style={styles.summaryLabel}>Đã duyệt</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{summary.rejected}</Text>
            <Text style={styles.summaryLabel}>Bị từ chối</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push("/(user)/account/publish")}
          >
            <Text style={styles.primaryButtonText}>Đăng truyện mới</Text>
          </Pressable>

          <Pressable style={styles.ghostButton} onPress={() => router.back()}>
            <Text style={styles.ghostButtonText}>Quay lại</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Truyện của tôi</Text>
          <Text style={styles.sectionMeta}>{summary.total} quyển</Text>
        </View>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#0F766E" />
            <Text style={styles.loadingText}>Đang tải truyện của bạn...</Text>
          </View>
        ) : books.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Chưa có truyện nào</Text>
            <Text style={styles.emptyBody}>
              Hãy đăng truyện mới để bắt đầu quy trình kiểm duyệt và thêm
              chương.
            </Text>
          </View>
        ) : (
          books.map((book) => (
            <Pressable
              key={book.id}
              style={styles.bookCard}
              onPress={() => openAddChapter(book.id, book.title)}
            >
              <View style={styles.bookLeft}>
                <Text style={styles.bookTitle}>{book.title}</Text>
                <Text style={styles.bookMeta}>
                  {book.status === "published"
                    ? "Đã duyệt"
                    : book.status === "pending"
                      ? "Đang chờ duyệt"
                      : book.status === "rejected"
                        ? "Bị từ chối"
                        : book.status || "Chưa rõ trạng thái"}
                </Text>
              </View>
              <Text style={styles.bookAction}>+ Chương</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F6F7FB" },
  content: { padding: 20, gap: 14, backgroundColor: "#F6F7FB", flexGrow: 1 },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryCard: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryNumber: { color: "#111827", fontSize: 20, fontWeight: "700" },
  summaryLabel: { marginTop: 6, color: "#6B7280", fontSize: 12 },
  actions: { gap: 10 },
  primaryButton: {
    backgroundColor: "#0F766E",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  ghostButton: {
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  ghostButtonText: { color: "#374151", fontSize: 16, fontWeight: "700" },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  sectionTitle: { color: "#111827", fontSize: 18, fontWeight: "700" },
  sectionMeta: { color: "#6B7280", fontSize: 13 },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
  },
  loadingText: { color: "#374151", fontWeight: "600" },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emptyTitle: { color: "#111827", fontSize: 16, fontWeight: "700" },
  emptyBody: { color: "#6B7280", lineHeight: 22, marginTop: 8 },
  bookCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  bookLeft: { flex: 1, marginRight: 12 },
  bookTitle: { color: "#111827", fontSize: 16, fontWeight: "700" },
  bookMeta: { color: "#6B7280", marginTop: 6 },
  bookAction: { color: "#0F766E", fontWeight: "700" },
});

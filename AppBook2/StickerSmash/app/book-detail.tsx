import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/components/auth-provider";
import { getBookById, getBookChapters } from "@/lib/discover-api";

export default function BookDetailScreen() {
  const router = useRouter();
  const { isAuthenticated, recordReading } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [book, setBook] = React.useState<any>(null);
  const [chapters, setChapters] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      try {
        const [{ book: fetchedBook }, { chapters: fetchedChapters }] =
          await Promise.all([
            getBookById(String(id)),
            getBookChapters(String(id)),
          ]);

        if (!active) return;
        setBook(fetchedBook);
        setChapters(fetchedChapters || []);
      } catch (error) {
        console.warn("book detail fetch failed", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [id]);

  const title = book?.title || "Chi tiết truyện";
  const isPaidContent = chapters.some(
    (chapter) => Number(chapter.is_free) === 0,
  );

  React.useEffect(() => {
    if (id && title) {
      recordReading({
        id: `${id}-detail`,
        title,
        chapter: "Đã mở truyện",
        color: "#F59E0B",
      });
    }
  }, [id, recordReading, title]);

  const handleReadPress = () => {
    if (!id) return;

    const firstChapter =
      chapters.find((chapter) => Number(chapter.is_free) === 1) || chapters[0];
    const chapterId = firstChapter?.id ? String(firstChapter.id) : "1";
    const chapterNumber = firstChapter?.chapter_number
      ? String(firstChapter.chapter_number)
      : "1";

    recordReading({
      id: `${id}-book`,
      title,
      chapter: `Chương ${chapterNumber}`,
      color: "#F59E0B",
    });

    if (isPaidContent && !isAuthenticated) {
      Alert.alert(
        "Yêu cầu đăng nhập",
        "Bạn cần đăng nhập để đọc chương có phí. Chương miễn phí vẫn có thể đọc bình thường.",
        [
          { text: "Hủy", style: "cancel" },
          { text: "Đăng nhập", onPress: () => router.push("/auth") },
        ],
      );
      return;
    }

    router.push({
      pathname: "/reader",
      params: { bookId: id, chapterId, chapter: chapterNumber },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Quay lại</Text>
        </Pressable>
        <View style={styles.cover}>
          <Text style={styles.coverText}>
            {title.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{book?.author || "Tác giả"}</Text>
        <Text style={styles.description}>
          {book?.description ||
            "Thông tin và các chương của truyện đang được tải từ máy chủ."}
        </Text>
        <View style={styles.metaCard}>
          <Text style={styles.metaTitle}>Trạng thái truyện</Text>
          <Text style={styles.metaValue}>
            {isPaidContent ? "VIP / Có phí" : "Miễn phí"}
          </Text>
          <Text style={styles.metaHint}>
            {isPaidContent
              ? "Chỉ tài khoản đã đăng nhập mới được đọc nội dung trả phí."
              : "Truyện này có thể đọc miễn phí mà không cần đăng nhập."}
          </Text>
          <Text style={styles.metaHint}>Số chương: {chapters.length || 0}</Text>
        </View>
        <Pressable style={styles.primaryButton} onPress={handleReadPress}>
          <Text style={styles.primaryButtonText}>
            {loading ? "Đang tải..." : "Đọc truyện"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  content: { flex: 1, padding: 24 },
  back: { color: "#0F766E", fontSize: 16, fontWeight: "600" },
  cover: {
    width: 150,
    height: 210,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 44,
    borderRadius: 18,
    backgroundColor: "#F59E0B",
  },
  coverText: { color: "#FFFFFF", fontSize: 38, fontWeight: "700" },
  title: {
    marginTop: 24,
    color: "#111827",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    color: "#6B7280",
    fontSize: 14,
    textAlign: "center",
  },
  metaCard: {
    marginTop: 26,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  metaTitle: { color: "#6B7280", fontSize: 12, marginBottom: 8 },
  metaValue: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  description: {
    color: "#4B5563",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
  },
  metaHint: { color: "#4B5563", fontSize: 13, lineHeight: 20 },
  primaryButton: {
    marginTop: 28,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: "#0EA5A4",
    alignItems: "center",
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});

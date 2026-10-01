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
import { createBookmark, updateReadingHistory } from "@/lib/account-api";
import {
  getBookById,
  getBookChapters,
  getChapterById,
} from "@/lib/discover-api";

export default function ReaderScreen() {
  const router = useRouter();
  const { isAuthenticated, recordReading } = useAuth();
  const { bookId, chapter, chapterId } = useLocalSearchParams<{
    bookId?: string;
    chapter?: string;
    chapterId?: string;
  }>();
  const [book, setBook] = React.useState<any>(null);
  const [chapterData, setChapterData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        if (chapterId) {
          const { chapter: fetchedChapter } = await getChapterById(
            String(chapterId),
          );
          if (!active) return;
          setChapterData(fetchedChapter);
          if (fetchedChapter?.book_id) {
            const { book: fetchedBook } = await getBookById(
              String(fetchedChapter.book_id),
            );
            if (active) setBook(fetchedBook);
          }
          return;
        }

        if (!bookId) return;
        const { chapters } = await getBookChapters(String(bookId));
        const selected =
          chapters.find(
            (item: any) =>
              String(item.chapter_number) === String(chapter ?? "1"),
          ) || chapters[0];
        if (!active) return;
        if (selected) {
          setChapterData(selected);
          const { book: fetchedBook } = await getBookById(String(bookId));
          if (active) setBook(fetchedBook);
        }
      } catch (error) {
        console.warn("reader fetch failed", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [bookId, chapter, chapterId]);

  React.useEffect(() => {
    if (bookId && chapter) {
      recordReading({
        id: `${bookId}-${chapter}`,
        title: book?.title || bookId,
        chapter: `Chương ${chapter}`,
        color: "#F59E0B",
      });

      if (isAuthenticated) {
        updateReadingHistory(String(bookId), {
          lastChapterId: chapterId,
          chaptersRead: Number(chapter),
          progressPercent: "0.00",
        }).catch((error) =>
          console.warn("reading history update failed", error),
        );
      }
    }
  }, [bookId, chapter, chapterId, book, isAuthenticated, recordReading]);

  const requiresPurchase = Boolean(
    chapterData && Number(chapterData.is_free) === 0 && !chapterData.content,
  );

  const contentTitle = chapterData?.title || "Chương";
  const contentBody =
    chapterData?.content || "Nội dung chương đang được tải từ máy chủ.";

  if (requiresPurchase && !isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.back}>‹</Text>
            </Pressable>
            <Text style={styles.chapter}>Chương trả phí</Text>
            <View style={styles.spacer} />
          </View>

          <View style={styles.lockCard}>
            <Text style={styles.lockTitle}>Chương có phí</Text>
            <Text style={styles.lockBody}>
              Bạn cần đăng nhập để tiếp tục đọc nội dung trả phí. Tài khoản còn
              dùng để lưu truyện, bình luận, đánh giá và mua chương.
            </Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push("/auth")}
            >
              <Text style={styles.primaryButtonText}>Đăng nhập để đọc</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text style={styles.chapter}>
            Chương {chapter ?? chapterData?.chapter_number ?? "1"}
          </Text>
          <View style={styles.spacer} />
        </View>
        <Text style={styles.title}>
          {book?.title || bookId || "Đang đọc truyện"}
        </Text>
        <Text style={styles.subtitle}>{contentTitle}</Text>
        <Text style={styles.body}>
          {loading ? "Đang tải nội dung..." : contentBody}
        </Text>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => {
            if (!isAuthenticated) {
              Alert.alert(
                "Thông báo",
                "Bạn vẫn có thể đọc miễn phí, nhưng cần tài khoản để lưu truyện, bình luận và mua chương VIP.",
              );
              return;
            }
            createBookmark(String(bookId))
              .then(() =>
                Alert.alert(
                  "Đã lưu",
                  "Truyện đã được lưu vào tủ truyện của bạn.",
                ),
              )
              .catch((error) =>
                Alert.alert(
                  "Không thể lưu truyện",
                  error instanceof Error
                    ? error.message
                    : "Máy chủ đang gặp sự cố.",
                ),
              );
          }}
        >
          <Text style={styles.secondaryButtonText}>Lưu truyện</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFCF5" },
  content: { flex: 1, padding: 24 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: { color: "#0F766E", fontSize: 34, lineHeight: 34 },
  chapter: { color: "#374151", fontSize: 15, fontWeight: "700" },
  spacer: { width: 24 },
  title: { marginTop: 34, color: "#111827", fontSize: 24, fontWeight: "700" },
  subtitle: {
    marginTop: 14,
    color: "#0F766E",
    fontSize: 16,
    fontWeight: "700",
  },
  body: { marginTop: 16, color: "#374151", fontSize: 18, lineHeight: 32 },
  lockCard: {
    marginTop: 42,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  lockTitle: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  lockBody: {
    color: "#4B5563",
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 18,
  },
  primaryButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  secondaryButton: {
    marginTop: 24,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: { color: "#065F46", fontSize: 14, fontWeight: "700" },
});

import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  AppState,
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/components/auth-provider";
import {
  createBookmark,
  purchaseChapter,
  updateReadingHistory,
} from "@/lib/account-api";
import {
  getBookById,
  getBookChapters,
  getChapterById,
  recordChapterView,
} from "@/lib/discover-api";

export default function ReaderScreen() {
  const router = useRouter();
  const { isAuthenticated, recordReading } = useAuth();
  const { bookId, chapter, chapterId, scrollPosition } = useLocalSearchParams<{
    bookId?: string;
    chapter?: string;
    chapterId?: string;
    scrollPosition?: string;
  }>();
  const [book, setBook] = React.useState<any>(null);
  const [chapterData, setChapterData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [purchasing, setPurchasing] = React.useState(false);
  const [viewRecordingError, setViewRecordingError] = React.useState(false);
  const [viewRetryCount, setViewRetryCount] = React.useState(0);
  const scrollRef = React.useRef<ScrollView>(null);
  const scrollPositionRef = React.useRef(0);
  const contentHeightRef = React.useRef(0);
  const viewportHeightRef = React.useRef(0);
  const restorePositionRef = React.useRef<number | null>(null);
  const restoredChapterRef = React.useRef<string | null>(null);
  const recordedChapterViewRef = React.useRef<string | null>(null);
  const saveProgressTimerRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

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
          const [{ chapter: fetchedChapter }, { book: fetchedBook }] =
            await Promise.all([
              getChapterById(String(selected.id)),
              getBookById(String(bookId)),
            ]);
          if (active) {
            setChapterData(fetchedChapter);
            setBook(fetchedBook);
          }
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

  const activeChapterData =
    chapterData &&
    (!chapterId || String(chapterData.id) === String(chapterId)) &&
    (!bookId ||
      !chapterData.book_id ||
      String(chapterData.book_id) === String(bookId))
      ? chapterData
      : null;

  const requiresPurchase = Boolean(
    activeChapterData &&
      (activeChapterData.requiresPurchase ||
        (Number(activeChapterData.is_free) === 0 &&
          !activeChapterData.content)),
  );

  const contentTitle = activeChapterData?.title || "Chương";
  const contentBody = activeChapterData?.content
    ? String(activeChapterData.content)
        .replace(/\r\n?/g, "\n")
        .split(/\n\s*\n/)
        .map((paragraph: string) =>
          paragraph.replace(/[ \t]*\n[ \t]*/g, " ").trim(),
        )
        .join("\n\n")
    : "Nội dung chương đang được tải từ máy chủ.";
  const currentChapterId = activeChapterData?.id;
  const currentChapterNumber = activeChapterData?.chapter_number;
  const currentChapterViewKey =
    currentChapterId && (activeChapterData?.book_id || bookId)
      ? `${activeChapterData?.book_id || bookId}:${currentChapterId}`
      : null;
  const currentChapterKey =
    bookId && currentChapterId
      ? `${bookId}:${currentChapterId}:${scrollPosition ?? "0"}`
      : null;

  React.useEffect(() => {
    if (
      loading ||
      requiresPurchase ||
      !currentChapterViewKey ||
      (!activeChapterData?.content && !activeChapterData?.content_url) ||
      recordedChapterViewRef.current === currentChapterViewKey
    ) {
      return;
    }

    recordedChapterViewRef.current = currentChapterViewKey;
    void recordChapterView(String(currentChapterId))
      .then(() => setViewRecordingError(false))
      .catch((error) => {
        recordedChapterViewRef.current = null;
        setViewRecordingError(true);
        console.warn("chapter view recording failed", error);
      });
  }, [
    activeChapterData?.content,
    activeChapterData?.content_url,
    currentChapterId,
    currentChapterViewKey,
    loading,
    requiresPurchase,
    viewRetryCount,
  ]);

  const persistReadingProgress = React.useCallback(
    async (position: number) => {
      if (!isAuthenticated || !bookId || !currentChapterId) return;
      const maxScroll = Math.max(
        contentHeightRef.current - viewportHeightRef.current,
        0,
      );
      const progress =
        maxScroll > 0
          ? Math.min(100, Math.max(0, (position / maxScroll) * 100))
          : 0;
      try {
        await updateReadingHistory(String(bookId), {
          lastChapterId: String(currentChapterId),
          chaptersRead: Number(
            chapter ?? currentChapterNumber ?? 0,
          ),
          progressPercent: progress.toFixed(2),
          scrollPosition: Math.round(position),
        });
      } catch (error) {
        console.warn("reading progress save failed", error);
      }
    },
    [bookId, chapter, currentChapterId, currentChapterNumber, isAuthenticated],
  );

  React.useEffect(() => {
    if (!bookId || !activeChapterData?.id) return;
    const chapterNumber = String(
      chapter ?? activeChapterData.chapter_number ?? "1",
    );
    recordReading({
      id: `${bookId}-${chapterNumber}`,
      title: book?.title || String(bookId),
      chapter: `Chương ${chapterNumber}`,
      color: "#F59E0B",
    });
  }, [
    book?.title,
    bookId,
    chapter,
    activeChapterData?.chapter_number,
    activeChapterData?.id,
    recordReading,
  ]);

  React.useEffect(() => {
    if (!currentChapterKey) return;
    const initialPosition = Math.max(0, Number(scrollPosition) || 0);
    scrollPositionRef.current = initialPosition;
    restorePositionRef.current = initialPosition;
    restoredChapterRef.current = null;
    void persistReadingProgress(initialPosition);
  }, [
    currentChapterKey,
    persistReadingProgress,
    scrollPosition,
  ]);

  const handleReaderScroll = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const position = event.nativeEvent.contentOffset.y;
      scrollPositionRef.current = position;
      if (!isAuthenticated || !bookId || !activeChapterData?.id) return;
      if (saveProgressTimerRef.current) {
        clearTimeout(saveProgressTimerRef.current);
      }
      saveProgressTimerRef.current = setTimeout(() => {
        void persistReadingProgress(scrollPositionRef.current);
        saveProgressTimerRef.current = null;
      }, 1500);
    },
    [activeChapterData?.id, bookId, isAuthenticated, persistReadingProgress],
  );

  const restoreReadingPosition = React.useCallback(() => {
    const chapterKey = String(activeChapterData?.id ?? "");
    const position = restorePositionRef.current;
    if (
      !chapterKey ||
      position === null ||
      restoredChapterRef.current === chapterKey ||
      loading
    ) {
      return;
    }
    restoredChapterRef.current = chapterKey;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: position, animated: false });
    });
  }, [activeChapterData?.id, loading]);

  React.useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        if (saveProgressTimerRef.current) {
          clearTimeout(saveProgressTimerRef.current);
          saveProgressTimerRef.current = null;
        }
        void persistReadingProgress(scrollPositionRef.current);
      }
    });
    return () => {
      subscription.remove();
      if (saveProgressTimerRef.current) {
        clearTimeout(saveProgressTimerRef.current);
        saveProgressTimerRef.current = null;
        void persistReadingProgress(scrollPositionRef.current);
      }
    };
  }, [persistReadingProgress]);

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      router.push("/auth");
      return;
    }

    const id = String(activeChapterData?.id || chapterId || "");
    if (!id || purchasing) return;

    setPurchasing(true);
    try {
      await purchaseChapter(id);
      const { chapter: purchasedChapter } = await getChapterById(id);
      setChapterData(purchasedChapter);
      Alert.alert(
        "Mua thành công",
        "Chương đã được mở khóa trong tài khoản của bạn.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể mua chương.";
      if (message.toLowerCase().includes("số dư ví không đủ")) {
        Alert.alert("Số dư không đủ", "Nạp thêm tiền để mua và tiếp tục đọc.", [
          { text: "Để sau", style: "cancel" },
          {
            text: "Nạp tiền",
            onPress: () => router.push("/(user)/account/wallet"),
          },
        ]);
      } else {
        Alert.alert("Không thể mua chương", message);
      }
    } finally {
      setPurchasing(false);
    }
  };

  if (requiresPurchase) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          onScroll={handleReaderScroll}
          scrollEventThrottle={500}
          onLayout={(event) => {
            viewportHeightRef.current = event.nativeEvent.layout.height;
          }}
          onContentSizeChange={(_, height) => {
            contentHeightRef.current = height;
            restoreReadingPosition();
          }}
        >
          <View style={styles.header}>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.back}>‹</Text>
            </Pressable>
            <Text style={styles.chapter}>Chương trả phí</Text>
            <View style={styles.spacer} />
          </View>

          <View style={styles.lockCard}>
            <Text style={styles.lockTitle}>Chương trả phí</Text>
            <Text style={styles.lockBody}>
              {activeChapterData?.preview_text ||
                "Mua chương bằng số dư ví để đọc toàn bộ nội dung. Quyền đọc được cấp sau khi thanh toán thành công."}
            </Text>
            <Text style={styles.price}>
              Giá:{" "}
              {Number(activeChapterData?.price || 0).toLocaleString("vi-VN")} đ
            </Text>
            <Pressable
              style={[
                styles.primaryButton,
                purchasing && styles.disabledButton,
              ]}
              onPress={() => void handlePurchase()}
              disabled={purchasing}
            >
              <Text style={styles.primaryButtonText}>
                {purchasing
                  ? "Đang xử lý..."
                  : isAuthenticated
                    ? "Mua chương bằng ví"
                    : "Đăng nhập để mua"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        onScroll={handleReaderScroll}
        scrollEventThrottle={500}
        onLayout={(event) => {
          viewportHeightRef.current = event.nativeEvent.layout.height;
        }}
        onContentSizeChange={(_, height) => {
          contentHeightRef.current = height;
          restoreReadingPosition();
        }}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text style={styles.chapter}>
            Chương {chapter ?? activeChapterData?.chapter_number ?? "1"}
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
        {viewRecordingError ? (
          <Pressable
            onPress={() => setViewRetryCount((count) => count + 1)}
          >
            <Text style={styles.viewError}>
              Không ghi nhận được lượt đọc. Nhấn để thử lại.
            </Text>
          </Pressable>
        ) : null}

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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFCF5" },
  content: { flexGrow: 1, padding: 24 },
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
  body: {
    marginTop: 16,
    color: "#374151",
    fontSize: 18,
    lineHeight: 32,
  },
  viewError: {
    marginTop: 10,
    color: "#B91C1C",
    fontSize: 14,
    textDecorationLine: "underline",
  },
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
  price: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  disabledButton: { opacity: 0.6 },
  secondaryButton: {
    marginTop: 24,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: { color: "#065F46", fontSize: 14, fontWeight: "700" },
});

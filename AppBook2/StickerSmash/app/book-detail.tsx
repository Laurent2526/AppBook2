import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/components/auth-provider";
import { BookCover } from "@/components/book-cover";
import { followTarget, getBookById, getBookChapters } from "@/lib/discover-api";
import {
  BookComment,
  createBookComment,
  getBookComments,
  getMyRatings,
  rateBook,
  reportTarget,
} from "@/lib/interaction-api";

export default function BookDetailScreen() {
  const router = useRouter();
  const { isAuthenticated, recordReading } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [book, setBook] = React.useState<any>(null);
  const [chapters, setChapters] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [followingBook, setFollowingBook] = React.useState(false);
  const [followingAuthor, setFollowingAuthor] = React.useState(false);
  const [followBusy, setFollowBusy] = React.useState(false);
  const [comments, setComments] = React.useState<BookComment[]>([]);
  const [commentDraft, setCommentDraft] = React.useState("");
  const [rating, setRating] = React.useState(0);
  const [interactionBusy, setInteractionBusy] = React.useState(false);

  React.useEffect(() => {
    if (!id) {
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

  React.useEffect(() => {
    if (!id) return;
    let active = true;
    getBookComments(String(id))
      .then((result) => {
        if (active) setComments(result.items);
      })
      .catch((error) => console.warn("book comments fetch failed", error));
    if (isAuthenticated) {
      getMyRatings()
        .then((result) => {
          const ownRating = result.items.find(
            (item) => item.book_id === String(id),
          );
          if (active && ownRating) setRating(ownRating.score);
        })
        .catch((error) => console.warn("user ratings fetch failed", error));
    }
    return () => {
      active = false;
    };
  }, [id, isAuthenticated]);

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

  const openChapter = (chapter: any) => {
    if (!id || !chapter?.id) return;
    const chapterId = String(chapter.id);
    const chapterNumber = String(chapter.chapter_number || "1");

    recordReading({
      id: `${id}-book`,
      title,
      chapter: `Chương ${chapterNumber}`,
      color: "#F59E0B",
    });

    router.push({
      pathname: "/reader",
      params: { bookId: id, chapterId, chapter: chapterNumber },
    });
  };

  const handleReadPress = () => {
    if (loading) return;
    const firstChapter =
      chapters.find((chapter) => Number(chapter.is_free) === 1) || chapters[0];
    if (!firstChapter) {
      Alert.alert("Chưa có chương", "Truyện hiện chưa có chương được phát hành.");
      return;
    }
    openChapter(firstChapter);
  };

  const handleFollow = async (targetType: "account" | "book") => {
    if (!isAuthenticated) {
      Alert.alert(
        "Yêu cầu đăng nhập",
        "Đăng nhập để theo dõi truyện và người đăng.",
        [
          { text: "Để sau", style: "cancel" },
          { text: "Đăng nhập", onPress: () => router.push("/auth") },
        ],
      );
      return;
    }

    const targetId = targetType === "book" ? book?.id : book?.ownerId;
    if (!targetId || followBusy) return;
    setFollowBusy(true);
    try {
      await followTarget(targetType, String(targetId));
      if (targetType === "book") setFollowingBook(true);
      else setFollowingAuthor(true);
      Alert.alert(
        "Đã theo dõi",
        targetType === "book"
          ? "Truyện đã được thêm vào mục theo dõi."
          : "Người đăng đã được thêm vào mục theo dõi.",
      );
    } catch (error) {
      Alert.alert(
        "Không thể theo dõi",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    } finally {
      setFollowBusy(false);
    }
  };

  const handleRate = async (score: number) => {
    if (!isAuthenticated) {
      Alert.alert("Yêu cầu đăng nhập", "Đăng nhập để đánh giá truyện.", [
        { text: "Để sau", style: "cancel" },
        { text: "Đăng nhập", onPress: () => router.push("/auth") },
      ]);
      return;
    }
    if (!id || interactionBusy) return;
    setInteractionBusy(true);
    try {
      await rateBook(String(id), score);
      setRating(score);
      Alert.alert("Đã ghi nhận", "Cảm ơn bạn đã đánh giá truyện.");
    } catch (error) {
      Alert.alert(
        "Không thể đánh giá",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    } finally {
      setInteractionBusy(false);
    }
  };

  const submitComment = async () => {
    if (!isAuthenticated) {
      Alert.alert("Yêu cầu đăng nhập", "Đăng nhập để bình luận truyện.", [
        { text: "Để sau", style: "cancel" },
        { text: "Đăng nhập", onPress: () => router.push("/auth") },
      ]);
      return;
    }
    if (!id || !commentDraft.trim() || interactionBusy) return;
    setInteractionBusy(true);
    try {
      await createBookComment(String(id), commentDraft.trim());
      setCommentDraft("");
      setComments((await getBookComments(String(id))).items);
    } catch (error) {
      Alert.alert(
        "Không thể gửi bình luận",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    } finally {
      setInteractionBusy(false);
    }
  };

  const reportBook = () => {
    if (!id) return;
    Alert.alert("Báo cáo truyện", "Chọn lý do báo cáo", [
      { text: "Bản quyền", onPress: () => void sendReport("copyright") },
      {
        text: "Nội dung nhạy cảm",
        onPress: () => void sendReport("sensitive_content"),
      },
      { text: "Spam", onPress: () => void sendReport("spam") },
      { text: "Khác", onPress: () => void sendReport("other") },
      { text: "Hủy", style: "cancel" },
    ]);
  };

  const sendReport = async (
    reason:
      | "copyright"
      | "sensitive_content"
      | "spam"
      | "hate_speech"
      | "harassment"
      | "misinformation"
      | "other",
    commentId?: string,
  ) => {
    if (!isAuthenticated) {
      router.push("/auth");
      return;
    }
    try {
      await reportTarget(
        commentId ? "comment" : "book",
        commentId || String(id),
        reason,
      );
      Alert.alert(
        "Đã gửi báo cáo",
        "Báo cáo đã được chuyển đến bộ phận kiểm duyệt.",
      );
    } catch (error) {
      Alert.alert(
        "Không thể báo cáo",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Quay lại</Text>
        </Pressable>
        <BookCover uri={book?.coverUrl} title={title} style={styles.cover} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{book?.author || "Tác giả"}</Text>
        <Text style={styles.description}>
          {book?.description ||
            "Thông tin và các chương của truyện đang được tải từ máy chủ."}
        </Text>
        <Pressable style={styles.reportButton} onPress={reportBook}>
          <Text style={styles.reportButtonText}>Báo cáo truyện</Text>
        </Pressable>
        <View style={styles.followActions}>
          <Pressable
            style={[
              styles.followButton,
              followingBook && styles.followedButton,
            ]}
            disabled={followBusy || followingBook}
            onPress={() => void handleFollow("book")}
          >
            <Text
              style={[
                styles.followButtonText,
                followingBook && styles.followedText,
              ]}
            >
              {followingBook ? "Đang theo dõi truyện" : "Theo dõi truyện"}
            </Text>
          </Pressable>
          {book?.ownerId ? (
            <Pressable
              style={[
                styles.followButton,
                followingAuthor && styles.followedButton,
              ]}
              disabled={followBusy || followingAuthor}
              onPress={() => void handleFollow("account")}
            >
              <Text
                style={[
                  styles.followButtonText,
                  followingAuthor && styles.followedText,
                ]}
              >
                {followingAuthor ? "Đang theo dõi tác giả" : "Theo dõi tác giả"}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.metaCard}>
          <Text style={styles.metaTitle}>Trạng thái truyện</Text>
          <Text style={styles.metaValue}>
            {isPaidContent ? "VIP / Có phí" : "Miễn phí"}
          </Text>
          <Text style={styles.metaHint}>
            {isPaidContent
              ? "Chương miễn phí có thể đọc ngay. Chương có phí cần mua bằng số dư ví trước khi đọc."
              : "Truyện này có thể đọc miễn phí mà không cần đăng nhập."}
          </Text>
          <Text style={styles.metaHint}>Số chương: {chapters.length || 0}</Text>
        </View>
        <View style={styles.interactionSection}>
          <Text style={styles.sectionTitle}>Danh sách chương</Text>
          {chapters.map((chapter) => {
            const free = Number(chapter.is_free) === 1;
            const chapterNumber = chapter.chapter_number || "?";
            return (
              <Pressable
                key={String(chapter.id)}
                style={styles.chapterRow}
                onPress={() => openChapter(chapter)}
                accessibilityRole="button"
                accessibilityLabel={
                  free
                    ? `Đọc miễn phí chương ${chapterNumber}`
                    : `Mua chương ${chapterNumber} để đọc`
                }
              >
                <View style={styles.chapterCopy}>
                  <Text style={styles.chapterTitle}>
                    Chương {chapterNumber}: {chapter.title || "Chưa đặt tên"}
                  </Text>
                  <Text style={styles.chapterAccess}>
                    {free
                      ? "Đọc miễn phí"
                      : `Mua để đọc · ${Number(chapter.price || 0).toLocaleString("vi-VN")} đ`}
                  </Text>
                </View>
                <Text style={styles.chapterArrow}>›</Text>
              </Pressable>
            );
          })}
          {!loading && chapters.length === 0 ? (
            <Text style={styles.emptyComments}>Truyện chưa có chương.</Text>
          ) : null}
        </View>
        <View style={styles.interactionSection}>
          <Text style={styles.sectionTitle}>Đánh giá của bạn</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((score) => (
              <Pressable
                key={score}
                accessibilityLabel={`Đánh giá ${score} sao`}
                disabled={interactionBusy}
                onPress={() => void handleRate(score)}
              >
                <Text
                  style={[styles.star, score <= rating && styles.starActive]}
                >
                  ★
                </Text>
              </Pressable>
            ))}
            {isAuthenticated && rating > 0 ? (
              <Text style={styles.ratingValue}>{rating}/5</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.interactionSection}>
          <Text style={styles.sectionTitle}>Bình luận ({comments.length})</Text>
          <View style={styles.commentComposer}>
            <TextInput
              style={styles.commentInput}
              value={commentDraft}
              onChangeText={setCommentDraft}
              placeholder="Chia sẻ cảm nhận về truyện..."
              multiline
              maxLength={5000}
            />
            <Pressable
              style={styles.commentSubmit}
              disabled={!commentDraft.trim() || interactionBusy}
              onPress={() => void submitComment()}
            >
              <Text style={styles.commentSubmitText}>Gửi</Text>
            </Pressable>
          </View>
          {comments.map((comment) => (
            <View key={comment.id} style={styles.commentRow}>
              <View style={styles.commentCopy}>
                <Text style={styles.commentAuthor}>
                  {comment.account_name ||
                    comment.account_username ||
                    `Người đọc ${comment.account_id}`}
                </Text>
                <Text style={styles.commentContent}>{comment.content}</Text>
                <Text style={styles.commentDate}>
                  {new Date(comment.created_at).toLocaleDateString("vi-VN")}
                </Text>
              </View>
              <Pressable onPress={() => void sendReport("spam", comment.id)}>
                <Text style={styles.reportButtonText}>Báo cáo</Text>
              </Pressable>
            </View>
          ))}
          {comments.length === 0 ? (
            <Text style={styles.emptyComments}>Chưa có bình luận.</Text>
          ) : null}
        </View>
        <Pressable
          style={[styles.primaryButton, loading && styles.disabledButton]}
          onPress={handleReadPress}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? "Đang tải..." : "Đọc truyện"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  content: { flexGrow: 1, padding: 24, paddingBottom: 40 },
  scroll: { flex: 1 },
  back: { color: "#0F766E", fontSize: 16, fontWeight: "600" },
  cover: {
    width: 150,
    height: 210,
    alignSelf: "center",
    marginTop: 44,
    borderRadius: 18,
  },
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
  reportButton: {
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  reportButtonText: { color: "#9A514A", fontSize: 12, fontWeight: "700" },
  interactionSection: { marginTop: 22 },
  sectionTitle: {
    color: "#1F3431",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 10,
  },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  star: { color: "#C9D2D0", fontSize: 28 },
  starActive: { color: "#E0A42E" },
  ratingValue: { color: "#6B7280", fontSize: 13, marginLeft: 5 },
  commentComposer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 12,
  },
  commentInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    color: "#1F2937",
    textAlignVertical: "top",
  },
  commentSubmit: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 9,
    backgroundColor: "#0F766E",
  },
  commentSubmitText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E8EEEC",
  },
  commentCopy: { flex: 1, gap: 4 },
  commentAuthor: { color: "#263B39", fontSize: 13, fontWeight: "700" },
  commentContent: { color: "#465653", fontSize: 13, lineHeight: 19 },
  commentDate: { color: "#8B9794", fontSize: 10 },
  emptyComments: { color: "#798783", fontSize: 13, paddingVertical: 15 },
  chapterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  chapterCopy: { flex: 1, gap: 5 },
  chapterTitle: { color: "#263B39", fontSize: 14, fontWeight: "700" },
  chapterAccess: { color: "#0F766E", fontSize: 12, fontWeight: "600" },
  chapterArrow: { color: "#0F766E", fontSize: 24, marginLeft: 12 },
  followActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  followButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#0F766E",
    backgroundColor: "#FFFFFF",
  },
  followedButton: { backgroundColor: "#E8F5F2", borderColor: "#B9DED6" },
  followButtonText: { color: "#0F766E", fontSize: 12, fontWeight: "700" },
  followedText: { color: "#52736D" },
  metaHint: { color: "#4B5563", fontSize: 13, lineHeight: 20 },
  primaryButton: {
    marginTop: 28,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: "#0EA5A4",
    alignItems: "center",
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  disabledButton: { opacity: 0.6 },
});

import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { createChapter } from "@/lib/account-api";

export default function AddChapterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    bookId?: string;
    bookTitle?: string;
  }>();
  const [bookId, setBookId] = React.useState("");
  const [chapterNumber, setChapterNumber] = React.useState("1");
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [isFree, setIsFree] = React.useState(true);
  const [price, setPrice] = React.useState("0");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    const selectedBookId = Array.isArray(params.bookId)
      ? params.bookId[0]
      : params.bookId;
    if (selectedBookId) setBookId(selectedBookId);
  }, [params.bookId]);

  const submit = async () => {
    if (!bookId.trim()) {
      Alert.alert("Thiếu dữ liệu", "Hãy nhập ID truyện cần thêm chương.");
      return;
    }

    if (!title.trim() || !content.trim()) {
      Alert.alert(
        "Thiếu nội dung",
        "Hãy nhập tiêu đề chương và nội dung chương trước khi gửi duyệt.",
      );
      return;
    }

    if (!isFree && (!price.trim() || Number(price) <= 0)) {
      Alert.alert("Giá không hợp lệ", "Chương trả phí phải có giá lớn hơn 0.");
      return;
    }

    setSubmitting(true);
    try {
      await createChapter(bookId.trim(), {
        chapterNumber: Number(chapterNumber) || 1,
        title: title.trim(),
        content: content.trim(),
        previewText: content.trim().slice(0, 2000),
        isFree,
        price: isFree ? "0.00" : Number(price).toFixed(2),
      });

      Alert.alert(
        "Đã gửi",
        "Chương mới đã được gửi để người kiểm duyệt xét duyệt.",
        [{ text: "OK", onPress: () => router.back() }],
      );

      setBookId("");
      setChapterNumber("1");
      setTitle("");
      setContent("");
      setIsFree(true);
      setPrice("0");
    } catch (error) {
      Alert.alert(
        "Không thể thêm chương",
        error instanceof Error ? error.message : "Máy chủ đang gặp sự cố.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Quay lại</Text>
        </Pressable>

        <Text style={styles.title}>Thêm chương mới</Text>

        {params.bookTitle ? (
          <View style={styles.bookTag}>
            <Text style={styles.bookTagLabel}>Đang thêm cho truyện:</Text>
            <Text style={styles.bookTagValue}>{params.bookTitle}</Text>
          </View>
        ) : null}

        {!bookId ? (
          <TextInput
            style={styles.input}
            placeholder="ID truyện"
            value={bookId}
            onChangeText={setBookId}
            keyboardType="numeric"
          />
        ) : (
          <View style={styles.idBox}>
            <Text style={styles.idLabel}>ID truyện đang chọn</Text>
            <Text style={styles.idValue}>{bookId}</Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Số chương"
          value={chapterNumber}
          onChangeText={setChapterNumber}
          keyboardType="numeric"
        />

        <TextInput
          style={styles.input}
          placeholder="Tiêu đề chương"
          value={title}
          onChangeText={setTitle}
        />

        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggle, isFree && styles.toggleActive]}
            onPress={() => setIsFree(true)}
          >
            <Text
              style={[styles.toggleText, isFree && styles.toggleTextActive]}
            >
              Miễn phí
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggle, !isFree && styles.toggleActive]}
            onPress={() => setIsFree(false)}
          >
            <Text
              style={[styles.toggleText, !isFree && styles.toggleTextActive]}
            >
              Trả phí
            </Text>
          </Pressable>
        </View>

        {!isFree && (
          <TextInput
            style={styles.input}
            placeholder="Giá chương (VD: 10000)"
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
          />
        )}

        <TextInput
          style={[styles.input, styles.contentInput]}
          placeholder="Nội dung chương"
          multiline
          value={content}
          onChangeText={setContent}
        />

        <Pressable style={styles.button} onPress={submit} disabled={submitting}>
          <Text style={styles.buttonText}>
            {submitting ? "Đang gửi..." : "Gửi để duyệt"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F6F7FB" },
  content: { padding: 20, gap: 14, backgroundColor: "#F6F7FB", flexGrow: 1 },
  backButton: { alignSelf: "flex-start", marginBottom: 8 },
  backText: { color: "#0F766E", fontSize: 16, fontWeight: "600" },
  title: { color: "#111827", fontSize: 28, fontWeight: "700", marginBottom: 8 },
  bookTag: {
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  bookTagLabel: { color: "#065F46", fontWeight: "600" },
  bookTagValue: { color: "#064E3B", marginTop: 6, fontWeight: "700" },
  input: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    color: "#111827",
  },
  idBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  idLabel: { color: "#6B7280", fontSize: 12 },
  idValue: { color: "#111827", fontWeight: "700", marginTop: 4 },
  toggleRow: { flexDirection: "row", gap: 10 },
  toggle: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  toggleActive: { backgroundColor: "#0F766E", borderColor: "#0F766E" },
  toggleText: { color: "#374151", fontWeight: "600" },
  toggleTextActive: { color: "#FFFFFF" },
  contentInput: { minHeight: 220, paddingTop: 16, textAlignVertical: "top" },
  button: {
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#0F766E",
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});

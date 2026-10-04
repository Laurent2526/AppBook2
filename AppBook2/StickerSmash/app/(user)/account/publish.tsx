import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
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

import { BookCover } from "@/components/book-cover";
import { createBook, createChapter } from "@/lib/account-api";
import { getCategories } from "@/lib/discover-api";

export default function PublishScreen() {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [authorName, setAuthorName] = React.useState("");
  const [cover, setCover] = React.useState<{
    uri: string;
    name?: string;
    type?: string;
  } | null>(null);
  const [description, setDescription] = React.useState("");
  const [chapterTitle, setChapterTitle] = React.useState("");
  const [chapterContent, setChapterContent] = React.useState("");
  const [chapterIsFree, setChapterIsFree] = React.useState(true);
  const [chapterPrice, setChapterPrice] = React.useState("0");
  const [categories, setCategories] = React.useState<
    { id: string; name: string }[]
  >([]);
  const [categoryId, setCategoryId] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    getCategories()
      .then((data) => setCategories(data.categories))
      .catch((error) => console.warn("categories fetch failed", error));
  }, []);

  const submit = async () => {
    if (!title.trim() || !categoryId) {
      Alert.alert(
        "Thiếu thông tin",
        "Hãy nhập tên truyện và chọn một thể loại.",
      );
      return;
    }

    if (!chapterTitle.trim() || !chapterContent.trim()) {
      Alert.alert(
        "Thiếu chương đầu",
        "Bạn phải nhập tiêu đề và nội dung của chương đầu tiên để gửi đi xét duyệt.",
      );
      return;
    }

    if (!chapterIsFree && (!chapterPrice.trim() || Number(chapterPrice) <= 0)) {
      Alert.alert(
        "Giá chương không hợp lệ",
        "Vui lòng nhập giá chương lớn hơn 0 khi chọn dạng trả phí.",
      );
      return;
    }

    setSubmitting(true);
    let failedStep = "gửi thông tin truyện";
    try {
      const createdBook = await createBook({
        title: title.trim(),
        authorName: authorName.trim() || undefined,
        cover: cover ?? undefined,
        description: description.trim() || undefined,
        categoryIds: [Number(categoryId)],
      });

      const bookId = String((createdBook as any)?.book?.id ?? "");
      if (!bookId) {
        throw new Error("Máy chủ không trả về ID truyện sau khi tạo.");
      }

      failedStep = "gửi chương đầu tiên";
      await createChapter(bookId, {
        chapterNumber: 1,
        title: chapterTitle.trim(),
        content: chapterContent.trim(),
        previewText: description.trim().slice(0, 2000) || undefined,
        isFree: chapterIsFree,
        price: chapterIsFree ? "0.00" : Number(chapterPrice).toFixed(2),
      });

      Alert.alert(
        "Đã gửi",
        "Truyện và chương đầu tiên đã được gửi để người kiểm duyệt xét duyệt.",
      );
      setTitle("");
      setAuthorName("");
      setCover(null);
      setDescription("");
      setChapterTitle("");
      setChapterContent("");
      setChapterIsFree(true);
      setChapterPrice("0");
      setCategoryId(null);
    } catch (error) {
      Alert.alert(
        "Không thể tạo truyện",
        `${failedStep}: ${
          error instanceof Error ? error.message : "Máy chủ đang gặp sự cố."
        }`,
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
        <Text style={styles.title}>Đăng truyện</Text>
        <TextInput
          style={styles.input}
          placeholder="Tên truyện"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={styles.input}
          placeholder="Tác giả"
          value={authorName}
          onChangeText={setAuthorName}
        />
        <Pressable
          style={styles.input}
          onPress={async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              allowsEditing: true,
              quality: 0.85,
            });
            if (!result.canceled) {
              const asset = result.assets[0];
              setCover({
                uri: asset.uri,
                name: asset.fileName ?? "cover.jpg",
                type: asset.mimeType ?? "image/jpeg",
              });
            }
          }}
        >
          <View style={styles.coverPickerContent}>
            {cover ? (
              <BookCover
                uri={cover.uri}
                title={title || "Ảnh bìa"}
                style={styles.coverPreview}
              />
            ) : null}
            <Text>{cover ? "Đã chọn ảnh bìa" : "Chọn ảnh bìa"}</Text>
          </View>
        </Pressable>
        <Text style={styles.sectionLabel}>Chọn thể loại</Text>
        <View style={styles.categories}>
          {categories.map((category) => (
            <Pressable
              key={category.id}
              style={[
                styles.category,
                categoryId === category.id && styles.categorySelected,
              ]}
              onPress={() => setCategoryId(category.id)}
            >
              <Text
                style={[
                  styles.categoryText,
                  categoryId === category.id && styles.categoryTextSelected,
                ]}
              >
                {category.name}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Mô tả truyện"
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.sectionLabel}>Chương đầu tiên</Text>
        <TextInput
          style={styles.input}
          placeholder="Tiêu đề chương 1"
          value={chapterTitle}
          onChangeText={setChapterTitle}
        />

        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggle, chapterIsFree && styles.toggleActive]}
            onPress={() => setChapterIsFree(true)}
          >
            <Text
              style={[
                styles.toggleText,
                chapterIsFree && styles.toggleTextActive,
              ]}
            >
              Miễn phí
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggle, !chapterIsFree && styles.toggleActive]}
            onPress={() => setChapterIsFree(false)}
          >
            <Text
              style={[
                styles.toggleText,
                !chapterIsFree && styles.toggleTextActive,
              ]}
            >
              Trả phí
            </Text>
          </Pressable>
        </View>

        {!chapterIsFree && (
          <TextInput
            style={styles.input}
            placeholder="Giá chương (VD: 10000)"
            keyboardType="numeric"
            value={chapterPrice}
            onChangeText={setChapterPrice}
          />
        )}

        <TextInput
          style={[styles.input, styles.chapterContent]}
          placeholder="Nội dung chương 1"
          multiline
          value={chapterContent}
          onChangeText={setChapterContent}
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
  coverPickerContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  coverPreview: { width: 52, height: 72, borderRadius: 8 },
  backButton: { alignSelf: "flex-start", marginBottom: 8 },
  backText: { color: "#0F766E", fontSize: 16, fontWeight: "600" },
  title: { color: "#111827", fontSize: 28, fontWeight: "700", marginBottom: 8 },
  input: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    color: "#111827",
  },
  multiline: { minHeight: 120, paddingTop: 16, textAlignVertical: "top" },
  sectionLabel: { color: "#374151", fontSize: 14, fontWeight: "600" },
  categories: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  category: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categorySelected: { backgroundColor: "#0F766E", borderColor: "#0F766E" },
  categoryText: { color: "#374151", fontSize: 13 },
  categoryTextSelected: { color: "#FFFFFF", fontWeight: "700" },
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
  chapterContent: { minHeight: 180, paddingTop: 16, textAlignVertical: "top" },
  button: {
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#0F766E",
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});

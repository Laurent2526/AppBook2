import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackHeader } from "@/components/back-header";
import { BookCover } from "@/components/book-cover";
import { getMyBook, updateMyBook } from "@/lib/account-api";

export default function EditBookScreen() {
  const router = useRouter();
  const { bookId } = useLocalSearchParams<{ bookId?: string }>();
  const [title, setTitle] = React.useState("");
  const [authorName, setAuthorName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [coverUrl, setCoverUrl] = React.useState<string | undefined>();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!bookId) return;
    let active = true;
    getMyBook(String(bookId))
      .then(({ book }) => {
        if (!active) return;
        setTitle(book.title);
        setAuthorName(book.author_name || "");
        setDescription(book.description || "");
        setCoverUrl(book.cover_url || undefined);
      })
      .catch((loadError) => {
        if (active)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Không tải được truyện.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bookId]);

  const submit = async () => {
    if (!bookId || !title.trim()) {
      Alert.alert("Thiếu thông tin", "Tên truyện không được để trống.");
      return;
    }
    setSaving(true);
    try {
      await updateMyBook(String(bookId), {
        title: title.trim(),
        authorName: authorName.trim(),
        description: description.trim(),
      });
      Alert.alert(
        "Đã gửi chỉnh sửa",
        "Nội dung sẽ được cập nhật sau khi quản trị viên duyệt.",
        [{ text: "Đóng", onPress: () => router.back() }],
      );
    } catch (saveError) {
      Alert.alert(
        "Không thể gửi chỉnh sửa",
        saveError instanceof Error ? saveError.message : "Vui lòng thử lại.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackHeader title="Sửa thông tin truyện" />
        {loading ? (
          <ActivityIndicator color="#0F766E" />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <View style={styles.form}>
            {coverUrl ? (
              <BookCover
                uri={coverUrl}
                title={title}
                style={styles.cover}
              />
            ) : null}
            <Text style={styles.label}>Tên truyện</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
            />
            <Text style={styles.label}>Tác giả</Text>
            <TextInput
              style={styles.input}
              value={authorName}
              onChangeText={setAuthorName}
            />
            <Text style={styles.label}>Mô tả</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={description}
              onChangeText={setDescription}
              multiline
            />
            <Text style={styles.note}>
              Chỉnh sửa cần được quản trị viên duyệt trước khi hiển thị.
            </Text>
            <Pressable
              style={[styles.button, saving && styles.disabled]}
              disabled={saving}
              onPress={() => void submit()}
            >
              <Text style={styles.buttonText}>
                {saving ? "Đang gửi..." : "Gửi chỉnh sửa"}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F6F7FB" },
  content: { flexGrow: 1, padding: 20, gap: 16, backgroundColor: "#F6F7FB" },
  form: { gap: 10 },
  cover: { width: 104, height: 144, borderRadius: 12, alignSelf: "center" },
  label: { color: "#374151", fontSize: 13, fontWeight: "700", marginTop: 4 },
  input: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    color: "#111827",
  },
  multiline: { minHeight: 150, paddingTop: 14, textAlignVertical: "top" },
  note: { color: "#6B7280", fontSize: 12, lineHeight: 18 },
  error: { color: "#B44D4D", textAlign: "center", paddingVertical: 30 },
  button: {
    alignItems: "center",
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: "#0F766E",
    marginTop: 8,
  },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.6 },
});

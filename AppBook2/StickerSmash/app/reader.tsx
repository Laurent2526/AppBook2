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

const premiumContent = {
  title: "Chương VIP",
  body: "Nội dung chương VIP chỉ hiển thị sau khi người dùng đã đăng nhập và xác thực tài khoản. Đây là nền tảng để nối với API backend cho các chương trả phí.",
};

const freeContent = {
  title: "Chương miễn phí",
  body: "Nội dung chương miễn phí có thể xem mà không cần đăng nhập. Đây là phần phù hợp với mô hình đọc mở, chỉ có các chương trả phí hoặc nội dung nâng cao yêu cầu tài khoản.",
};

export default function ReaderScreen() {
  const router = useRouter();
  const { isAuthenticated, recordReading } = useAuth();
  const { bookId, chapter } = useLocalSearchParams<{
    bookId?: string;
    chapter?: string;
  }>();
  const isPremiumChapter = chapter === "65" || chapter === "vip";

  React.useEffect(() => {
    if (bookId) {
      recordReading({
        id: `${bookId}-${chapter ?? "1"}`,
        title: bookId,
        chapter: `Chương ${chapter ?? "1"}`,
        color: "#F59E0B",
      });
    }
  }, [bookId, chapter, recordReading]);

  const content =
    isPremiumChapter && !isAuthenticated
      ? null
      : isPremiumChapter
        ? premiumContent
        : freeContent;

  if (isPremiumChapter && !isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.back}>‹</Text>
            </Pressable>
            <Text style={styles.chapter}>Chương VIP</Text>
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
          <Text style={styles.chapter}>Chương {chapter ?? "1"}</Text>
          <View style={styles.spacer} />
        </View>
        <Text style={styles.title}>{bookId ?? "Đang đọc truyện"}</Text>
        <Text style={styles.subtitle}>{content?.title ?? "Nội dung"}</Text>
        <Text style={styles.body}>{content?.body ?? freeContent.body}</Text>

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
            Alert.alert(
              "Thành công",
              "Bạn đã lưu truyện và có thể tiếp tục tương tác với nội dung.",
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

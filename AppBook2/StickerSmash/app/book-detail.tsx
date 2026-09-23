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

export default function BookDetailScreen() {
  const router = useRouter();
  const { isAuthenticated, recordReading } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const title = id ?? "Chi tiết truyện";
  const isPaidContent = true;

  React.useEffect(() => {
    if (id) {
      recordReading({
        id: `${title}-detail`,
        title,
        chapter: "Đã mở truyện",
        color: "#F59E0B",
      });
    }
  }, [id, recordReading, title]);

  const handleReadPress = () => {
    recordReading({
      id: `${title}-book`,
      title,
      chapter: "Chưa chọn chương",
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

    router.push({ pathname: "/reader", params: { bookId: id, chapter: "1" } });
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
        <Text style={styles.subtitle}>Thông tin và các chương của truyện</Text>
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
        </View>
        <Pressable style={styles.primaryButton} onPress={handleReadPress}>
          <Text style={styles.primaryButtonText}>Đọc truyện</Text>
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

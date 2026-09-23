import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { useAuth } from "@/components/auth-provider";

export default function AuthScreen() {
  const router = useRouter();
  const { login, register, isAuthenticated } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = () => {
    try {
      if (mode === "login") {
        login(email, password);
      } else {
        register({ name, email, password });
      }

      Alert.alert(
        mode === "login" ? "Đăng nhập thành công" : "Đăng ký thành công",
        "Bạn đã có thể sử dụng các tính năng yêu cầu tài khoản.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Đã có lỗi xảy ra.";
      Alert.alert("Thông báo", message);
    }
  };

  if (isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authBox}>
          <Text style={styles.title}>Bạn đã đăng nhập</Text>
          <Text style={styles.subtitle}>
            Tài khoản của bạn đã được xác thực, bạn có thể tiếp tục sử dụng tất
            cả tính năng.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Quay lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Quay lại</Text>
        </Pressable>

        <View style={styles.headerWrap}>
          <Text style={styles.title}>
            {mode === "login" ? "Đăng nhập" : "Đăng ký"}
          </Text>
          <Text style={styles.subtitle}>
            {mode === "login"
              ? "Để đọc chương VIP, đăng truyện, lưu sách và bình luận."
              : "Tạo tài khoản để mở khóa toàn bộ trải nghiệm đọc và đăng tải."}
          </Text>
        </View>

        <View style={styles.formBox}>
          {mode === "register" && (
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Họ và tên</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholder="Nhập họ tên"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          )}

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              placeholder="example@gmail.com"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Mật khẩu</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              placeholder="Nhập mật khẩu"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <Pressable style={styles.primaryButton} onPress={handleSubmit}>
            <Text style={styles.primaryButtonText}>
              {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => setMode(mode === "login" ? "register" : "login")}
          >
            <Text style={styles.secondaryButtonText}>
              {mode === "login"
                ? "Chưa có tài khoản? Đăng ký ngay"
                : "Đã có tài khoản? Đăng nhập"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F7FB",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 18,
  },
  backText: {
    color: "#0F766E",
    fontSize: 16,
    fontWeight: "600",
  },
  headerWrap: {
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 22,
  },
  authBox: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  formBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  fieldWrap: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
  },
  primaryButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#4F46E5",
    fontSize: 14,
    fontWeight: "600",
  },
});

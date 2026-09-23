import { useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { useAuth } from "@/components/auth-provider";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { SafeAreaView } from "react-native-safe-area-context";

const menuItems = [
  {
    label: "Đăng truyện",
    icon: "+",
    subtitle: "Tạo nội dung mới",
    route: "/(user)/account/publish",
    requiresAuth: true,
  },
  {
    label: "Quản lý truyện",
    icon: "▤",
    subtitle: "Truyện và chương đã đăng",
    route: "/(user)/account/my-books",
    requiresAuth: true,
  },
  {
    label: "Ví tài khoản",
    icon: "$",
    subtitle: "Nạp tiền và rút doanh thu",
    route: "/(user)/account/wallet",
    requiresAuth: true,
  },
  {
    label: "Lịch sử giao dịch",
    icon: "≡",
    subtitle: "Theo dõi các giao dịch",
    route: "/(user)/account/transactions",
    requiresAuth: true,
  },
  {
    label: "Sách yêu thích",
    icon: "♥",
    subtitle: "Danh sách đã lưu",
    requiresAuth: true,
  },
  {
    label: "Đăng nhập / Đăng ký",
    icon: "🔐",
    subtitle: "Xác thực tài khoản để mở khóa tính năng",
    route: "/auth",
    requiresAuth: false,
  },
  {
    label: "Cài đặt ứng dụng",
    icon: "⚙",
    subtitle: "Chế độ đọc & thông báo",
    route: "/settings",
    requiresAuth: false,
  },
  {
    label: "Trợ giúp & Hỗ trợ",
    icon: "❔",
    subtitle: "FAQ & liên hệ",
    requiresAuth: false,
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { isAuthenticated, logout, user } = useAuth();

  const handleMenuPress = (item: (typeof menuItems)[number]) => {
    if (item.requiresAuth && !isAuthenticated) {
      Alert.alert(
        "Yêu cầu đăng nhập",
        "Bạn cần có tài khoản để sử dụng tính năng này. Chương miễn phí vẫn có thể đọc bình thường.",
        [
          { text: "Hủy", style: "cancel" },
          { text: "Đăng nhập", onPress: () => router.push("/auth") },
        ],
      );
      return;
    }

    if (item.route) {
      router.push(item.route as never);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ThemedView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.profileHeader}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <ThemedText style={styles.avatarText}>
                  {(user?.name ?? "YT").slice(0, 2).toUpperCase()}
                </ThemedText>
              </View>
              <Pressable style={styles.editButton}>
                <ThemedText style={styles.editIcon}>✏️</ThemedText>
              </Pressable>
            </View>

            <ThemedText type="title" style={styles.name}>
              {user?.name ?? "Khách truy cập"}
            </ThemedText>
            <ThemedText style={styles.email}>
              {user?.email ?? "Chưa đăng nhập"}
            </ThemedText>

            <View style={styles.badge}>
              <ThemedText style={styles.badgeText}>
                {isAuthenticated ? "Tài khoản đã xác thực" : "Chưa đăng nhập"}
              </ThemedText>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <ThemedText style={styles.statValue}>12</ThemedText>
              <ThemedText style={styles.statLabel}>cuốn đã đọc</ThemedText>
            </View>
            <View style={styles.statCard}>
              <ThemedText style={styles.statValue}>45</ThemedText>
              <ThemedText style={styles.statLabel}>phút/ngày</ThemedText>
            </View>
            <View style={styles.statCard}>
              <ThemedText style={styles.statValue}>5 ngày</ThemedText>
              <ThemedText style={styles.statLabel}>đọc liên tiếp 🔥</ThemedText>
            </View>
          </View>

          <View style={styles.menuSection}>
            {menuItems.map((item) => (
              <Pressable
                key={item.label}
                style={styles.menuItem}
                onPress={() => handleMenuPress(item)}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.iconBox}>
                    <ThemedText style={styles.iconText}>{item.icon}</ThemedText>
                  </View>
                  <View>
                    <ThemedText style={styles.menuLabel}>
                      {item.label}
                    </ThemedText>
                    <ThemedText style={styles.menuSubtitle}>
                      {item.subtitle}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.arrow}>›</ThemedText>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[
              styles.logoutButton,
              !isAuthenticated && styles.logoutButtonDisabled,
            ]}
            onPress={() => {
              if (!isAuthenticated) {
                router.push("/auth");
                return;
              }
              logout();
            }}
          >
            <ThemedText style={styles.logoutText}>
              {isAuthenticated ? "Đăng xuất" : "Đăng nhập / Đăng ký"}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F6F7FB" },
  container: {
    flex: 1,
    backgroundColor: "#F6F7FB",
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 36,
  },
  profileHeader: {
    alignItems: "center",
    paddingTop: 10,
  },
  avatarWrap: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  avatarText: {
    fontSize: 30,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  editButton: {
    position: "absolute",
    right: -2,
    bottom: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#F6F7FB",
  },
  editIcon: {
    fontSize: 15,
  },
  name: {
    fontSize: 28,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  badge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  badgeText: {
    color: "#0F766E",
    fontWeight: "600",
    fontSize: 12,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 26,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
  },
  menuSection: {
    marginTop: 26,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconText: {
    fontSize: 18,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  menuSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  arrow: {
    fontSize: 24,
    color: "#9CA3AF",
    marginLeft: 10,
  },
  logoutButton: {
    marginTop: 24,
    backgroundColor: "#EF4444",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#EF4444",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  logoutButtonDisabled: {
    backgroundColor: "#4F46E5",
    shadowColor: "#4F46E5",
    shadowOpacity: 0.2,
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

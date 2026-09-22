import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState<"system" | "personal">("system");
  const notifications = activeTab === "system"
    ? ["Chào mừng bạn đến với thư viện đọc sách!"]
    : ["Bạn chưa có thông báo cá nhân nào."];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.content}>
          <View style={styles.segmentedControl}>
            <Pressable
              style={activeTab === "system" ? styles.activeSegment : styles.segment}
              onPress={() => setActiveTab("system")}
            >
              <ThemedText style={styles.activeSegmentText}>
                Hệ Thống (0)
              </ThemedText>
            </Pressable>
            <Pressable
              style={activeTab === "personal" ? styles.activeSegment : styles.segment}
              onPress={() => setActiveTab("personal")}
            >
              <ThemedText style={activeTab === "personal" ? styles.activeSegmentText : styles.segmentText}>
                Cá Nhân (0)
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.toolbar}>
            <Pressable style={styles.toolbarButton}>
              <Ionicons
                name="checkmark-done-outline"
                size={18}
                color="#0F766E"
              />
              <ThemedText style={styles.toolbarText}>Xem hết</ThemedText>
            </Pressable>
            <Pressable style={styles.toolbarButton}>
              <ThemedText style={styles.toolbarText}>Chưa Đọc (0)</ThemedText>
              <Ionicons name="swap-vertical" size={16} color="#6B7280" />
            </Pressable>
          </View>

          <View style={styles.emptyCard}>
            <View style={styles.mailIconWrap}>
              <Ionicons name="mail-outline" size={58} color="#CBD5E1" />
            </View>
            <ThemedText style={styles.emptyText}>{notifications[0]}</ThemedText>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  segmentedControl: {
    flexDirection: "row",
    alignSelf: "center",
    width: "100%",
    padding: 4,
    borderRadius: 22,
    backgroundColor: "#E7EEF0",
  },
  activeSegment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    borderRadius: 19,
    backgroundColor: "#0EA5A4",
    shadowColor: "#0F766E",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  activeSegmentText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    borderRadius: 19,
  },
  segmentText: {
    color: "#7B8794",
    fontSize: 14,
    fontWeight: "600",
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 14,
  },
  toolbarButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 4,
  },
  toolbarText: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 280,
    marginBottom: 18,
    paddingHorizontal: 24,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
  },
  mailIconWrap: {
    width: 104,
    height: 104,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    borderRadius: 52,
    backgroundColor: "#F1F5F9",
  },
  emptyText: {
    color: "#7B8794",
    fontSize: 15,
    textAlign: "center",
  },
});

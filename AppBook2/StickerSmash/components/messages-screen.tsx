import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { io } from "socket.io-client";
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

import { useAuth } from "@/components/auth-provider";
import { getAccessToken, getApiBaseUrl } from "@/lib/api-client";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  AppNotification,
  Conversation,
  createConversation,
  getConversations,
  getNotifications,
  markNotificationRead,
} from "@/lib/messaging-api";

type InboxTab = "system" | "personal";

export function MessagesScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = React.useState<InboxTab>("system");
  const [notifications, setNotifications] = React.useState<AppNotification[]>(
    [],
  );
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [recipientId, setRecipientId] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [reload, setReload] = React.useState(0);
  const unreadCount = notifications.filter((item) => !item.is_read).length;

  React.useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    const load = async () => {
      try {
        if (activeTab === "system") {
          const result = await getNotifications();
          if (active) setNotifications(result.items);
        } else {
          const result = await getConversations();
          if (active) setConversations(result.items);
        }
        if (active) setError("");
      } catch (loadError) {
        if (active)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Không tải được dữ liệu.",
          );
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [activeTab, isAuthenticated, reload]);

  React.useEffect(() => {
    if (!isAuthenticated) return;
    const token = getAccessToken();
    const apiUrl = getApiBaseUrl();
    if (!token || !apiUrl) return;

    const socket = io(apiUrl.replace(/\/api\/?$/, ""), {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
    });
    const refreshCurrentList = () => {
      if (activeTab === "system") {
        void getNotifications().then((result) =>
          setNotifications(result.items),
        );
      } else {
        void getConversations().then((result) =>
          setConversations(result.items),
        );
      }
    };
    socket.on("notification:new", refreshCurrentList);
    socket.on("message:new", refreshCurrentList);
    const fallback = setInterval(refreshCurrentList, 20000);
    return () => {
      clearInterval(fallback);
      socket.off("notification:new", refreshCurrentList);
      socket.off("message:new", refreshCurrentList);
      socket.disconnect();
    };
  }, [activeTab, isAuthenticated]);

  const selectTab = (tab: InboxTab) => {
    setLoading(true);
    setError("");
    setActiveTab(tab);
  };

  const openNotification = async (item: AppNotification) => {
    if (!item.is_read) {
      try {
        await markNotificationRead(item.id);
        setNotifications((current) =>
          current.map((entry) =>
            entry.id === item.id ? { ...entry, is_read: 1 } : entry,
          ),
        );
      } catch (readError) {
        setError(
          readError instanceof Error
            ? readError.message
            : "Không thể cập nhật thông báo.",
        );
      }
    }
    if (item.ref_type === "book" && item.ref_id) {
      router.push({ pathname: "/book-detail", params: { id: item.ref_id } });
    }
  };

  const markAllRead = async () => {
    setBusy(true);
    try {
      await Promise.all(
        notifications
          .filter((item) => !item.is_read)
          .map((item) => markNotificationRead(item.id)),
      );
      setNotifications((current) =>
        current.map((item) => ({ ...item, is_read: 1 })),
      );
    } catch (readError) {
      setError(
        readError instanceof Error
          ? readError.message
          : "Không thể cập nhật thông báo.",
      );
    } finally {
      setBusy(false);
    }
  };

  const startConversation = async () => {
    if (!/^\d+$/.test(recipientId.trim())) {
      Alert.alert("ID không hợp lệ", "Nhập ID tài khoản muốn nhắn tin.");
      return;
    }
    setBusy(true);
    try {
      const result = await createConversation(recipientId.trim());
      router.push({
        pathname: "/(user)/messages/[conversationId]",
        params: { conversationId: String(result.conversation.id) },
      });
    } catch (createError) {
      Alert.alert(
        "Không thể mở hội thoại",
        createError instanceof Error
          ? createError.message
          : "Vui lòng thử lại.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.content}>
          {!isAuthenticated ? (
            <View style={styles.emptyCard}>
              <Ionicons name="lock-closed-outline" size={40} color="#9AA6B2" />
              <ThemedText style={styles.emptyText}>
                Đăng nhập để xem tin nhắn và thông báo.
              </ThemedText>
              <Pressable
                onPress={() => router.push("/auth")}
                style={styles.loginButton}
              >
                <Text style={styles.loginButtonText}>Đăng nhập</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.segmentedControl}>
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activeTab === "system" }}
                  style={
                    activeTab === "system"
                      ? styles.activeSegment
                      : styles.segment
                  }
                  onPress={() => selectTab("system")}
                >
                  <ThemedText
                    style={
                      activeTab === "system"
                        ? styles.activeSegmentText
                        : styles.segmentText
                    }
                  >
                    Hệ thống ({notifications.length})
                  </ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activeTab === "personal" }}
                  style={
                    activeTab === "personal"
                      ? styles.activeSegment
                      : styles.segment
                  }
                  onPress={() => selectTab("personal")}
                >
                  <ThemedText
                    style={
                      activeTab === "personal"
                        ? styles.activeSegmentText
                        : styles.segmentText
                    }
                  >
                    Cá nhân ({conversations.length})
                  </ThemedText>
                </Pressable>
              </View>

              <View style={styles.toolbar}>
                {activeTab === "system" ? (
                  <Pressable
                    style={styles.toolbarButton}
                    onPress={() => void markAllRead()}
                    disabled={busy || unreadCount === 0}
                  >
                    <Ionicons
                      name="checkmark-done-outline"
                      size={18}
                      color="#0F766E"
                    />
                    <ThemedText style={styles.toolbarText}>
                      {busy
                        ? "Đang cập nhật..."
                        : `Đánh dấu đã đọc (${unreadCount})`}
                    </ThemedText>
                  </Pressable>
                ) : (
                  <ThemedText style={styles.toolbarText}>
                    Hội thoại cá nhân
                  </ThemedText>
                )}
                <Pressable
                  style={styles.toolbarButton}
                  onPress={() => {
                    setLoading(true);
                    setReload((value) => value + 1);
                  }}
                >
                  <Ionicons name="refresh" size={16} color="#6B7280" />
                </Pressable>
              </View>

              {activeTab === "personal" ? (
                <View style={styles.newConversation}>
                  <TextInput
                    style={styles.recipientInput}
                    value={recipientId}
                    onChangeText={setRecipientId}
                    placeholder="ID người dùng"
                    keyboardType="number-pad"
                  />
                  <Pressable
                    accessibilityLabel="Mở hội thoại"
                    style={styles.newConversationButton}
                    onPress={() => void startConversation()}
                    disabled={busy}
                  >
                    <Ionicons name="create-outline" size={19} color="#FFFFFF" />
                  </Pressable>
                </View>
              ) : null}

              {error ? <Text style={styles.error}>{error}</Text> : null}
              {loading ? (
                <View style={styles.loading}>
                  <ActivityIndicator color="#0F766E" />
                  <Text style={styles.toolbarText}>Đang tải...</Text>
                </View>
              ) : activeTab === "system" ? (
                notifications.length ? (
                  <ScrollView contentContainerStyle={styles.list}>
                    {notifications.map((item) => (
                      <Pressable
                        key={item.id}
                        style={[styles.row, !item.is_read && styles.unreadRow]}
                        onPress={() => void openNotification(item)}
                      >
                        <View style={styles.notificationIcon}>
                          <Ionicons
                            name={
                              item.is_read
                                ? "notifications-outline"
                                : "notifications"
                            }
                            size={19}
                            color="#0F766E"
                          />
                        </View>
                        <View style={styles.rowCopy}>
                          <Text style={styles.rowTitle}>{item.title}</Text>
                          <Text style={styles.rowContent}>{item.content}</Text>
                          <Text style={styles.rowDate}>
                            {new Date(item.created_at).toLocaleString("vi-VN")}
                          </Text>
                        </View>
                        {!item.is_read ? (
                          <View style={styles.unreadDot} />
                        ) : null}
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : (
                  <EmptyState text="Chưa có thông báo hệ thống." />
                )
              ) : conversations.length ? (
                <ScrollView contentContainerStyle={styles.list}>
                  {conversations.map((item) => (
                    <Pressable
                      key={item.id}
                      style={styles.row}
                      onPress={() =>
                        router.push({
                          pathname: "/(user)/messages/[conversationId]",
                          params: {
                            conversationId: item.id,
                            otherId: item.other_account_id,
                            otherName:
                              item.other_full_name || item.other_username,
                          },
                        })
                      }
                    >
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {(item.other_full_name || item.other_username)
                            .slice(0, 1)
                            .toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.rowCopy}>
                        <Text style={styles.rowTitle}>
                          {item.other_full_name || item.other_username}
                        </Text>
                        <Text style={styles.rowContent} numberOfLines={1}>
                          {item.last_message_content ||
                            "Bắt đầu cuộc trò chuyện"}
                        </Text>
                        <Text style={styles.rowDate}>
                          {item.last_message_at
                            ? new Date(item.last_message_at).toLocaleString(
                                "vi-VN",
                              )
                            : "Chưa có tin nhắn"}
                        </Text>
                      </View>
                      {item.unread_count > 0 ? (
                        <Text style={styles.unreadCount}>
                          {item.unread_count}
                        </Text>
                      ) : (
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color="#9AA6B2"
                        />
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <EmptyState text="Chưa có hội thoại cá nhân." />
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.mailIconWrap}>
        <Ionicons name="mail-outline" size={50} color="#CBD5E1" />
      </View>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  safeArea: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 18, paddingTop: 12 },
  segmentedControl: {
    flexDirection: "row",
    width: "100%",
    padding: 4,
    borderRadius: 12,
    backgroundColor: "#E7EEF0",
  },
  activeSegment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    borderRadius: 9,
    backgroundColor: "#0EA5A4",
  },
  activeSegmentText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    borderRadius: 9,
  },
  segmentText: { color: "#7B8794", fontSize: 14, fontWeight: "600" },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 46,
    marginTop: 12,
    marginBottom: 8,
  },
  toolbarButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 4,
  },
  toolbarText: { color: "#4B5563", fontSize: 12, fontWeight: "600" },
  list: { gap: 8, paddingBottom: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
  },
  unreadRow: { backgroundColor: "#ECF8F5" },
  notificationIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E1F1EE",
    alignItems: "center",
    justifyContent: "center",
  },
  rowCopy: { flex: 1, gap: 4 },
  rowTitle: { color: "#1F2937", fontSize: 14, fontWeight: "700" },
  rowContent: { color: "#596775", fontSize: 13 },
  rowDate: { color: "#929EAA", fontSize: 11 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0F766E",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#B8DDD8",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#166B67", fontWeight: "800", fontSize: 17 },
  unreadCount: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 11,
    overflow: "hidden",
    textAlign: "center",
    color: "#FFFFFF",
    backgroundColor: "#0F766E",
    fontSize: 11,
    fontWeight: "700",
  },
  newConversation: { flexDirection: "row", gap: 8, marginBottom: 10 },
  recipientInput: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 13,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    color: "#111827",
  },
  newConversationButton: {
    width: 44,
    height: 44,
    borderRadius: 9,
    backgroundColor: "#0F766E",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 250,
    marginBottom: 18,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  mailIconWrap: {
    width: 86,
    height: 86,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderRadius: 43,
    backgroundColor: "#F1F5F9",
  },
  emptyText: { color: "#7B8794", fontSize: 14, textAlign: "center" },
  loginButton: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: "#0F766E",
  },
  loginButtonText: { color: "#FFFFFF", fontWeight: "700" },
  error: { color: "#B44D4D", paddingVertical: 8, fontSize: 12 },
  loading: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    padding: 28,
  },
});

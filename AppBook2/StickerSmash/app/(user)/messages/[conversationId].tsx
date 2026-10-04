import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { io, Socket } from "socket.io-client";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import {
  blockUser,
  getMessages,
  markMessageRead,
  Message,
  reportUser,
  sendMessage,
} from "@/lib/messaging-api";

function getMessageKey(item: Message) {
  const baseId = String(item.id ?? "");
  const timestamp = String(item.created_at ?? "");
  const sender = String(item.sender_id ?? "");
  return baseId || `${sender}-${timestamp}`;
}

function mergeMessages(current: Message[], incoming: Message[]) {
  const byId = new Map<string, Message>();
  [...current, ...incoming].forEach((item) => {
    const key = getMessageKey(item);
    byId.set(key, item);
  });

  return [...byId.values()].sort(
    (left, right) =>
      new Date(left.created_at).getTime() -
      new Date(right.created_at).getTime(),
  );
}

export default function ConversationScreen() {
  const router = useRouter();
  const { conversationId, otherId, otherName } = useLocalSearchParams<{
    conversationId?: string;
    otherId?: string;
    otherName?: string;
  }>();
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [draft, setDraft] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState("");
  const scrollRef = React.useRef<ScrollView>(null);

  const loadMessages = React.useCallback(async () => {
    if (!conversationId || !isAuthenticated) return;
    try {
      const result = await getMessages(String(conversationId));
      setMessages((current) => mergeMessages(current, result.items));
      const unread = result.items.filter(
        (message) =>
          String(message.receiver_id) === user?.id && !message.is_read,
      );
      await Promise.all(unread.map((message) => markMessageRead(message.id)));
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không tải được tin nhắn.",
      );
    } finally {
      setLoading(false);
    }
  }, [conversationId, isAuthenticated, user?.id]);

  React.useEffect(() => {
    const timer = setTimeout(() => void loadMessages(), 0);
    return () => clearTimeout(timer);
  }, [loadMessages]);

  React.useEffect(() => {
    const token = getAccessToken();
    const apiUrl = getApiBaseUrl();
    if (!token || !apiUrl || !conversationId) return;
    const socketUrl = apiUrl.replace(/\/api\/?$/, "");
    const socket: Socket = io(socketUrl, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
    });
    const onMessage = (message: Message) => {
      if (String(message.conversation_id) !== String(conversationId)) return;
      setMessages((current) => mergeMessages(current, [message]));
      if (String(message.receiver_id) === user?.id)
        void markMessageRead(String(message.id));
    };
    socket.on("message:new", onMessage);
    const fallback = setInterval(() => {
      if (!socket.connected) void loadMessages();
    }, 7000);
    return () => {
      clearInterval(fallback);
      socket.off("message:new", onMessage);
      socket.disconnect();
    };
  }, [conversationId, loadMessages, user?.id]);

  const submit = async () => {
    const content = draft.trim();
    if (!content || !conversationId || sending) return;
    setSending(true);
    setError("");
    try {
      const result = await sendMessage(String(conversationId), content);
      setMessages((current) => mergeMessages(current, [result.message]));
      setDraft("");
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Không gửi được tin nhắn.",
      );
    } finally {
      setSending(false);
    }
  };

  const report = () => {
    if (!otherId) return;
    Alert.alert(
      "Báo cáo người dùng?",
      "Báo cáo sẽ được gửi đến hàng chờ kiểm duyệt.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Báo cáo",
          onPress: () => {
            void reportUser(String(otherId), "Báo cáo từ cuộc trò chuyện")
              .then(() => Alert.alert("Đã gửi", "Báo cáo đang chờ xử lý."))
              .catch((reportError) =>
                Alert.alert(
                  "Không thể báo cáo",
                  reportError instanceof Error
                    ? reportError.message
                    : "Vui lòng thử lại.",
                ),
              );
          },
        },
      ],
    );
  };

  const block = () => {
    if (!otherId) return;
    Alert.alert(
      "Chặn người dùng?",
      "Bạn sẽ không thể gửi hoặc nhận tin nhắn từ tài khoản này.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Chặn",
          style: "destructive",
          onPress: () => {
            void blockUser(String(otherId), "Chặn từ cuộc trò chuyện")
              .then(() => {
                Alert.alert("Đã chặn", "Tài khoản đã được chặn.");
                router.back();
              })
              .catch((blockError) =>
                Alert.alert(
                  "Không thể chặn",
                  blockError instanceof Error
                    ? blockError.message
                    : "Vui lòng thử lại.",
                ),
              );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={12}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={22} color="#184C45" />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>{otherName || "Tin nhắn"}</Text>
            <Text style={styles.headerSubtitle}>Hội thoại cá nhân</Text>
          </View>
          <Pressable
            accessibilityLabel="Báo cáo"
            onPress={report}
            style={styles.iconButton}
          >
            <Ionicons name="flag-outline" size={19} color="#8D554B" />
          </Pressable>
          <Pressable
            accessibilityLabel="Chặn người dùng"
            onPress={block}
            style={styles.iconButton}
          >
            <Ionicons name="ban-outline" size={19} color="#8D554B" />
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {loading ? <ActivityIndicator color="#0F766E" /> : null}
          {!loading && messages.length === 0 ? (
            <Text style={styles.empty}>
              Chưa có tin nhắn. Bắt đầu cuộc trò chuyện.
            </Text>
          ) : null}
          {messages.map((message) => {
            const mine = String(message.sender_id) === user?.id;
            const messageKey = `${getMessageKey(message)}-${message.created_at}`;
            return (
              <View
                key={messageKey}
                style={[styles.bubble, mine ? styles.mine : styles.theirs]}
              >
                <Text style={[styles.messageText, mine && styles.mineText]}>
                  {message.content}
                </Text>
                <Text style={[styles.time, mine && styles.mineTime]}>
                  {new Date(message.created_at).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {mine ? (message.is_read ? " · Đã đọc" : " · Đã gửi") : ""}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Nhập tin nhắn..."
            multiline
            maxLength={10000}
          />
          <Pressable
            accessibilityLabel="Gửi tin nhắn"
            style={[
              styles.sendButton,
              (!draft.trim() || sending) && styles.sendDisabled,
            ]}
            onPress={() => void submit()}
            disabled={!draft.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F5F8F7" },
  screen: { flex: 1 },
  header: {
    minHeight: 60,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E5ECEA",
    backgroundColor: "#FFFFFF",
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1, paddingHorizontal: 4 },
  headerTitle: { color: "#1F3431", fontSize: 15, fontWeight: "800" },
  headerSubtitle: { color: "#84938F", fontSize: 11, marginTop: 2 },
  messages: { flex: 1 },
  messageList: { flexGrow: 1, padding: 14, gap: 9, justifyContent: "flex-end" },
  empty: {
    color: "#72817D",
    textAlign: "center",
    paddingVertical: 30,
    fontSize: 13,
  },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 14,
  },
  mine: {
    alignSelf: "flex-end",
    backgroundColor: "#0F766E",
    borderBottomRightRadius: 4,
  },
  theirs: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
  },
  messageText: { color: "#223330", fontSize: 14, lineHeight: 20 },
  mineText: { color: "#FFFFFF" },
  time: { color: "#899791", fontSize: 10, marginTop: 5, textAlign: "right" },
  mineTime: { color: "#C9E5E1" },
  error: {
    color: "#B44D4D",
    fontSize: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 9,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5ECEA",
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 42,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F2F6F5",
    color: "#1F2937",
    fontSize: 14,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F766E",
  },
  sendDisabled: { opacity: 0.45 },
});

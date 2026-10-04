import { request } from "@/lib/api-client";

export type Conversation = {
  id: string;
  other_account_id: string;
  other_username: string;
  other_full_name?: string | null;
  other_avatar_url?: string | null;
  last_message_content?: string | null;
  last_message_sender_id?: string | null;
  last_message_at?: string | null;
  unread_count: number;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: "text" | "image" | "book_share";
  attachment_url?: string | null;
  is_read: number | boolean;
  created_at: string;
};

export type AppNotification = {
  id: string;
  type: "account" | "transaction" | "moderation" | "system" | "social";
  title: string;
  content: string;
  ref_type: string;
  ref_id?: string | null;
  is_read: number | boolean;
  created_at: string;
};

export function getConversations() {
  return request<{ items: Conversation[] }>("/conversations").then((data) => ({
    items: data.items.map((item) => ({
      ...item,
      id: String(item.id),
      other_account_id: String(item.other_account_id),
      last_message_sender_id: item.last_message_sender_id
        ? String(item.last_message_sender_id)
        : null,
      unread_count: Number(item.unread_count || 0),
    })),
  }));
}

export function createConversation(receiverId: string) {
  return request<{ conversation: { id: string } }>("/conversations", {
    method: "POST",
    body: JSON.stringify({ receiverId: Number(receiverId) }),
  });
}

export function getMessages(conversationId: string) {
  return request<{ items: Message[] }>(
    `/conversations/${conversationId}/messages`,
  ).then((data) => ({
    items: data.items.map((item) => ({
      ...item,
      id: String(item.id),
      conversation_id: String(item.conversation_id),
      sender_id: String(item.sender_id),
      receiver_id: String(item.receiver_id),
    })),
  }));
}

export function sendMessage(conversationId: string, content: string) {
  return request<{ message: Message }>(
    `/conversations/${conversationId}/messages`,
    { method: "POST", body: JSON.stringify({ content, messageType: "text" }) },
  );
}

export function markMessageRead(messageId: string) {
  return request<{ read: boolean }>(`/messages/${messageId}/read`, {
    method: "PATCH",
  });
}

export function blockUser(userId: string, reason?: string) {
  return request<{ block: Record<string, unknown> }>(`/users/${userId}/block`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function unblockUser(userId: string) {
  return request<{ deleted: boolean }>(`/users/${userId}/block`, {
    method: "DELETE",
  });
}

export function reportMessage(messageId: string, description?: string) {
  return request<{ report: Record<string, unknown> }>("/reports", {
    method: "POST",
    body: JSON.stringify({
      targetType: "message",
      targetId: Number(messageId),
      reason: "harassment",
      description,
    }),
  });
}

export function reportUser(userId: string, description?: string) {
  return request<{ report: Record<string, unknown> }>("/reports", {
    method: "POST",
    body: JSON.stringify({
      targetType: "account",
      targetId: Number(userId),
      reason: "harassment",
      description,
    }),
  });
}

export function getNotifications() {
  return request<{ items: AppNotification[] }>("/me/notifications").then(
    (data) => ({
      items: data.items.map((item) => ({ ...item, id: String(item.id) })),
    }),
  );
}

export function getUnreadNotificationCount() {
  return request<{ count: number }>("/me/notifications/unread-count");
}

export function markNotificationRead(notificationId: string) {
  return request<{ read: boolean }>(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

export function registerPushToken(token: string) {
  return request<{ registered: boolean }>("/me/push-token", {
    method: "PUT",
    body: JSON.stringify({ token }),
  });
}

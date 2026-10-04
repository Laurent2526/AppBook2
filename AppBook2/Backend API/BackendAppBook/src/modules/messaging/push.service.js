const repository = require("./messaging.repository");

async function sendPushToAccount(accountId, notification) {
  const tokens = await repository.listPushTokens(accountId);
  if (!tokens.length) return;

  const messages = tokens.map((token) => ({
    to: token.fcm_token,
    sound: "default",
    title: notification.title,
    body: notification.content,
    data: {
      notificationId: notification.id,
      refType: notification.ref_type,
      refId: notification.ref_id,
      url:
        notification.ref_type === "book" && notification.ref_id
          ? `/book-detail?id=${notification.ref_id}`
          : "/(user)/messages",
    },
  }));

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });
  if (!response.ok)
    throw new Error(`Expo Push returned HTTP ${response.status}`);

  const result = await response.json();
  const tickets = Array.isArray(result.data) ? result.data : [result.data];
  if (tickets.some((ticket) => ticket?.status === "ok")) {
    await repository.markNotificationPushed(notification.id);
  }
}

module.exports = { sendPushToAccount };

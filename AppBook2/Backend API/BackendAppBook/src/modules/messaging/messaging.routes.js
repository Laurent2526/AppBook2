const router = require("express").Router();
const authenticate = require("../../middlewares/authenticate");
const controller = require("./messaging.controller");

router.get("/conversations", authenticate, controller.listConversations);
router.post("/conversations", authenticate, controller.createConversation);
router.get(
  "/conversations/:id/messages",
  authenticate,
  controller.listMessages,
);
router.post(
  "/conversations/:id/messages",
  authenticate,
  controller.sendMessage,
);
router.patch("/messages/:id/read", authenticate, controller.markMessageRead);
router.post("/users/:id/block", authenticate, controller.block);
router.delete("/users/:id/block", authenticate, controller.unblock);
router.get("/me/notifications", authenticate, controller.listNotifications);
router.get(
  "/me/notifications/unread-count",
  authenticate,
  controller.unreadNotificationCount,
);
router.patch(
  "/notifications/:id/read",
  authenticate,
  controller.markNotificationRead,
);

module.exports = router;

const router = require("express").Router();
const authenticate = require("../../middlewares/authenticate");
const controller = require("./follow.controller");

router.post("/follows", authenticate, controller.follow);
router.delete("/follows/:type/:id", authenticate, controller.unfollow);
router.get("/me/follows", authenticate, controller.list);
router.put(
  "/me/reading-history/:bookId",
  authenticate,
  controller.updateHistory,
);
router.get("/me/reading-history", authenticate, controller.listHistory);

module.exports = router;

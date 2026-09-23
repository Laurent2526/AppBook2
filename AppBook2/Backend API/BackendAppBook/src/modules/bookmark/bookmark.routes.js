const router = require("express").Router();
const authenticate = require("../../middlewares/authenticate");
const controller = require("./bookmark.controller");

router.post("/bookmarks", authenticate, controller.create);
router.delete("/bookmarks/:bookId", authenticate, controller.remove);
router.get("/me/bookmarks", authenticate, controller.list);

module.exports = router;

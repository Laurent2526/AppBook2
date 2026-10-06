const router = require("express").Router();
const optionalAuthenticate = require("../../middlewares/optionalAuthenticate");
const authenticate = require("../../middlewares/authenticate");
const controller = require("./book.controller");

router.get("/:id", optionalAuthenticate, controller.getChapter);
router.post("/:id/view", optionalAuthenticate, controller.recordChapterView);
router.patch("/:id", authenticate, controller.updateChapter);
router.post("/:id/delete-request", authenticate, (req, res, next) => {
  req.params.type = "chapter";
  controller.requestDelete(req, res, next);
});

module.exports = router;

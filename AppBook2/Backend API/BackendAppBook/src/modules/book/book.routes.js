const router = require("express").Router();
const authenticate = require("../../middlewares/authenticate");
const uploadCover = require("../../middlewares/uploadCover");
const controller = require("./book.controller");

router.get("/", controller.list);
router.get("/:id", controller.get);
router.get("/:bookId/chapters", controller.chapters);
router.post("/", authenticate, uploadCover.single("cover"), controller.create);
router.patch(
  "/:id",
  authenticate,
  uploadCover.single("cover"),
  controller.update,
);
router.post("/:id/delete-request", authenticate, (req, res, next) => {
  req.params.type = "book";
  controller.requestDelete(req, res, next);
});
router.post("/:bookId/chapters", authenticate, controller.createChapter);

module.exports = router;

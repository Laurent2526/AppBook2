const router = require("express").Router();
const authenticate = require("../../middlewares/authenticate");
const controller = require("./interaction.controller");

router.post("/books/:id/ratings", authenticate, controller.rate);
router.post("/books/:id/comments", authenticate, controller.createComment);
router.get("/books/:id/comments", controller.listComments);
router.patch("/comments/:id", authenticate, controller.updateComment);
router.delete("/comments/:id", authenticate, controller.deleteComment);

module.exports = router;

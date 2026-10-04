const router = require("express").Router();
const authenticate = require("../../middlewares/authenticate");
const controller = require("./topup.controller");

router.post("/", authenticate, controller.create);
router.post("/demo", authenticate, controller.demo);
router.get("/", authenticate, controller.list);
router.get("/:id", authenticate, controller.get);
router.post("/:provider/webhook", controller.webhook);

module.exports = router;

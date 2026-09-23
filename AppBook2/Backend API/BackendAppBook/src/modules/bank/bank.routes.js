const router = require("express").Router();
const authenticate = require("../../middlewares/authenticate");
const controller = require("./bank.controller");

router.use(authenticate);
router.get("/me/bank-accounts", controller.list);
router.post("/me/bank-accounts", controller.create);
router.delete("/me/bank-accounts/:id", controller.remove);

module.exports = router;

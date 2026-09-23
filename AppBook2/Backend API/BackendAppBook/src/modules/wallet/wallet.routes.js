const router = require("express").Router();
const authenticate = require("../../middlewares/authenticate");
const controller = require("./wallet.controller");

router.use(authenticate);
router.get("/me/wallet", controller.wallet);
router.get("/me/wallet/entries", controller.entries);
router.get("/me/purchases", controller.purchases);
router.get("/transactions/:id", controller.transaction);
router.post("/chapters/:id/purchase", controller.purchase);

module.exports = router;

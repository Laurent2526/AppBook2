const router = require("express").Router();
const authenticate = require("../../middlewares/authenticate");
const authorize = require("../../middlewares/authorize");
const controller = require("./admin.controller");

router.use(authenticate, authorize("admin", "super_admin"));
router.get("/accounts", controller.listAccounts);
router.patch("/accounts/:id/status", controller.updateAccountStatus);
router.delete("/accounts/:id", controller.deleteAccount);
router.get("/books", controller.listBooks);
router.get("/books/:id", controller.getBook);
router.patch("/books/:id", controller.updateBook);
router.patch("/books/:id/status", controller.updateBookStatus);
router.delete("/books/:id", controller.deleteBook);

module.exports = router;

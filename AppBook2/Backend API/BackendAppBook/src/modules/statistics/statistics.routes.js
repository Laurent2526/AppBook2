const router = require("express").Router();
const authenticate = require("../../middlewares/authenticate");
const authorize = require("../../middlewares/authorize");
const controller = require("./statistics.controller");

const adminAccess = [
  authenticate,
  authorize("support", "admin", "super_admin"),
];

router.get("/admin/statistics/platform", adminAccess, controller.platform);
router.get("/admin/statistics/books", adminAccess, controller.books);
router.get("/admin/statistics/authors", adminAccess, controller.authors);

module.exports = router;

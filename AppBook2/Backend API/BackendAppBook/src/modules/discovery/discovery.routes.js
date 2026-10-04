const router = require("express").Router();
const authenticate = require("../../middlewares/authenticate");
const optionalAuthenticate = require("../../middlewares/optionalAuthenticate");
const controller = require("./discovery.controller");

router.get("/featured-authors", controller.featuredAuthors);
router.get(
  "/recommendations",
  optionalAuthenticate,
  controller.recommendations,
);
router.get("/following", authenticate, controller.following);

module.exports = router;

const router = require("express").Router();
const controller = require("./category.controller");

router.get("/", controller.list);

module.exports = router;

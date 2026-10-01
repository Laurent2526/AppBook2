const router = require("express").Router();
const db = require("../config/db");
const authRoutes = require("../modules/auth/auth.routes");
const authenticate = require("../middlewares/authenticate");
const categoryRoutes = require("../modules/category/category.routes");
const bookRoutes = require("../modules/book/book.routes");
const chapterRoutes = require("../modules/book/chapter.routes");
const moderationRoutes = require("../modules/moderation/moderation.routes");
const walletRoutes = require("../modules/wallet/wallet.routes");
const bankRoutes = require("../modules/bank/bank.routes");
const kycRoutes = require("../modules/kyc/kyc.routes");
const withdrawRoutes = require("../modules/withdraw/withdraw.routes");
const topupRoutes = require("../modules/topup/topup.routes");
const refundRoutes = require("../modules/refund/refund.routes");
const followRoutes = require("../modules/follow/follow.routes");
const bookmarkRoutes = require("../modules/bookmark/bookmark.routes");
const interactionRoutes = require("../modules/interaction/interaction.routes");
const reportRoutes = require("../modules/report/report.routes");
const messagingRoutes = require("../modules/messaging/messaging.routes");
const statisticsRoutes = require("../modules/statistics/statistics.routes");

router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/books", bookRoutes);
router.use("/chapters", chapterRoutes);
router.use("/admin/moderation", moderationRoutes);
router.use("/topups", topupRoutes);
router.use(refundRoutes);
router.use(followRoutes);
router.use(bookmarkRoutes);
router.use(interactionRoutes);
router.use(reportRoutes);
router.use(messagingRoutes);
router.use(statisticsRoutes);
router.use(walletRoutes);
router.use(bankRoutes);
router.use(kycRoutes);
router.use(withdrawRoutes);

router.get("/me", authenticate, (req, res) => {
  res.json({ success: true, data: { account: req.account } });
});

router.get("/me/books", authenticate, async (req, res, next) => {
  try {
    const { listMyBooksSchema } = require("../modules/book/book.schema");
    const bookService = require("../modules/book/book.service");

    const data = await bookService.listMine(
      req.auth.sub,
      listMyBooksSchema.parse(req.query),
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/health", async (req, res, next) => {
  try {
    await db.raw("SELECT 1 AS ok");
    res.json({ success: true, data: { status: "ok", database: "ok" } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

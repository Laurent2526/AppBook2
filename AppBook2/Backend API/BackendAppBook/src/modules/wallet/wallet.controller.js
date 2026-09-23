const { paginationSchema } = require("./wallet.schema");
const service = require("./wallet.service");

async function wallet(req, res, next) {
  try {
    res.json({
      success: true,
      data: { wallet: await service.getWallet(req.auth.sub) },
    });
  } catch (error) {
    next(error);
  }
}

async function entries(req, res, next) {
  try {
    res.json({
      success: true,
      data: await service.listEntries(
        req.auth.sub,
        paginationSchema.parse(req.query),
      ),
    });
  } catch (error) {
    next(error);
  }
}

async function purchases(req, res, next) {
  try {
    res.json({
      success: true,
      data: await service.listPurchases(
        req.auth.sub,
        paginationSchema.parse(req.query),
      ),
    });
  } catch (error) {
    next(error);
  }
}

async function purchase(req, res, next) {
  try {
    const result = await service.purchaseChapter(req.auth.sub, req.params.id);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function transaction(req, res, next) {
  try {
    res.json({
      success: true,
      data: {
        transaction: await service.getTransaction(req.auth.sub, req.params.id),
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { wallet, entries, purchases, purchase, transaction };

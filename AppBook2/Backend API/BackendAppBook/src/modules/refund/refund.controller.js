const { createRefundSchema, decisionSchema } = require("./refund.schema");
const service = require("./refund.service");

async function create(req, res, next) {
  try {
    const input = createRefundSchema.parse(req.body);
    const refund = await service.create(req.auth.sub, input);
    res.status(201).json({ success: true, data: { refund } });
  } catch (error) {
    next(error);
  }
}

async function listMine(req, res, next) {
  try {
    res.json({
      success: true,
      data: { items: await service.listMine(req.auth.sub) },
    });
  } catch (error) {
    next(error);
  }
}

async function listAdmin(req, res, next) {
  try {
    res.json({ success: true, data: { items: await service.listAdmin() } });
  } catch (error) {
    next(error);
  }
}

async function approve(req, res, next) {
  try {
    const input = decisionSchema.parse(req.body);
    res.json({
      success: true,
      data: {
        refund: await service.approve(
          req.account,
          Number(req.params.id),
          input.adminNote,
        ),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function reject(req, res, next) {
  try {
    const input = decisionSchema.parse(req.body);
    res.json({
      success: true,
      data: {
        refund: await service.reject(
          req.account,
          Number(req.params.id),
          input.adminNote,
        ),
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { create, listMine, listAdmin, approve, reject };

const {
  createWithdrawSchema,
  rejectSchema,
  completeSchema,
} = require("./withdraw.schema");
const service = require("./withdraw.service");

async function create(req, res, next) {
  try {
    res
      .status(201)
      .json({
        success: true,
        data: {
          withdrawal: await service.create(
            req.auth.sub,
            createWithdrawSchema.parse(req.body),
          ),
        },
      });
  } catch (error) {
    next(error);
  }
}
async function list(req, res, next) {
  try {
    res.json({
      success: true,
      data: { withdrawals: await service.list(req.auth.sub) },
    });
  } catch (error) {
    next(error);
  }
}
async function listAdmin(req, res, next) {
  try {
    res.json({
      success: true,
      data: { withdrawals: await service.listAdmin() },
    });
  } catch (error) {
    next(error);
  }
}
async function approve(req, res, next) {
  try {
    res.json({
      success: true,
      data: await service.approve(req.account, req.params.id),
    });
  } catch (error) {
    next(error);
  }
}
async function reject(req, res, next) {
  try {
    const input = rejectSchema.parse(req.body);
    res.json({
      success: true,
      data: await service.reject(
        req.account,
        req.params.id,
        input.rejectReason,
      ),
    });
  } catch (error) {
    next(error);
  }
}
async function complete(req, res, next) {
  try {
    const input = completeSchema.parse(req.body);
    res.json({
      success: true,
      data: await service.complete(
        req.account,
        req.params.id,
        input.transferRef,
      ),
    });
  } catch (error) {
    next(error);
  }
}
module.exports = { create, list, listAdmin, approve, reject, complete };

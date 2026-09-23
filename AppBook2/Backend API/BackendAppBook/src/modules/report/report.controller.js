const {
  createReportSchema,
  reportIdSchema,
  resolveReportSchema,
  dismissReportSchema,
} = require("./report.schema");
const service = require("./report.service");

async function create(req, res, next) {
  try {
    const report = await service.create(
      req.auth.sub,
      createReportSchema.parse(req.body),
    );
    res.status(201).json({ success: true, data: { report } });
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    const items = await service.listQueue();
    res.json({ success: true, data: { items } });
  } catch (error) {
    next(error);
  }
}

async function resolve(req, res, next) {
  try {
    const { id } = reportIdSchema.parse(req.params);
    const report = await service.decide(
      req.account,
      id,
      resolveReportSchema.parse(req.body),
      "resolved",
    );
    res.json({ success: true, data: { report } });
  } catch (error) {
    next(error);
  }
}

async function dismiss(req, res, next) {
  try {
    const { id } = reportIdSchema.parse(req.params);
    const report = await service.decide(
      req.account,
      id,
      dismissReportSchema.parse(req.body),
      "dismissed",
    );
    res.json({ success: true, data: { report } });
  } catch (error) {
    next(error);
  }
}

module.exports = { create, list, resolve, dismiss };

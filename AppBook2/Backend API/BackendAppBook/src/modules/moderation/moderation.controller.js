const { queueSchema, decisionSchema } = require("./moderation.schema");
const service = require("./moderation.service");

async function list(req, res, next) {
  try {
    const result = await service.listQueue(queueSchema.parse(req.query));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function approve(req, res, next) {
  try {
    const result = await service.decide(
      req.account,
      req.params.id,
      decisionSchema.parse(req.body),
      true,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function reject(req, res, next) {
  try {
    const result = await service.decide(
      req.account,
      req.params.id,
      decisionSchema.parse(req.body),
      false,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = { list, approve, reject };

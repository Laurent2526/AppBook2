const { createTopupSchema, webhookTopupSchema } = require("./topup.schema");
const service = require("./topup.service");

async function create(req, res, next) {
  try {
    const input = createTopupSchema.parse(req.body);
    const order = await service.create(req.auth.sub, input);
    res.status(201).json({ success: true, data: { order } });
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    res.json({
      success: true,
      data: { orders: await service.list(req.auth.sub) },
    });
  } catch (error) {
    next(error);
  }
}

async function get(req, res, next) {
  try {
    const order = await service.get(req.auth.sub, Number(req.params.id));
    res.json({ success: true, data: { order } });
  } catch (error) {
    next(error);
  }
}

async function webhook(req, res, next) {
  try {
    const payload = req.body;
    const signature = req.get("x-signature") || req.get("X-Signature");
    const order = await service.webhook(
      req.params.provider,
      payload,
      signature,
    );
    res.json({ success: true, data: { order } });
  } catch (error) {
    next(error);
  }
}

module.exports = { create, list, get, webhook };

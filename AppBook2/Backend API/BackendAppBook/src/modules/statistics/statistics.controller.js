const { statsQuerySchema } = require("./statistics.schema");
const service = require("./statistics.service");

async function platform(req, res, next) {
  try {
    const result = await service.platform(statsQuerySchema.parse(req.query));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function books(req, res, next) {
  try {
    const result = await service.books(statsQuerySchema.parse(req.query));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function authors(req, res, next) {
  try {
    const result = await service.authors(statsQuerySchema.parse(req.query));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = { platform, books, authors };

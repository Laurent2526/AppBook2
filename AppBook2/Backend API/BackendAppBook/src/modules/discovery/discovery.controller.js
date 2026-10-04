const { z } = require("zod");
const service = require("./discovery.service");
const { discoveryQuerySchema } = require("./discovery.schema");

const featuredQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(255).optional(),
});

async function featuredAuthors(req, res, next) {
  try {
    const { limit, search } = featuredQuerySchema.parse(req.query);
    const authors = await service.listFeaturedAuthors(limit, search);
    res.json({ success: true, data: { authors } });
  } catch (error) {
    next(error);
  }
}

async function recommendations(req, res, next) {
  try {
    const input = discoveryQuerySchema.parse(req.query);
    const result = await service.recommendations(req.auth?.sub || null, input);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function following(req, res, next) {
  try {
    const result = await service.following(req.auth?.sub || null);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = { featuredAuthors, recommendations, following };

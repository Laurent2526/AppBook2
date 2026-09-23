const {
  createBookmarkSchema,
  bookIdParamSchema,
} = require("./bookmark.schema");
const service = require("./bookmark.service");

async function create(req, res, next) {
  try {
    const bookmark = await service.create(
      req.auth.sub,
      createBookmarkSchema.parse(req.body),
    );
    res.status(201).json({ success: true, data: { bookmark } });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const { bookId } = bookIdParamSchema.parse(req.params);
    const result = await service.remove(req.auth.sub, bookId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    const items = await service.list(req.auth.sub);
    res.json({ success: true, data: { items } });
  } catch (error) {
    next(error);
  }
}

module.exports = { create, remove, list };

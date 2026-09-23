const { followSchema, readingHistorySchema } = require("./follow.schema");
const service = require("./follow.service");

async function follow(req, res, next) {
  try {
    const input = followSchema.parse(req.body);
    const item = await service.follow(req.auth.sub, input);
    res.status(201).json({ success: true, data: { item } });
  } catch (error) {
    next(error);
  }
}

async function unfollow(req, res, next) {
  try {
    const result = await service.unfollow(
      req.auth.sub,
      req.params.type,
      req.params.id,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    const items = await service.listFollows(req.auth.sub);
    res.json({ success: true, data: { items } });
  } catch (error) {
    next(error);
  }
}

async function updateHistory(req, res, next) {
  try {
    const input = readingHistorySchema.parse(req.body);
    const history = await service.updateReadingHistory(
      req.auth.sub,
      Number(req.params.bookId),
      input,
    );
    res.json({ success: true, data: { history } });
  } catch (error) {
    next(error);
  }
}

async function listHistory(req, res, next) {
  try {
    const items = await service.listReadingHistory(req.auth.sub);
    res.json({ success: true, data: { items } });
  } catch (error) {
    next(error);
  }
}

module.exports = { follow, unfollow, list, updateHistory, listHistory };

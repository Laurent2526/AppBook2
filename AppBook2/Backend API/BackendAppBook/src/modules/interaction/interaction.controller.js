const {
  bookIdSchema,
  ratingSchema,
  createCommentSchema,
  updateCommentSchema,
  commentIdSchema,
} = require("./interaction.schema");
const service = require("./interaction.service");

async function rate(req, res, next) {
  try {
    const { id } = bookIdSchema.parse(req.params);
    const { score } = ratingSchema.parse(req.body);
    const result = await service.rate(req.auth.sub, id, score);
    res
      .status(result.updated ? 200 : 201)
      .json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function createComment(req, res, next) {
  try {
    const { id } = bookIdSchema.parse(req.params);
    const comment = await service.createComment(
      req.auth.sub,
      id,
      createCommentSchema.parse(req.body),
    );
    res.status(201).json({ success: true, data: { comment } });
  } catch (error) {
    next(error);
  }
}

async function listComments(req, res, next) {
  try {
    const { id } = bookIdSchema.parse(req.params);
    const items = await service.listComments(id);
    res.json({ success: true, data: { items } });
  } catch (error) {
    next(error);
  }
}

async function updateComment(req, res, next) {
  try {
    const { id } = commentIdSchema.parse(req.params);
    const { content } = updateCommentSchema.parse(req.body);
    const comment = await service.updateComment(
      req.auth.sub,
      req.account.role,
      id,
      content,
    );
    res.json({ success: true, data: { comment } });
  } catch (error) {
    next(error);
  }
}

async function deleteComment(req, res, next) {
  try {
    const { id } = commentIdSchema.parse(req.params);
    const result = await service.deleteComment(
      req.auth.sub,
      req.account.role,
      id,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  rate,
  createComment,
  listComments,
  updateComment,
  deleteComment,
};

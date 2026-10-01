const {
  listBooksSchema,
  listMyBooksSchema,
  createBookSchema,
  createChapterSchema,
  updateBookSchema,
  updateChapterSchema,
  deleteRequestSchema,
} = require("./book.schema");
const service = require("./book.service");

function normalizeMultipartBody(body) {
  const value = { ...body };

  if (typeof value.categoryIds === "string") {
    value.categoryIds = JSON.parse(value.categoryIds);
  }
  for (const field of ["freePreviewChapters"]) {
    if (value[field] !== undefined && value[field] !== "") {
      value[field] = Number(value[field]);
    }
  }
  for (const field of ["isMature"]) {
    if (value[field] !== undefined) value[field] = value[field] === "true";
  }
  return value;
}

function getCoverPath(req) {
  return req.file ? `/uploads/covers/${req.file.filename}` : undefined;
}

async function list(req, res, next) {
  try {
    const result = await service.listPublic(listBooksSchema.parse(req.query));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function get(req, res, next) {
  try {
    const book = await service.getPublic(req.params.id);
    res.json({ success: true, data: { book } });
  } catch (error) {
    next(error);
  }
}

async function chapters(req, res, next) {
  try {
    const chapters = await service.listChapters(req.params.bookId);
    res.json({ success: true, data: { chapters } });
  } catch (error) {
    next(error);
  }
}

async function listMine(req, res, next) {
  try {
    const data = await service.listMine(
      req.auth.sub,
      listMyBooksSchema.parse(req.query),
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getChapter(req, res, next) {
  try {
    const chapter = await service.getChapter(req.params.id, req.auth?.sub);
    res.json({ success: true, data: { chapter } });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const book = await service.createBook(
      req.auth.sub,
      createBookSchema.parse({
        ...normalizeMultipartBody(req.body),
        coverPath: getCoverPath(req),
      }),
    );
    res.status(201).json({ success: true, data: { book } });
  } catch (error) {
    next(error);
  }
}

async function createChapter(req, res, next) {
  try {
    const chapter = await service.createChapter(
      req.auth.sub,
      req.params.bookId,
      createChapterSchema.parse(req.body),
    );
    res.status(201).json({ success: true, data: { chapter } });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const result = await service.updateBook(
      req.auth.sub,
      req.params.id,
      updateBookSchema.parse({
        ...normalizeMultipartBody(req.body),
        coverPath: getCoverPath(req),
      }),
    );
    res.status(202).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function updateChapter(req, res, next) {
  try {
    const result = await service.updateChapter(
      req.auth.sub,
      req.params.id,
      updateChapterSchema.parse(req.body),
    );
    res.status(202).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function requestDelete(req, res, next) {
  try {
    const result = await service.requestDelete(
      req.auth.sub,
      req.params.type,
      req.params.id,
      deleteRequestSchema.parse(req.body).reason,
    );
    res.status(202).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  list,
  listMine,
  get,
  chapters,
  getChapter,
  create,
  createChapter,
  update,
  updateChapter,
  requestDelete,
};

const schemas = require("./admin.schema");
const service = require("./admin.service");

async function listAccounts(req, res, next) {
  try {
    res.json({
      success: true,
      data: await service.listAccounts(
        schemas.listAccountsSchema.parse(req.query),
      ),
    });
  } catch (error) {
    next(error);
  }
}

async function updateAccountStatus(req, res, next) {
  try {
    const input = schemas.updateAccountStatusSchema.parse(req.body);
    res.json({
      success: true,
      data: await service.updateAccountStatus(
        req.account,
        req.params.id,
        input,
      ),
    });
  } catch (error) {
    next(error);
  }
}

async function deleteAccount(req, res, next) {
  try {
    res.json({
      success: true,
      data: await service.deleteAccount(req.account, req.params.id),
    });
  } catch (error) {
    next(error);
  }
}

async function listBooks(req, res, next) {
  try {
    res.json({
      success: true,
      data: await service.listBooks(schemas.listBooksSchema.parse(req.query)),
    });
  } catch (error) {
    next(error);
  }
}

async function getBook(req, res, next) {
  try {
    res.json({ success: true, data: await service.getBook(req.params.id) });
  } catch (error) {
    next(error);
  }
}

async function updateBook(req, res, next) {
  try {
    const input = schemas.updateBookSchema.parse(req.body);
    res.json({
      success: true,
      data: {
        book: await service.updateBook(req.account, req.params.id, input),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function updateBookStatus(req, res, next) {
  try {
    const input = schemas.updateBookStatusSchema.parse(req.body);
    res.json({
      success: true,
      data: await service.updateBookStatus(req.account, req.params.id, input),
    });
  } catch (error) {
    next(error);
  }
}

async function deleteBook(req, res, next) {
  try {
    res.json({
      success: true,
      data: await service.deleteBook(req.account, req.params.id),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listAccounts,
  updateAccountStatus,
  deleteAccount,
  listBooks,
  getBook,
  updateBook,
  updateBookStatus,
  deleteBook,
};

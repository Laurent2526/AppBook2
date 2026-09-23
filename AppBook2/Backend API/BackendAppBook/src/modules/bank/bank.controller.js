const { bankSchema } = require("./bank.schema");
const service = require("./bank.service");

async function list(req, res, next) {
  try {
    res.json({
      success: true,
      data: { bankAccounts: await service.list(req.auth.sub) },
    });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    res
      .status(201)
      .json({
        success: true,
        data: {
          bankAccount: await service.create(
            req.auth.sub,
            bankSchema.parse(req.body),
          ),
        },
      });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    await service.remove(req.auth.sub, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = { list, create, remove };

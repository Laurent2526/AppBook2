const repository = require("./category.repository");

async function list(req, res, next) {
  try {
    const categories = await repository.listActive();
    res.json({ success: true, data: { categories } });
  } catch (error) {
    next(error);
  }
}

module.exports = { list };

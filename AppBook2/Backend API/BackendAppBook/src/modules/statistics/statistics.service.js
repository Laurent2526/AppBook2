const ApiError = require("../../utils/apiError");
const repository = require("./statistics.repository");

function resolveRange(input) {
  const today = new Date().toISOString().slice(0, 10);
  const from = input.from || today;
  const to = input.to || today;
  if (from > to) {
    throw new ApiError(400, "INVALID_DATE_RANGE", "Khoảng ngày không hợp lệ");
  }
  return { from, to };
}

async function platform(input) {
  const range = resolveRange(input);
  return { ...range, items: await repository.listPlatform(range) };
}

async function books(input) {
  const range = resolveRange(input);
  return {
    ...range,
    items: await repository.listBooks({ ...range, bookId: input.bookId }),
  };
}

async function authors(input) {
  const range = resolveRange(input);
  return {
    ...range,
    items: await repository.listAuthors({
      ...range,
      accountId: input.accountId,
    }),
  };
}

module.exports = { platform, books, authors };

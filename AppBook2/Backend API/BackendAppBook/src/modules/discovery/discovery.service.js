const ApiError = require("../../utils/apiError");
const repository = require("./discovery.repository");

async function listFeaturedAuthors(limit, search) {
  return repository.listFeaturedAuthors(limit, search);
}

async function recommendations(accountId, input) {
  const categoryIds = input.categoryIds
    ? [...new Set(input.categoryIds.split(",").map(Number))]
    : [];
  return repository.listRecommendations(accountId, categoryIds, input.limit);
}

async function following(accountId) {
  if (!accountId) {
    throw new ApiError(401, "AUTH_REQUIRED", "Yêu cầu access token");
  }
  return repository.listFollowFeed(accountId);
}

module.exports = { listFeaturedAuthors, recommendations, following };

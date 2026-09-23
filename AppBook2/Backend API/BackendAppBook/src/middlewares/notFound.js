const ApiError = require("../utils/apiError");

module.exports = (req, res, next) => {
  next(new ApiError(404, "ROUTE_NOT_FOUND", "Route not found"));
};

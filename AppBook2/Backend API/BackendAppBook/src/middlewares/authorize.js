const ApiError = require("../utils/apiError");

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.account || !roles.includes(req.account.role)) {
      return next(
        new ApiError(
          403,
          "FORBIDDEN",
          "Bạn không có quyền thực hiện thao tác này",
        ),
      );
    }
    next();
  };
}

module.exports = authorize;

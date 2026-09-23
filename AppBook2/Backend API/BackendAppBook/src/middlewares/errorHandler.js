module.exports = (error, req, res, next) => {
  const isValidationError = error?.name === "ZodError";
  const status = isValidationError ? 400 : error.status || 500;
  const code = isValidationError
    ? "VALIDATION_ERROR"
    : error.code || "INTERNAL_SERVER_ERROR";

  if (status >= 500) {
    req.log?.error({ err: error }, "Unhandled request error");
  }

  res.status(status).json({
    success: false,
    error: {
      code,
      message: status >= 500 ? "Internal server error" : error.message,
      ...(isValidationError ? { details: error.flatten() } : {}),
      ...(!isValidationError && error.details
        ? { details: error.details }
        : {}),
    },
  });
};

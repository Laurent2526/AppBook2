const { createKycSchema, reviewKycSchema } = require("./kyc.schema");
const service = require("./kyc.service");

async function get(req, res, next) {
  try {
    res.json({ success: true, data: { kyc: await service.get(req.auth.sub) } });
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
          kyc: await service.create(
            req.auth.sub,
            createKycSchema.parse(req.body),
          ),
        },
      });
  } catch (error) {
    next(error);
  }
}

async function review(req, res, next) {
  try {
    res.json({
      success: true,
      data: await service.review(
        req.account,
        req.params.id,
        reviewKycSchema.parse(req.body),
      ),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { get, create, review };

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const uploadDirectory = path.join(__dirname, "../../uploads/covers");
fs.mkdirSync(uploadDirectory, { recursive: true });

const extensionByMimeType = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (req, file, callback) => {
    callback(
      null,
      `${crypto.randomUUID()}${extensionByMimeType[file.mimetype]}`,
    );
  },
});

module.exports = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!extensionByMimeType[file.mimetype]) {
      return callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "cover"));
    }
    callback(null, true);
  },
});

require("dotenv").config();

const base = {
  client: "mysql2",
  connection: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "123456",
    database: process.env.DB_NAME || "web_sach",
    charset: "utf8mb4",
    timezone: "Z",
  },
};

module.exports = {
  development: { ...base, pool: { min: 2, max: 10 } },
  test: { ...base, pool: { min: 1, max: 5 } },
  production: {
    ...base,
    pool: { min: 2, max: Number(process.env.DB_CONNECTION_LIMIT || 10) },
  },
};

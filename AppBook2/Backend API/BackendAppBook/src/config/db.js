const knex = require("knex");
const env = require("./env");

const db = knex({
  client: "mysql2",
  connection: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    charset: "utf8mb4",
    timezone: "Z",
    multipleStatements: true,
  },
  pool: {
    min: 2,
    max: env.DB_CONNECTION_LIMIT,
    afterCreate: (connection, done) => {
      connection.query("SET time_zone = '+00:00'", (error) =>
        done(error, connection),
      );
    },
  },
});

module.exports = db;

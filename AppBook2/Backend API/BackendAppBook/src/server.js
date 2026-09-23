const app = require("./app");
const env = require("./config/env");
const db = require("./config/db");

const server = app.listen(env.PORT, () => {
  console.log(`APPBOOK API running on port ${env.PORT}`);
});

const shutdown = async (signal) => {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await db.destroy();
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

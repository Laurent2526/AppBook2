const { defineConfig } = require("vitest/config");

process.env.NODE_ENV = "test";

module.exports = defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30000,
    fileParallelism: false,
  },
});

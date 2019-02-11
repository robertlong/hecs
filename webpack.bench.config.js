const path = require("path");
const merge = require("webpack-merge");
const baseConfig = require("./webpack.base.config");

module.exports = merge(baseConfig, {
  entry: path.resolve(__dirname, "bench", "index.ts")
});
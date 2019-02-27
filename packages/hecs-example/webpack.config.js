const path = require("path");
const merge = require("webpack-merge");
const HTMLWebpackPlugin = require("html-webpack-plugin");
const baseConfig = require("../webpack.base.config");

module.exports = merge(baseConfig, {
  entry: path.resolve(__dirname, "src", "index.ts"),
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js"
  },
  plugins: [new HTMLWebpackPlugin()]
});

const path = require("path");
const merge = require("webpack-merge");
const baseConfig = require("../webpack.base.config");
const HTMLWebpackPlugin = require("html-webpack-plugin");

module.exports = merge(baseConfig, {
  entry: path.resolve(__dirname, "src", "index.ts"),
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js"
  },
  plugins: [
    new HTMLWebpackPlugin({
      template: path.resolve(__dirname, "index.html")
    })
  ]
});

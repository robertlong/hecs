const path = require("path");
const merge = require("webpack-merge");
const baseConfig = require("./webpack.base.config");

module.exports = merge(baseConfig, {
  entry: path.resolve(__dirname, "example", "index.ts"),
  devServer: {
    contentBase: path.join(__dirname, "example", "public")
  },
  "resolve": {
    "alias": {
      "hecs": path.join(__dirname, "src")
    }
  }
});
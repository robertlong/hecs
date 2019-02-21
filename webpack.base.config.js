const path = require("path");
const webpack = require("webpack");
const HTMLWebpackPlugin = require("html-webpack-plugin");

const configFile = path.join(__dirname, process.env.TS_NODE_PROJECT);

module.exports = {
  mode: "development",
  devtool: "inline-source-map",
  output: {
    filename: "bundle.js"
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"]
  },
  module: {
    rules: [
      { test: /\.ts$/, loader: "ts-loader", options: { configFile } }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    }),
    new HTMLWebpackPlugin()
  ]
};
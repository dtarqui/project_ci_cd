const path = require("path");
const webpack = require("webpack");
const dotenv = require("dotenv");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const env = dotenv.config().parsed || {};
const envKeys = Object.keys(env).reduce((acc, key) => {
  acc[`process.env.${key}`] = JSON.stringify(env[key]);
  return acc;
}, {});

module.exports = {
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    // El nombre incluye un resumen del contenido: cada version cambia de nombre,
    // de modo que el navegador puede guardarla en cache sin revalidarla
    // (cabeceras de /static en vercel.json).
    filename: "static/js/[name].[contenthash:8].js",
    chunkFilename: "static/js/[name].[contenthash:8].chunk.js",
    // Ruta absoluta: las rutas internas (/dashboard/...) cargan los archivos
    // desde la raiz y no desde la carpeta de la ruta.
    publicPath: "/",
    clean: true,
  },
  optimization: {
    // React, el enrutador y Recharts van en archivos propios, que cambian poco.
    splitChunks: { chunks: "all" },
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: { loader: "babel-loader" },
      },
      { test: /\.css$/, use: ["style-loader", "css-loader"] },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: "./public/index.html", favicon: "./public/favicon.svg" }),
    new webpack.DefinePlugin(envKeys),
  ],
  devServer: {
    static: "./dist",
    historyApiFallback: true,
    port: 3000,
    hot: true,
  },
  resolve: { extensions: [".js", ".jsx"] },
};

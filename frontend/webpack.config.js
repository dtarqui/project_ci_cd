const fs = require("fs");
const path = require("path");
const webpack = require("webpack");
const dotenv = require("dotenv");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { GenerateSW } = require("workbox-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const env = dotenv.config().parsed || {};
const envKeys = Object.keys(env).reduce((acc, key) => {
  acc[`process.env.${key}`] = JSON.stringify(env[key]);
  return acc;
}, {});

// Archivos de la aplicacion instalable que no pasan por el empaquetado: se copian
// tal cual a dist/ antes de generar el service worker, para que este los incluya.
const PWA_FILES = [
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
];

class CopyPublicFilesPlugin {
  constructor(files) {
    this.files = files;
  }

  apply(compiler) {
    compiler.hooks.thisCompilation.tap("CopyPublicFilesPlugin", (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: "CopyPublicFilesPlugin",
          stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        },
        () => {
          for (const file of this.files) {
            const content = fs.readFileSync(path.resolve(__dirname, "public", file));
            compilation.emitAsset(file, new webpack.sources.RawSource(content));
          }
        }
      );
    });
  }
}

// Service worker (solo en produccion). Guarda la aplicacion para abrirla sin red y
// las ultimas lecturas (tablero, ventas, productos, clientes y catalogos); el
// formulario de venta necesita las de productos y clientes sin conexion. Las ventas no pasan por aqui: las guarda la cola
// de src/utils/offlineSales.js, con su clave de idempotencia.
const serviceWorker = () =>
  new GenerateSW({
    swDest: "sw.js",
    clientsClaim: true,
    skipWaiting: true,
    cleanupOutdatedCaches: true,
    // Los avisos de licencia acompanan al codigo, pero el navegador no los usa.
    exclude: [/\.LICENSE\.txt$/],
    navigateFallback: "/index.html",
    navigateFallbackDenylist: [/^\/api\//],
    runtimeCaching: [
      {
        // La API esta en otro dominio: el patron debe cubrir la URL completa.
        urlPattern: /^https?:\/\/[^/]+\/api\/v1\/(products|customers|catalogs|dashboard|sales)(\/|\?|$)/,
        method: "GET",
        handler: "NetworkFirst",
        options: {
          cacheName: "api-lecturas",
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 60, maxAgeSeconds: 24 * 60 * 60 },
          cacheableResponse: { statuses: [200] },
        },
      },
    ],
  });

module.exports = (_env, argv = {}) => ({
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
      // En produccion el CSS va en archivos propios y no en etiquetas <style>: asi la
      // Content-Security-Policy (vercel.json) no necesita permitir estilos en linea.
      {
        test: /\.css$/,
        use: [
          argv.mode === "production" ? MiniCssExtractPlugin.loader : "style-loader",
          "css-loader",
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: "./public/index.html", favicon: "./public/favicon.svg" }),
    new webpack.DefinePlugin(envKeys),
    new CopyPublicFilesPlugin(PWA_FILES),
    ...(argv.mode === "production"
      ? [new MiniCssExtractPlugin({ filename: "static/css/[name].[contenthash:8].css", chunkFilename: "static/css/[name].[contenthash:8].chunk.css" })]
      : []),
    ...(argv.mode === "production" ? [serviceWorker()] : []),
  ],
  devServer: {
    static: "./dist",
    historyApiFallback: true,
    port: 3000,
    hot: true,
  },
  resolve: { extensions: [".js", ".jsx"] },
});

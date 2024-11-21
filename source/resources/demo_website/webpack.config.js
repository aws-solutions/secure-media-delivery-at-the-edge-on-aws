// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  performance: {
    hints: 'warning',
    // bundled size is large but the site works well
    maxEntrypointSize: 4536000,
    maxAssetSize: 4536000
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.ico$/,
        type: 'asset/resource',
        generator: {
          filename: '[name][ext]'
        }
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      favicon: './src/img/favicon.ico'
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/img/smile.png', to: 'img/smile.png' },
        { from: 'src/img/favicon.ico', to: 'img/favicon.ico' }
      ],
    }),
  ],
};
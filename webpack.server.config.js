const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
const { DefinePlugin } = require('webpack');
const dotenv = require('dotenv');

dotenv.config();

module.exports = function (env) {
    const isProduction = !!env.production;
    const isDevelopment = !isProduction;

    const config = {
        entry: path.join(__dirname, 'src/server/index.ts'),
        mode: isProduction ? 'production' : 'development',
        devtool: 'source-map',
        target: 'node',
        optimization: {
            minimize: isProduction,
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        compress: {
                            hoist_funs: true,
                            reduce_funcs: false,
                            passes: 20,
                            ecma: 2020,
                            unsafe: true,
                            toplevel: true,
                        },
                        mangle: {
                            properties: false,
                        },
                        ecma: 2020,
                        toplevel: true,
                    },
                }),
            ],
        },
        module: {
            rules: [
                {
                    test: /\.(js|ts|jsx)$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                '@babel/preset-env',
                                {
                                    exclude: ['transform-typeof-symbol'],
                                },
                            ],
                            targets: {
                                chrome: '80',
                            },
                            plugins: ['@babel/plugin-transform-runtime'],
                        },
                    },
                },
            ],
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
        },
        output: {
            filename: 'server.js',
            path: path.resolve(__dirname, 'build/server'),
        },

        externalsPresets: { node: true }, // in order to ignore built-in modules like path, fs, etc.
        externals: [nodeExternals()],
        plugins: [
            new DefinePlugin({
                'process.env.NODE_ENV': JSON.stringify(
                    isDevelopment ? 'development' : 'production'
                ),
                //'process.env.CF_EMAIL': JSON.stringify(process.env.CF_EMAIL),
                //'process.env.CF_SUB_DOMAIN': JSON.stringify(
                //process.env.CF_SUB_DOMAIN
                //),
                //'process.env.CF_PROXIED': JSON.stringify(
                //process.env.CF_PROXIED
                //),
                //'process.env.CF_TOKEN': JSON.stringify(process.env.CF_TOKEN),
                //'process.env.CF_ZONE': JSON.stringify(process.env.CF_ZONE),
                //'process.env.API_HOST': JSON.stringify(process.env.API_HOST),
                //'process.env.API_PORT': JSON.stringify(process.env.API_PORT),
                //'process.env.API_SSL': JSON.stringify(process.env.API_SSL),
                //'process.env.API_PASSWORD': JSON.stringify(
                //process.env.API_PASSWORD
                //),
                //'process.env.LISTEN_PORT': JSON.stringify(
                //process.env.LISTEN_PORT
                //),
                //'process.env.MAX_PLAYERS': JSON.stringify(
                //process.env.MAX_PLAYERS
                //),
                //'process.env.GAME_MODE': JSON.stringify(process.env.GAME_MODE),
            }),
        ],
    };

    return config;
};

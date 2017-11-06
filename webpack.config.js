const fs = require('fs');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ProgressPlugin = require('webpack/lib/ProgressPlugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const autoprefixer = require('autoprefixer');
const postcssUrl = require('postcss-url');
const cssnano = require('cssnano');
const customProperties = require('postcss-custom-properties');

const { NoEmitOnErrorsPlugin, SourceMapDevToolPlugin, NamedModulesPlugin } = require('webpack');
const { NamedLazyChunksWebpackPlugin, BaseHrefWebpackPlugin } = require('@angular/cli/plugins/webpack');
const { CommonsChunkPlugin } = require('webpack').optimize;
const { AngularCompilerPlugin } = require('@ngtools/webpack');

const nodeModules = path.join(process.cwd(), 'node_modules');
const realNodeModules = fs.realpathSync(nodeModules);
const genDirNodeModules = path.join(process.cwd(), 'src', '$$_gendir', 'node_modules');
const entryPoints = ["inline", "polyfills", "sw-register", "styles", "vendor", "main", "electronStartup"];
const minimizeCss = false;
const baseHref = "";
const deployUrl = "";
const postcssPlugins = function () {
  // safe settings based on: https://github.com/ben-eb/cssnano/issues/358#issuecomment-283696193
  const importantCommentRe = /@preserve|@license|[@#]\s*source(?:Mapping)?URL|^!/i;
  const minimizeOptions = {
    autoprefixer: false,
    safe: true,
    mergeLonghand: false,
    discardComments: { remove: (comment) => !importantCommentRe.test(comment) }
  };
  return [
    postcssUrl({
      url: (URL) => {
        // Only convert root relative URLs, which CSS-Loader won't process into require().
        if (!URL.startsWith('/') || URL.startsWith('//')) {
          return URL;
        }
        if (deployUrl.match(/:\/\//)) {
          // If deployUrl contains a scheme, ignore baseHref use deployUrl as is.
          return `${deployUrl.replace(/\/$/, '')}${URL}`;
        }
        else if (baseHref.match(/:\/\//)) {
          // If baseHref contains a scheme, include it as is.
          return baseHref.replace(/\/$/, '') +
            `/${deployUrl}/${URL}`.replace(/\/\/+/g, '/');
        }
        else {
          // Join together base-href, deploy-url and the original URL.
          // Also dedupe multiple slashes into single ones.
          return `/${baseHref}/${deployUrl}/${URL}`.replace(/\/\/+/g, '/');
        }
      }
    }),
    autoprefixer(),
    customProperties({ preserve: true })
  ].concat(minimizeCss ? [cssnano(minimizeOptions)] : []);
};

const commonConfig = {
  "resolveLoader": {
    "modules": [
      "./node_modules",
      "./node_modules"
    ]
  },
  "output": {
    "path": path.join(process.cwd(), "dist"),
    "filename": "[name].bundle.js",
    "chunkFilename": "[id].chunk.js",
    "crossOriginLoading": false
  },
  
  "node": {
    "fs": "empty",
    "global": true,
    "crypto": "empty",
    "tls": "empty",
    "net": "empty",
    "process": true,
    "module": false,
    "clearImmediate": false,
    "setImmediate": false
  },
  "devServer": {
    "historyApiFallback": true
  }
};
module.exports = [
  Object.assign({
    "plugins": [
      new NoEmitOnErrorsPlugin(),
      new CopyWebpackPlugin([
        {
          "context": "src",
          "to": "",
          "from": {
            "glob": "assets/**/*",
            "dot": true
          }
        },
        {
          "context": "src",
          "to": "",
          "from": {
            "glob": "favicon.ico",
            "dot": true
          }
        },
        {
          "context": "src",
          "to": "",
          "from": {
            "glob": "electron-startup.js",
            "dot": true
          }
        }
      ], {
          "ignore": [
            ".gitkeep"
          ],
          "debug": "warning"
        }),
      new ProgressPlugin(),
      new CircularDependencyPlugin({
        "exclude": /(\\|\/)node_modules(\\|\/)/,
        "failOnError": false
      }),
      new NamedLazyChunksWebpackPlugin(),
      new HtmlWebpackPlugin({
        "template": "./src/index.html",
        "filename": "./index.html",
        "hash": false,
        "inject": true,
        "compile": true,
        "favicon": false,
        "minify": false,
        "cache": true,
        "showErrors": true,
        "chunks": "all",
        "excludeChunks": [],
        "title": "Webpack App",
        "xhtml": true,
        "chunksSortMode": function sort(left, right) {
          let leftIndex = entryPoints.indexOf(left.names[0]);
          let rightindex = entryPoints.indexOf(right.names[0]);
          if (leftIndex > rightindex) {
            return 1;
          }
          else if (leftIndex < rightindex) {
            return -1;
          }
          else {
            return 0;
          }
        }
      }),
      new BaseHrefWebpackPlugin({}),
      new CommonsChunkPlugin({
        "name": [
          "inline"
        ],
        "minChunks": null
      }),
      new CommonsChunkPlugin({
        "name": [
          "vendor"
        ],
        "minChunks": (module) => {
          return module.resource
            && (module.resource.startsWith(nodeModules)
              || module.resource.startsWith(genDirNodeModules)
              || module.resource.startsWith(realNodeModules));
        },
        "chunks": [
          "main"
        ]
      }),
      new SourceMapDevToolPlugin({
        "filename": "[file].map[query]",
        "moduleFilenameTemplate": "[resource-path]",
        "fallbackModuleFilenameTemplate": "[resource-path]?[hash]",
        "sourceRoot": "webpack:///"
      }),
      new CommonsChunkPlugin({
        "name": [
          "main"
        ],
        "minChunks": 2,
        "async": "common"
      }),
      new NamedModulesPlugin({}),
      new AngularCompilerPlugin({
        "mainPath": "main.ts",
        "platform": 0,
        "hostReplacementPaths": {
          "environments/environment.ts": "environments/environment.ts"
        },
        "sourceMap": true,
        "tsConfigPath": "src/tsconfig.app.json",
        "skipCodeGeneration": true,
        "compilerOptions": {}
      })
    ],
    "module": {
      "rules": [
        {
          "test": /\.html$/,
          "loader": "raw-loader"
        },
        {
          "test": /\.(eot|svg|cur)$/,
          "loader": "file-loader",
          "options": {
            "name": "[name].[hash:20].[ext]",
            "limit": 10000
          }
        },
        {
          "test": /\.(jpg|png|webp|gif|otf|ttf|woff|woff2|ani)$/,
          "loader": "url-loader",
          "options": {
            "name": "[name].[hash:20].[ext]",
            "limit": 10000
          }
        },
        {
          "exclude": [
            path.join(process.cwd(), "src/styles.css")
          ],
          "test": /\.css$/,
          "use": [
            "exports-loader?module.exports.toString()",
            {
              "loader": "css-loader",
              "options": {
                "sourceMap": false,
                "importLoaders": 1
              }
            },
            {
              "loader": "postcss-loader",
              "options": {
                "ident": "postcss",
                "plugins": postcssPlugins
              }
            }
          ]
        },
        {
          "exclude": [
            path.join(process.cwd(), "src/styles.css")
          ],
          "test": /\.scss$|\.sass$/,
          "use": [
            "exports-loader?module.exports.toString()",
            {
              "loader": "css-loader",
              "options": {
                "sourceMap": false,
                "importLoaders": 1
              }
            },
            {
              "loader": "postcss-loader",
              "options": {
                "ident": "postcss",
                "plugins": postcssPlugins
              }
            },
            {
              "loader": "sass-loader",
              "options": {
                "sourceMap": false,
                "precision": 8,
                "includePaths": []
              }
            }
          ]
        },
        {
          "exclude": [
            path.join(process.cwd(), "src/styles.css")
          ],
          "test": /\.less$/,
          "use": [
            "exports-loader?module.exports.toString()",
            {
              "loader": "css-loader",
              "options": {
                "sourceMap": false,
                "importLoaders": 1
              }
            },
            {
              "loader": "postcss-loader",
              "options": {
                "ident": "postcss",
                "plugins": postcssPlugins
              }
            },
            {
              "loader": "less-loader",
              "options": {
                "sourceMap": false
              }
            }
          ]
        },
        {
          "exclude": [
            path.join(process.cwd(), "src/styles.css")
          ],
          "test": /\.styl$/,
          "use": [
            "exports-loader?module.exports.toString()",
            {
              "loader": "css-loader",
              "options": {
                "sourceMap": false,
                "importLoaders": 1
              }
            },
            {
              "loader": "postcss-loader",
              "options": {
                "ident": "postcss",
                "plugins": postcssPlugins
              }
            },
            {
              "loader": "stylus-loader",
              "options": {
                "sourceMap": false,
                "paths": []
              }
            }
          ]
        },
        {
          "include": [
            path.join(process.cwd(), "src/styles.css")
          ],
          "test": /\.css$/,
          "use": [
            "style-loader",
            {
              "loader": "css-loader",
              "options": {
                "sourceMap": false,
                "importLoaders": 1
              }
            },
            {
              "loader": "postcss-loader",
              "options": {
                "ident": "postcss",
                "plugins": postcssPlugins
              }
            }
          ]
        },
        {
          "include": [
            path.join(process.cwd(), "src/styles.css")
          ],
          "test": /\.scss$|\.sass$/,
          "use": [
            "style-loader",
            {
              "loader": "css-loader",
              "options": {
                "sourceMap": false,
                "importLoaders": 1
              }
            },
            {
              "loader": "postcss-loader",
              "options": {
                "ident": "postcss",
                "plugins": postcssPlugins
              }
            },
            {
              "loader": "sass-loader",
              "options": {
                "sourceMap": false,
                "precision": 8,
                "includePaths": []
              }
            }
          ]
        },
        {
          "include": [
            path.join(process.cwd(), "src/styles.css")
          ],
          "test": /\.less$/,
          "use": [
            "style-loader",
            {
              "loader": "css-loader",
              "options": {
                "sourceMap": false,
                "importLoaders": 1
              }
            },
            {
              "loader": "postcss-loader",
              "options": {
                "ident": "postcss",
                "plugins": postcssPlugins
              }
            },
            {
              "loader": "less-loader",
              "options": {
                "sourceMap": false
              }
            }
          ]
        },
        {
          "include": [
            path.join(process.cwd(), "src/styles.css")
          ],
          "test": /\.styl$/,
          "use": [
            "style-loader",
            {
              "loader": "css-loader",
              "options": {
                "sourceMap": false,
                "importLoaders": 1
              }
            },
            {
              "loader": "postcss-loader",
              "options": {
                "ident": "postcss",
                "plugins": postcssPlugins
              }
            },
            {
              "loader": "stylus-loader",
              "options": {
                "sourceMap": false,
                "paths": []
              }
            }
          ]
        },
        {
          "test": /\.ts$/,
          "loader": "@ngtools/webpack"
        }
      ]
    },
    "entry": {
      "main": [
        "./src/main.ts"
      ],
      "polyfills": [
        "./src/polyfills.ts"
      ],
      "styles": [
        "./src/styles.css"
      ]
    },

    "target": "electron-renderer",
    "resolve": {
      "extensions": [
        ".ts",
        ".js"
      ],
      "modules": [
        "./node_modules",
        "./node_modules"
      ],
      "symlinks": true,
      "alias": {
        "rxjs/AsyncSubject": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/AsyncSubject.js",
        "rxjs/BehaviorSubject": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/BehaviorSubject.js",
        "rxjs/InnerSubscriber": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/InnerSubscriber.js",
        "rxjs/Notification": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/Notification.js",
        "rxjs/Observable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/Observable.js",
        "rxjs/Observer": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/Observer.js",
        "rxjs/Operator": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/Operator.js",
        "rxjs/OuterSubscriber": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/OuterSubscriber.js",
        "rxjs/ReplaySubject": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/ReplaySubject.js",
        "rxjs/Rx": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/Rx.js",
        "rxjs/Scheduler": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/Scheduler.js",
        "rxjs/Subject": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/Subject.js",
        "rxjs/SubjectSubscription": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/SubjectSubscription.js",
        "rxjs/Subscriber": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/Subscriber.js",
        "rxjs/Subscription": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/Subscription.js",
        "rxjs/add/observable/bindCallback": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/observable/bindCallback.js",
        "rxjs/add/observable/bindNodeCallback": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/observable/bindNodeCallback.js",
        "rxjs/add/observable/combineLatest": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/observable/combineLatest.js",
        "rxjs/add/observable/concat": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/observable/concat.js",
        "rxjs/add/observable/defer": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/observable/defer.js",
        "rxjs/add/observable/dom/ajax": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/observable/dom/ajax.js",
        "rxjs/add/observable/dom/webSocket": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/observable/dom/webSocket.js",
        "rxjs/add/observable/empty": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/observable/empty.js",
        "rxjs/add/observable/forkJoin": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/observable/forkJoin.js",
        "rxjs/add/observable/from": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/observable/from.js",
        "rxjs/add/observable/fromEvent": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/observable/fromEvent.js",
        "rxjs/add/observable/fromEventPattern": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/observable/fromEventPattern.js",
        "rxjs/add/observable/fromPromise": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/observable/fromPromise.js",
        "rxjs/add/observable/generate": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/observable/generate.js",
        "rxjs/add/observable/if": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/observable/if.js",
        "rxjs/add/observable/interval": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/observable/interval.js",
        "rxjs/add/observable/merge": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/observable/merge.js",
        "rxjs/add/observable/never": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/observable/never.js",
        "rxjs/add/observable/of": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/observable/of.js",
        "rxjs/add/observable/onErrorResumeNext": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/observable/onErrorResumeNext.js",
        "rxjs/add/observable/pairs": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/observable/pairs.js",
        "rxjs/add/observable/race": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/observable/race.js",
        "rxjs/add/observable/range": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/observable/range.js",
        "rxjs/add/observable/throw": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/observable/throw.js",
        "rxjs/add/observable/timer": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/observable/timer.js",
        "rxjs/add/observable/using": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/observable/using.js",
        "rxjs/add/observable/zip": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/observable/zip.js",
        "rxjs/add/operator/audit": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/audit.js",
        "rxjs/add/operator/auditTime": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/auditTime.js",
        "rxjs/add/operator/buffer": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/buffer.js",
        "rxjs/add/operator/bufferCount": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/bufferCount.js",
        "rxjs/add/operator/bufferTime": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/bufferTime.js",
        "rxjs/add/operator/bufferToggle": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/bufferToggle.js",
        "rxjs/add/operator/bufferWhen": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/bufferWhen.js",
        "rxjs/add/operator/catch": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/catch.js",
        "rxjs/add/operator/combineAll": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/combineAll.js",
        "rxjs/add/operator/combineLatest": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/combineLatest.js",
        "rxjs/add/operator/concat": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/concat.js",
        "rxjs/add/operator/concatAll": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/concatAll.js",
        "rxjs/add/operator/concatMap": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/concatMap.js",
        "rxjs/add/operator/concatMapTo": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/concatMapTo.js",
        "rxjs/add/operator/count": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/count.js",
        "rxjs/add/operator/debounce": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/debounce.js",
        "rxjs/add/operator/debounceTime": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/debounceTime.js",
        "rxjs/add/operator/defaultIfEmpty": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/defaultIfEmpty.js",
        "rxjs/add/operator/delay": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/delay.js",
        "rxjs/add/operator/delayWhen": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/delayWhen.js",
        "rxjs/add/operator/dematerialize": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/dematerialize.js",
        "rxjs/add/operator/distinct": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/distinct.js",
        "rxjs/add/operator/distinctUntilChanged": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/distinctUntilChanged.js",
        "rxjs/add/operator/distinctUntilKeyChanged": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/distinctUntilKeyChanged.js",
        "rxjs/add/operator/do": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/do.js",
        "rxjs/add/operator/elementAt": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/elementAt.js",
        "rxjs/add/operator/every": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/every.js",
        "rxjs/add/operator/exhaust": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/exhaust.js",
        "rxjs/add/operator/exhaustMap": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/exhaustMap.js",
        "rxjs/add/operator/expand": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/expand.js",
        "rxjs/add/operator/filter": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/filter.js",
        "rxjs/add/operator/finally": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/finally.js",
        "rxjs/add/operator/find": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/find.js",
        "rxjs/add/operator/findIndex": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/findIndex.js",
        "rxjs/add/operator/first": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/first.js",
        "rxjs/add/operator/groupBy": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/groupBy.js",
        "rxjs/add/operator/ignoreElements": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/ignoreElements.js",
        "rxjs/add/operator/isEmpty": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/isEmpty.js",
        "rxjs/add/operator/last": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/last.js",
        "rxjs/add/operator/let": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/let.js",
        "rxjs/add/operator/map": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/map.js",
        "rxjs/add/operator/mapTo": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/mapTo.js",
        "rxjs/add/operator/materialize": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/materialize.js",
        "rxjs/add/operator/max": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/max.js",
        "rxjs/add/operator/merge": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/merge.js",
        "rxjs/add/operator/mergeAll": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/mergeAll.js",
        "rxjs/add/operator/mergeMap": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/mergeMap.js",
        "rxjs/add/operator/mergeMapTo": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/mergeMapTo.js",
        "rxjs/add/operator/mergeScan": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/mergeScan.js",
        "rxjs/add/operator/min": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/min.js",
        "rxjs/add/operator/multicast": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/multicast.js",
        "rxjs/add/operator/observeOn": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/observeOn.js",
        "rxjs/add/operator/onErrorResumeNext": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/onErrorResumeNext.js",
        "rxjs/add/operator/pairwise": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/pairwise.js",
        "rxjs/add/operator/partition": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/partition.js",
        "rxjs/add/operator/pluck": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/pluck.js",
        "rxjs/add/operator/publish": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/publish.js",
        "rxjs/add/operator/publishBehavior": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/publishBehavior.js",
        "rxjs/add/operator/publishLast": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/publishLast.js",
        "rxjs/add/operator/publishReplay": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/publishReplay.js",
        "rxjs/add/operator/race": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/race.js",
        "rxjs/add/operator/reduce": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/reduce.js",
        "rxjs/add/operator/repeat": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/repeat.js",
        "rxjs/add/operator/repeatWhen": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/repeatWhen.js",
        "rxjs/add/operator/retry": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/retry.js",
        "rxjs/add/operator/retryWhen": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/retryWhen.js",
        "rxjs/add/operator/sample": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/sample.js",
        "rxjs/add/operator/sampleTime": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/sampleTime.js",
        "rxjs/add/operator/scan": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/scan.js",
        "rxjs/add/operator/sequenceEqual": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/sequenceEqual.js",
        "rxjs/add/operator/share": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/share.js",
        "rxjs/add/operator/shareReplay": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/shareReplay.js",
        "rxjs/add/operator/single": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/single.js",
        "rxjs/add/operator/skip": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/skip.js",
        "rxjs/add/operator/skipLast": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/skipLast.js",
        "rxjs/add/operator/skipUntil": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/skipUntil.js",
        "rxjs/add/operator/skipWhile": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/skipWhile.js",
        "rxjs/add/operator/startWith": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/startWith.js",
        "rxjs/add/operator/subscribeOn": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/subscribeOn.js",
        "rxjs/add/operator/switch": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/switch.js",
        "rxjs/add/operator/switchMap": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/switchMap.js",
        "rxjs/add/operator/switchMapTo": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/switchMapTo.js",
        "rxjs/add/operator/take": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/take.js",
        "rxjs/add/operator/takeLast": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/takeLast.js",
        "rxjs/add/operator/takeUntil": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/takeUntil.js",
        "rxjs/add/operator/takeWhile": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/takeWhile.js",
        "rxjs/add/operator/throttle": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/throttle.js",
        "rxjs/add/operator/throttleTime": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/throttleTime.js",
        "rxjs/add/operator/timeInterval": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/timeInterval.js",
        "rxjs/add/operator/timeout": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/timeout.js",
        "rxjs/add/operator/timeoutWith": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/timeoutWith.js",
        "rxjs/add/operator/timestamp": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/timestamp.js",
        "rxjs/add/operator/toArray": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/toArray.js",
        "rxjs/add/operator/toPromise": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/toPromise.js",
        "rxjs/add/operator/window": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/window.js",
        "rxjs/add/operator/windowCount": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/windowCount.js",
        "rxjs/add/operator/windowTime": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/windowTime.js",
        "rxjs/add/operator/windowToggle": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/windowToggle.js",
        "rxjs/add/operator/windowWhen": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/windowWhen.js",
        "rxjs/add/operator/withLatestFrom": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/withLatestFrom.js",
        "rxjs/add/operator/zip": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/zip.js",
        "rxjs/add/operator/zipAll": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/add/operator/zipAll.js",
        "rxjs/interfaces": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/interfaces.js",
        "rxjs/observable/ArrayLikeObservable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/ArrayLikeObservable.js",
        "rxjs/observable/ArrayObservable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/ArrayObservable.js",
        "rxjs/observable/BoundCallbackObservable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/BoundCallbackObservable.js",
        "rxjs/observable/BoundNodeCallbackObservable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/BoundNodeCallbackObservable.js",
        "rxjs/observable/ConnectableObservable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/ConnectableObservable.js",
        "rxjs/observable/DeferObservable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/DeferObservable.js",
        "rxjs/observable/EmptyObservable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/EmptyObservable.js",
        "rxjs/observable/ErrorObservable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/ErrorObservable.js",
        "rxjs/observable/ForkJoinObservable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/ForkJoinObservable.js",
        "rxjs/observable/FromEventObservable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/FromEventObservable.js",
        "rxjs/observable/FromEventPatternObservable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/FromEventPatternObservable.js",
        "rxjs/observable/FromObservable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/FromObservable.js",
        "rxjs/observable/GenerateObservable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/GenerateObservable.js",
        "rxjs/observable/IfObservable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/IfObservable.js",
        "rxjs/observable/IntervalObservable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/IntervalObservable.js",
        "rxjs/observable/IteratorObservable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/IteratorObservable.js",
        "rxjs/observable/NeverObservable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/NeverObservable.js",
        "rxjs/observable/PairsObservable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/PairsObservable.js",
        "rxjs/observable/PromiseObservable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/PromiseObservable.js",
        "rxjs/observable/RangeObservable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/RangeObservable.js",
        "rxjs/observable/ScalarObservable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/ScalarObservable.js",
        "rxjs/observable/SubscribeOnObservable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/SubscribeOnObservable.js",
        "rxjs/observable/TimerObservable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/TimerObservable.js",
        "rxjs/observable/UsingObservable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/UsingObservable.js",
        "rxjs/observable/bindCallback": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/bindCallback.js",
        "rxjs/observable/bindNodeCallback": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/bindNodeCallback.js",
        "rxjs/observable/combineLatest": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/combineLatest.js",
        "rxjs/observable/concat": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/concat.js",
        "rxjs/observable/defer": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/defer.js",
        "rxjs/observable/dom/AjaxObservable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/dom/AjaxObservable.js",
        "rxjs/observable/dom/WebSocketSubject": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/dom/WebSocketSubject.js",
        "rxjs/observable/dom/ajax": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/dom/ajax.js",
        "rxjs/observable/dom/webSocket": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/dom/webSocket.js",
        "rxjs/observable/empty": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/empty.js",
        "rxjs/observable/forkJoin": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/forkJoin.js",
        "rxjs/observable/from": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/from.js",
        "rxjs/observable/fromEvent": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/fromEvent.js",
        "rxjs/observable/fromEventPattern": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/fromEventPattern.js",
        "rxjs/observable/fromPromise": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/fromPromise.js",
        "rxjs/observable/generate": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/generate.js",
        "rxjs/observable/if": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/if.js",
        "rxjs/observable/interval": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/interval.js",
        "rxjs/observable/merge": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/merge.js",
        "rxjs/observable/never": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/never.js",
        "rxjs/observable/of": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/of.js",
        "rxjs/observable/onErrorResumeNext": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/onErrorResumeNext.js",
        "rxjs/observable/pairs": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/pairs.js",
        "rxjs/observable/race": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/race.js",
        "rxjs/observable/range": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/range.js",
        "rxjs/observable/throw": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/throw.js",
        "rxjs/observable/timer": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/timer.js",
        "rxjs/observable/using": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/using.js",
        "rxjs/observable/zip": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/observable/zip.js",
        "rxjs/operator/audit": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/audit.js",
        "rxjs/operator/auditTime": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/auditTime.js",
        "rxjs/operator/buffer": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/buffer.js",
        "rxjs/operator/bufferCount": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/bufferCount.js",
        "rxjs/operator/bufferTime": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/bufferTime.js",
        "rxjs/operator/bufferToggle": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/bufferToggle.js",
        "rxjs/operator/bufferWhen": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/bufferWhen.js",
        "rxjs/operator/catch": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/catch.js",
        "rxjs/operator/combineAll": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/combineAll.js",
        "rxjs/operator/combineLatest": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/combineLatest.js",
        "rxjs/operator/concat": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/concat.js",
        "rxjs/operator/concatAll": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/concatAll.js",
        "rxjs/operator/concatMap": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/concatMap.js",
        "rxjs/operator/concatMapTo": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/concatMapTo.js",
        "rxjs/operator/count": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/count.js",
        "rxjs/operator/debounce": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/debounce.js",
        "rxjs/operator/debounceTime": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/debounceTime.js",
        "rxjs/operator/defaultIfEmpty": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/defaultIfEmpty.js",
        "rxjs/operator/delay": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/delay.js",
        "rxjs/operator/delayWhen": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/delayWhen.js",
        "rxjs/operator/dematerialize": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/dematerialize.js",
        "rxjs/operator/distinct": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/distinct.js",
        "rxjs/operator/distinctUntilChanged": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/distinctUntilChanged.js",
        "rxjs/operator/distinctUntilKeyChanged": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/distinctUntilKeyChanged.js",
        "rxjs/operator/do": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/do.js",
        "rxjs/operator/elementAt": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/elementAt.js",
        "rxjs/operator/every": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/every.js",
        "rxjs/operator/exhaust": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/exhaust.js",
        "rxjs/operator/exhaustMap": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/exhaustMap.js",
        "rxjs/operator/expand": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/expand.js",
        "rxjs/operator/filter": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/filter.js",
        "rxjs/operator/finally": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/finally.js",
        "rxjs/operator/find": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/find.js",
        "rxjs/operator/findIndex": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/findIndex.js",
        "rxjs/operator/first": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/first.js",
        "rxjs/operator/groupBy": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/groupBy.js",
        "rxjs/operator/ignoreElements": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/ignoreElements.js",
        "rxjs/operator/isEmpty": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/isEmpty.js",
        "rxjs/operator/last": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/last.js",
        "rxjs/operator/let": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/let.js",
        "rxjs/operator/map": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/map.js",
        "rxjs/operator/mapTo": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/mapTo.js",
        "rxjs/operator/materialize": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/materialize.js",
        "rxjs/operator/max": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/max.js",
        "rxjs/operator/merge": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/merge.js",
        "rxjs/operator/mergeAll": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/mergeAll.js",
        "rxjs/operator/mergeMap": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/mergeMap.js",
        "rxjs/operator/mergeMapTo": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/mergeMapTo.js",
        "rxjs/operator/mergeScan": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/mergeScan.js",
        "rxjs/operator/min": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/min.js",
        "rxjs/operator/multicast": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/multicast.js",
        "rxjs/operator/observeOn": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/observeOn.js",
        "rxjs/operator/onErrorResumeNext": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/onErrorResumeNext.js",
        "rxjs/operator/pairwise": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/pairwise.js",
        "rxjs/operator/partition": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/partition.js",
        "rxjs/operator/pluck": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/pluck.js",
        "rxjs/operator/publish": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/publish.js",
        "rxjs/operator/publishBehavior": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/publishBehavior.js",
        "rxjs/operator/publishLast": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/publishLast.js",
        "rxjs/operator/publishReplay": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/publishReplay.js",
        "rxjs/operator/race": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/race.js",
        "rxjs/operator/reduce": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/reduce.js",
        "rxjs/operator/repeat": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/repeat.js",
        "rxjs/operator/repeatWhen": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/repeatWhen.js",
        "rxjs/operator/retry": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/retry.js",
        "rxjs/operator/retryWhen": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/retryWhen.js",
        "rxjs/operator/sample": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/sample.js",
        "rxjs/operator/sampleTime": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/sampleTime.js",
        "rxjs/operator/scan": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/scan.js",
        "rxjs/operator/sequenceEqual": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/sequenceEqual.js",
        "rxjs/operator/share": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/share.js",
        "rxjs/operator/shareReplay": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/shareReplay.js",
        "rxjs/operator/single": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/single.js",
        "rxjs/operator/skip": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/skip.js",
        "rxjs/operator/skipLast": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/skipLast.js",
        "rxjs/operator/skipUntil": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/skipUntil.js",
        "rxjs/operator/skipWhile": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/skipWhile.js",
        "rxjs/operator/startWith": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/startWith.js",
        "rxjs/operator/subscribeOn": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/subscribeOn.js",
        "rxjs/operator/switch": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/switch.js",
        "rxjs/operator/switchMap": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/switchMap.js",
        "rxjs/operator/switchMapTo": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/switchMapTo.js",
        "rxjs/operator/take": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/take.js",
        "rxjs/operator/takeLast": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/takeLast.js",
        "rxjs/operator/takeUntil": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/takeUntil.js",
        "rxjs/operator/takeWhile": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/takeWhile.js",
        "rxjs/operator/throttle": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/throttle.js",
        "rxjs/operator/throttleTime": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/throttleTime.js",
        "rxjs/operator/timeInterval": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/timeInterval.js",
        "rxjs/operator/timeout": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/timeout.js",
        "rxjs/operator/timeoutWith": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/timeoutWith.js",
        "rxjs/operator/timestamp": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/timestamp.js",
        "rxjs/operator/toArray": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/toArray.js",
        "rxjs/operator/toPromise": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/toPromise.js",
        "rxjs/operator/window": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/window.js",
        "rxjs/operator/windowCount": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/windowCount.js",
        "rxjs/operator/windowTime": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/windowTime.js",
        "rxjs/operator/windowToggle": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/windowToggle.js",
        "rxjs/operator/windowWhen": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/windowWhen.js",
        "rxjs/operator/withLatestFrom": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/withLatestFrom.js",
        "rxjs/operator/zip": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/zip.js",
        "rxjs/operator/zipAll": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operator/zipAll.js",
        "rxjs/operators/audit": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/audit.js",
        "rxjs/operators/auditTime": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/auditTime.js",
        "rxjs/operators/buffer": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/buffer.js",
        "rxjs/operators/bufferCount": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/bufferCount.js",
        "rxjs/operators/bufferTime": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/bufferTime.js",
        "rxjs/operators/bufferToggle": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/bufferToggle.js",
        "rxjs/operators/bufferWhen": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/bufferWhen.js",
        "rxjs/operators/catchError": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/catchError.js",
        "rxjs/operators/combineAll": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/combineAll.js",
        "rxjs/operators/combineLatest": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/combineLatest.js",
        "rxjs/operators/concat": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/concat.js",
        "rxjs/operators/concatAll": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/concatAll.js",
        "rxjs/operators/concatMap": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/concatMap.js",
        "rxjs/operators/concatMapTo": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/concatMapTo.js",
        "rxjs/operators/count": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/count.js",
        "rxjs/operators/debounce": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/debounce.js",
        "rxjs/operators/debounceTime": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/debounceTime.js",
        "rxjs/operators/defaultIfEmpty": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/defaultIfEmpty.js",
        "rxjs/operators/delay": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/delay.js",
        "rxjs/operators/delayWhen": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/delayWhen.js",
        "rxjs/operators/dematerialize": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/dematerialize.js",
        "rxjs/operators/distinct": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/distinct.js",
        "rxjs/operators/distinctUntilChanged": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/distinctUntilChanged.js",
        "rxjs/operators/distinctUntilKeyChanged": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/distinctUntilKeyChanged.js",
        "rxjs/operators/elementAt": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/elementAt.js",
        "rxjs/operators/every": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/every.js",
        "rxjs/operators/exhaust": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/exhaust.js",
        "rxjs/operators/exhaustMap": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/exhaustMap.js",
        "rxjs/operators/expand": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/expand.js",
        "rxjs/operators/filter": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/filter.js",
        "rxjs/operators/finalize": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/finalize.js",
        "rxjs/operators/find": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/find.js",
        "rxjs/operators/findIndex": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/findIndex.js",
        "rxjs/operators/first": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/first.js",
        "rxjs/operators/groupBy": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/groupBy.js",
        "rxjs/operators/ignoreElements": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/ignoreElements.js",
        "rxjs/operators/index": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/index.js",
        "rxjs/operators/isEmpty": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/isEmpty.js",
        "rxjs/operators/last": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/last.js",
        "rxjs/operators/map": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/map.js",
        "rxjs/operators/mapTo": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/mapTo.js",
        "rxjs/operators/materialize": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/materialize.js",
        "rxjs/operators/max": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/max.js",
        "rxjs/operators/merge": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/merge.js",
        "rxjs/operators/mergeAll": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/mergeAll.js",
        "rxjs/operators/mergeMap": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/mergeMap.js",
        "rxjs/operators/mergeMapTo": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/mergeMapTo.js",
        "rxjs/operators/mergeScan": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/mergeScan.js",
        "rxjs/operators/min": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/min.js",
        "rxjs/operators/multicast": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/multicast.js",
        "rxjs/operators/observeOn": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/observeOn.js",
        "rxjs/operators/onErrorResumeNext": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/onErrorResumeNext.js",
        "rxjs/operators/pairwise": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/pairwise.js",
        "rxjs/operators/partition": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/partition.js",
        "rxjs/operators/pluck": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/pluck.js",
        "rxjs/operators/publish": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/publish.js",
        "rxjs/operators/publishBehavior": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/publishBehavior.js",
        "rxjs/operators/publishLast": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/publishLast.js",
        "rxjs/operators/publishReplay": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/publishReplay.js",
        "rxjs/operators/race": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/race.js",
        "rxjs/operators/reduce": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/reduce.js",
        "rxjs/operators/refCount": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/refCount.js",
        "rxjs/operators/repeat": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/repeat.js",
        "rxjs/operators/repeatWhen": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/repeatWhen.js",
        "rxjs/operators/retry": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/retry.js",
        "rxjs/operators/retryWhen": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/retryWhen.js",
        "rxjs/operators/sample": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/sample.js",
        "rxjs/operators/sampleTime": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/sampleTime.js",
        "rxjs/operators/scan": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/scan.js",
        "rxjs/operators/sequenceEqual": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/sequenceEqual.js",
        "rxjs/operators/share": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/share.js",
        "rxjs/operators/shareReplay": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/shareReplay.js",
        "rxjs/operators/single": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/single.js",
        "rxjs/operators/skip": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/skip.js",
        "rxjs/operators/skipLast": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/skipLast.js",
        "rxjs/operators/skipUntil": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/skipUntil.js",
        "rxjs/operators/skipWhile": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/skipWhile.js",
        "rxjs/operators/startWith": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/startWith.js",
        "rxjs/operators/subscribeOn": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/subscribeOn.js",
        "rxjs/operators/switchAll": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/switchAll.js",
        "rxjs/operators/switchMap": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/switchMap.js",
        "rxjs/operators/switchMapTo": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/switchMapTo.js",
        "rxjs/operators/take": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/take.js",
        "rxjs/operators/takeLast": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/takeLast.js",
        "rxjs/operators/takeUntil": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/takeUntil.js",
        "rxjs/operators/takeWhile": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/takeWhile.js",
        "rxjs/operators/tap": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/tap.js",
        "rxjs/operators/throttle": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/throttle.js",
        "rxjs/operators/throttleTime": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/throttleTime.js",
        "rxjs/operators/timeInterval": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/timeInterval.js",
        "rxjs/operators/timeout": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/timeout.js",
        "rxjs/operators/timeoutWith": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/timeoutWith.js",
        "rxjs/operators/timestamp": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/timestamp.js",
        "rxjs/operators/toArray": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/toArray.js",
        "rxjs/operators/window": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/window.js",
        "rxjs/operators/windowCount": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/windowCount.js",
        "rxjs/operators/windowTime": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/windowTime.js",
        "rxjs/operators/windowToggle": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/windowToggle.js",
        "rxjs/operators/windowWhen": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/windowWhen.js",
        "rxjs/operators/withLatestFrom": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/withLatestFrom.js",
        "rxjs/operators/zip": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/zip.js",
        "rxjs/operators/zipAll": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/zipAll.js",
        "rxjs/scheduler/Action": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/scheduler/Action.js",
        "rxjs/scheduler/AnimationFrameAction": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/scheduler/AnimationFrameAction.js",
        "rxjs/scheduler/AnimationFrameScheduler": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/scheduler/AnimationFrameScheduler.js",
        "rxjs/scheduler/AsapAction": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/scheduler/AsapAction.js",
        "rxjs/scheduler/AsapScheduler": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/scheduler/AsapScheduler.js",
        "rxjs/scheduler/AsyncAction": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/scheduler/AsyncAction.js",
        "rxjs/scheduler/AsyncScheduler": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/scheduler/AsyncScheduler.js",
        "rxjs/scheduler/QueueAction": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/scheduler/QueueAction.js",
        "rxjs/scheduler/QueueScheduler": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/scheduler/QueueScheduler.js",
        "rxjs/scheduler/VirtualTimeScheduler": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/scheduler/VirtualTimeScheduler.js",
        "rxjs/scheduler/animationFrame": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/scheduler/animationFrame.js",
        "rxjs/scheduler/asap": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/scheduler/asap.js",
        "rxjs/scheduler/async": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/scheduler/async.js",
        "rxjs/scheduler/queue": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/scheduler/queue.js",
        "rxjs/symbol/iterator": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/symbol/iterator.js",
        "rxjs/symbol/observable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/symbol/observable.js",
        "rxjs/symbol/rxSubscriber": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/symbol/rxSubscriber.js",
        "rxjs/testing/ColdObservable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/testing/ColdObservable.js",
        "rxjs/testing/HotObservable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/testing/HotObservable.js",
        "rxjs/testing/SubscriptionLog": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/testing/SubscriptionLog.js",
        "rxjs/testing/SubscriptionLoggable": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/testing/SubscriptionLoggable.js",
        "rxjs/testing/TestMessage": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/testing/TestMessage.js",
        "rxjs/testing/TestScheduler": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/testing/TestScheduler.js",
        "rxjs/util/AnimationFrame": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/AnimationFrame.js",
        "rxjs/util/ArgumentOutOfRangeError": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/ArgumentOutOfRangeError.js",
        "rxjs/util/EmptyError": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/EmptyError.js",
        "rxjs/util/FastMap": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/FastMap.js",
        "rxjs/util/Immediate": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/Immediate.js",
        "rxjs/util/Map": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/Map.js",
        "rxjs/util/MapPolyfill": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/MapPolyfill.js",
        "rxjs/util/ObjectUnsubscribedError": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/ObjectUnsubscribedError.js",
        "rxjs/util/Set": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/Set.js",
        "rxjs/util/TimeoutError": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/TimeoutError.js",
        "rxjs/util/UnsubscriptionError": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/UnsubscriptionError.js",
        "rxjs/util/applyMixins": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/applyMixins.js",
        "rxjs/util/assign": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/assign.js",
        "rxjs/util/errorObject": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/errorObject.js",
        "rxjs/util/identity": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/identity.js",
        "rxjs/util/isArray": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/isArray.js",
        "rxjs/util/isArrayLike": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/isArrayLike.js",
        "rxjs/util/isDate": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/isDate.js",
        "rxjs/util/isFunction": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/isFunction.js",
        "rxjs/util/isNumeric": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/isNumeric.js",
        "rxjs/util/isObject": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/isObject.js",
        "rxjs/util/isPromise": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/isPromise.js",
        "rxjs/util/isScheduler": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/isScheduler.js",
        "rxjs/util/noop": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/noop.js",
        "rxjs/util/not": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/not.js",
        "rxjs/util/pipe": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/pipe.js",
        "rxjs/util/root": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/root.js",
        "rxjs/util/subscribeToResult": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/subscribeToResult.js",
        "rxjs/util/toSubscriber": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/toSubscriber.js",
        "rxjs/util/tryCatch": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/util/tryCatch.js",
        "rxjs/operators": "/Users/yyosifov/dev/git/image-viewer/node_modules/rxjs/_esm5/operators/index.js"
      },
      "mainFields": [
        "browser",
        "module",
        "main"
      ]
    }
  }, commonConfig)
];

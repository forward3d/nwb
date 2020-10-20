"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = moduleBuild;

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var _crossSpawn = _interopRequireDefault(require("cross-spawn"));

var _ora = _interopRequireDefault(require("ora"));

var _runSeries = _interopRequireDefault(require("run-series"));

var _webpackMerge = _interopRequireDefault(require("webpack-merge"));

var _cleanModule = _interopRequireDefault(require("./commands/clean-module"));

var _config = require("./config");

var _createBabelConfig = _interopRequireDefault(require("./createBabelConfig"));

var _debug = _interopRequireDefault(require("./debug"));

var _utils = require("./utils");

var _webpackBuild = _interopRequireDefault(require("./webpackBuild"));

var _webpackUtils = require("./webpackUtils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// These match DEFAULT_TEST_DIRS and DEFAULT_TEST_FILES for co-located tests in
// ./createKarmaConfig.js
const DEFAULT_BABEL_IGNORE_CONFIG = ['**/*.spec.js', '**/*.test.js', '**/__tests__/'];
const DEFAULT_BABEL_CONFIG_FILE = '.babelrc';
/**
 * Run Babel with generated config written to a temporary .babelrc.
 */

function runBabel(name, {
  copyFiles,
  outDir,
  src,
  extensions,
  configFileName
}, buildBabelConfig, userConfig, cb) {
  let babelConfig = (0, _createBabelConfig.default)(buildBabelConfig, userConfig.babel, userConfig.path);
  babelConfig.ignore = DEFAULT_BABEL_IGNORE_CONFIG;
  (0, _debug.default)('babel config: %s', (0, _utils.deepToString)(babelConfig));
  let args = [src, '--out-dir', outDir, '--quiet'];

  if (copyFiles) {
    args.push('--copy-files', '--no-copy-ignored');
  }

  if (extensions) {
    args.push('--extensions', extensions);
  }

  if (configFileName !== DEFAULT_BABEL_CONFIG_FILE) {
    args.push('--config-file', _path.default.resolve(configFileName));
  }

  _fs.default.writeFile(configFileName, JSON.stringify(babelConfig, null, 2), err => {
    if (err) return cb(err);
    let spinner = (0, _ora.default)(`Creating ${name} build`).start();
    let babel = (0, _crossSpawn.default)(require.resolve('.bin/babel'), args, {
      stdio: 'inherit'
    });
    babel.on('exit', code => {
      let babelError;

      if (code !== 0) {
        spinner.fail();
        babelError = new Error('Babel transpilation failed');
      } else {
        spinner.succeed();
      }

      _fs.default.unlink(configFileName, unlinkError => {
        cb(babelError || unlinkError);
      });
    });
  });
}
/**
 * Create development and production UMD builds for <script> tag usage.
 */


function buildUMD(args, buildConfig, userConfig, cb) {
  let spinner = (0, _ora.default)('Creating UMD builds').start();

  let pkg = require(_path.default.resolve('package.json'));

  let entry = _path.default.resolve(args._[1] || 'src/index.js');

  let webpackBuildConfig = {
    babel: buildConfig.babel,
    entry: [userConfig.npm.umd.entry || entry],
    output: {
      filename: `${(0, _utils.formatPackageName)(pkg.name)}.js`,
      library: userConfig.npm.umd.global,
      libraryExport: 'default',
      libraryTarget: 'umd',
      path: _path.default.resolve('umd')
    },
    externals: (0, _webpackUtils.createExternals)(userConfig.npm.umd.externals),
    plugins: {
      banner: (0, _webpackUtils.createBanner)(pkg),
      terser: false
    }
  };
  process.env.NODE_ENV = 'production';
  (0, _webpackBuild.default)(null, args, webpackBuildConfig, (err, stats1) => {
    if (err) {
      spinner.fail();
      return cb(err);
    }

    if (userConfig.terser === false) {
      spinner.succeed();
      console.log();
      (0, _webpackUtils.logGzippedFileSizes)(stats1);
      return cb();
    }

    webpackBuildConfig.babel = (0, _webpackMerge.default)(buildConfig.babel, buildConfig.babelProd || {});
    webpackBuildConfig.devtool = 'source-map';
    webpackBuildConfig.output.filename = `${(0, _utils.formatPackageName)(pkg.name)}.min.js`;
    webpackBuildConfig.plugins.terser = true;
    (0, _webpackBuild.default)(null, args, webpackBuildConfig, (err, stats2) => {
      if (err) {
        spinner.fail();
        return cb(err);
      }

      spinner.succeed();
      console.log();
      (0, _webpackUtils.logGzippedFileSizes)(stats1, stats2);
      cb();
    });
  });
}

function moduleBuild(args, buildConfig = {}, cb) {
  let configFileName = DEFAULT_BABEL_CONFIG_FILE;

  if (_fs.default.existsSync(configFileName)) {
    console.info(`There is a ${configFileName} in your project ` + `nwb needs to write a temporary ${configFileName} to configure the build, ` + `will use ${configFileName}.build instead`);
    configFileName += '.build';
  }

  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
  }

  let pluginConfig = (0, _config.getPluginConfig)(args);
  let userConfig = (0, _config.getUserConfig)(args, {
    pluginConfig
  });
  let babelCliOptions = {
    copyFiles: !!args['copy-files'],
    src: _path.default.resolve('src'),
    extensions: args['extensions'] || args['x'],
    configFileName
  };
  let tasks = [cb => (0, _cleanModule.default)(args, cb)]; // The CommonJS build is enabled by default, and must be explicitly
  // disabled if you don't want it.

  if (userConfig.npm.cjs !== false) {
    tasks.push(cb => runBabel('ES5', { ...babelCliOptions,
      outDir: _path.default.resolve('lib')
    }, (0, _webpackMerge.default)(buildConfig.babel, buildConfig.babelDev || {}, {
      // Don't set the path to nwb's @babel/runtime, as it will need to be a
      // dependency or peerDependency of your module if you enable
      // transform-runtime's 'helpers' option.
      absoluteRuntime: false,
      // Transpile modules to CommonJS
      modules: 'commonjs',
      // Don't force CommonJS users of the CommonJS build to eat a .default
      commonJSInterop: true,
      // Don't enable webpack-specific plugins
      webpack: false
    }), userConfig, cb));
  } // The ES modules build is enabled by default, and must be explicitly
  // disabled if you don't want it.


  if (userConfig.npm.esModules !== false) {
    tasks.push(cb => runBabel('ES modules', { ...babelCliOptions,
      outDir: _path.default.resolve('es')
    }, (0, _webpackMerge.default)(buildConfig.babel, buildConfig.babelDev || {}, {
      // Don't set the path to nwb's @babel/runtime, as it will need to be a
      // dependency or peerDependency of your module if you enable
      // transform-runtime's 'helpers' option.
      absoluteRuntime: false,
      // Don't enable webpack-specific plugins
      webpack: false
    }), userConfig, cb));
  } // The UMD build must be explicitly enabled


  if (userConfig.npm.umd) {
    tasks.push(cb => buildUMD(args, buildConfig, userConfig, cb));
  }

  (0, _runSeries.default)(tasks, cb);
}

module.exports = exports.default;
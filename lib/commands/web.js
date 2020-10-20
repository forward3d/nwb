"use strict";

var _chalk = require("chalk");

var _minimist = _interopRequireDefault(require("minimist"));

var _constants = require("../constants");

var _errors = require("../errors");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const COMMAND_MODULES = {
  build: 'build-web',
  run: 'serve-web'
};

function handleError(error) {
  if (error instanceof _errors.UserError) {
    console.error((0, _chalk.red)(error.message));
  } else if (error instanceof _errors.ConfigValidationError) {
    error.report.log();
  } else {
    console.error((0, _chalk.red)(`Error running command: ${error.message}`));

    if (error.stack) {
      console.error(error.stack);
    }
  }

  process.exit(1);
}

let args = (0, _minimist.default)(process.argv.slice(3), {
  alias: {
    c: 'config',
    p: 'plugins'
  }
});
let command = args._[0];

if (!command || /^h(elp)?$/.test(command)) {
  console.log(`Usage: ${(0, _chalk.green)('nwb web')} ${(0, _chalk.yellow)('(run|build)')} ${(0, _chalk.cyan)('[options]')}

Options:
  ${(0, _chalk.cyan)('-c, --config')}       config file to use ${(0, _chalk.cyan)(`[default: ${_constants.CONFIG_FILE_NAME}]`)}
  ${(0, _chalk.cyan)('-p, --plugins')}      a comma-separated list of nwb plugins to use

Commands:
  ${(0, _chalk.green)('nwb web run')} ${(0, _chalk.yellow)('<entry>')} ${(0, _chalk.cyan)('[options]')}
    Serve a vanilla JavaScript app.

    Arguments:
      ${(0, _chalk.yellow)('entry')}          entry point for the app

    Options:
      ${(0, _chalk.cyan)('--install')}      automatically install missing npm dependencies
      ${(0, _chalk.cyan)('--host')}         hostname to bind the dev server to
      ${(0, _chalk.cyan)('--mount-id')}     id for the <div> in the default HTML ${(0, _chalk.cyan)('[default: app]')}
      ${(0, _chalk.cyan)('--no-fallback')}  disable serving of the index page from any path
      ${(0, _chalk.cyan)('--no-reload')}    disable auto reloading on changes
      ${(0, _chalk.cyan)('--port')}         port to run the dev server on ${(0, _chalk.cyan)('[default: 3000]')}
      ${(0, _chalk.cyan)('--title')}        contents for <title> ${(0, _chalk.cyan)('[default: Web App]')}

  ${(0, _chalk.green)('nwb preact build')} ${(0, _chalk.yellow)('<entry>')} ${(0, _chalk.cyan)('[dist_dir] [options]')}
    Create a static build for a vanilla JavaScript app.

    Arguments:
      ${(0, _chalk.yellow)('entry')}          entry point for the app
      ${(0, _chalk.cyan)('dist_dir')}       build output directory ${(0, _chalk.cyan)('[default: dist/]')}

    Options:
      ${(0, _chalk.cyan)('--mount-id')}     id for the <div> in the default HTML ${(0, _chalk.cyan)('[default: app]')}
      ${(0, _chalk.cyan)('--title')}        contents for <title> ${(0, _chalk.cyan)('[default: Web App]')}
      ${(0, _chalk.cyan)('--vendor')}       create a 'vendor' bundle for node_modules/ modules
`);
  process.exit(command ? 0 : 1);
}

if (!COMMAND_MODULES.hasOwnProperty(command)) {
  console.error(`${(0, _chalk.red)('Unknown web command:')} ${(0, _chalk.yellow)(command)}`);
  process.exit(1);
}

let commandModule = require(`./${COMMAND_MODULES[command]}`);

try {
  commandModule(args, err => {
    if (err) handleError(err);
  });
} catch (e) {
  handleError(e);
}
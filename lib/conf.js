'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _rc = require('rc');

var _rc2 = _interopRequireDefault(_rc);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _process$env = process.env;
const PORT = _process$env.PORT;
const SLACK_TOKEN = _process$env.SLACK_TOKEN;
const GITHUB_TOKEN = _process$env.GITHUB_TOKEN;
const LOG_PATH = _process$env.LOG_PATH;
const LOG_LEVEL = _process$env.LOG_LEVEL;
exports.default = (0, _rc2.default)('mozu-validator-bot', {
  port: PORT || 8009,
  hookPath: '/github-hook',
  slackToken: SLACK_TOKEN,
  logPath: LOG_PATH || _path2.default.join(process.cwd(), 'mozu-validator-bot.log'),
  logLevel: LOG_LEVEL || 5,
  botIcon: 'http://i.imgur.com/QFFAmYT.png',
  successIcon: 'http://i.imgur.com/9yzNfsl.png',
  errorIcon: 'http://i.imgur.com/xLUWhF6.png',
  botName: 'J.R. "Bob" Dobbs',
  // Likely as not, you'll want to create a "Personal Access Token" here.
  // This isn't a web application, so users will not be authing and
  // deauthing it. And it shouldn't be logged in as a specific user; but
  // unfortunately GitHub can only grant access tokens for users, rather
  // than organizations. So this token must belong to someone who belongs
  // to the organization. Obviously a blank token won't work; put a user
  // token in `.mozu-validator-botrc`.
  githubToken: GITHUB_TOKEN,
  githubOrg: 'mozu'
});
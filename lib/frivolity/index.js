'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = frivolity;

var _subgeniusQuotes = require('./subgenius-quotes');

var _subgeniusQuotes2 = _interopRequireDefault(_subgeniusQuotes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function frivolity(conf, bot) {
  bot.hears(['^hi\\b', '^hello\\b'], ['mention', 'direct_mention'], (bot, msg) => bot.reply(msg, {
    icon_url: conf.botIcon,
    text: _subgeniusQuotes2.default[Math.floor(Math.random() * _subgeniusQuotes2.default.length)],
    username: conf.botName
  }));
  return bot;
}
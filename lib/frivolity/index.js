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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9mcml2b2xpdHkvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7a0JBQ3dCLFNBQVM7Ozs7Ozs7O0FBQWxCLFNBQVMsU0FBUyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUU7QUFDM0MsS0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsRUFBQyxXQUFXLENBQUMsRUFBQyxDQUFDLFNBQVMsRUFBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsS0FDdEUsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUU7QUFDYixZQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU87QUFDdEIsUUFBSSxFQUFFLDBCQUFnQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBQywwQkFBZ0IsTUFBTSxDQUFDLENBQUM7QUFDdkUsWUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPO0dBQ3ZCLENBQUMsQ0FDSCxDQUFDO0FBQ0YsU0FBTyxHQUFHLENBQUM7Q0FDWiIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBzdWJnZW5pdXNRdW90ZXMgZnJvbSAnLi9zdWJnZW5pdXMtcXVvdGVzJztcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGZyaXZvbGl0eShjb25mLCBib3QpIHtcbiAgYm90LmhlYXJzKFsnXmhpXFxcXGInLCdeaGVsbG9cXFxcYiddLFsnbWVudGlvbicsJ2RpcmVjdF9tZW50aW9uJ10sIChib3QsIG1zZykgPT5cbiAgICBib3QucmVwbHkobXNnLCB7XG4gICAgICBpY29uX3VybDogY29uZi5ib3RJY29uLFxuICAgICAgdGV4dDogc3ViZ2VuaXVzUXVvdGVzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSpzdWJnZW5pdXNRdW90ZXMubGVuZ3RoKV0sXG4gICAgICB1c2VybmFtZTogY29uZi5ib3ROYW1lXG4gICAgfSlcbiAgKTtcbiAgcmV0dXJuIGJvdDtcbn1cbiJdfQ==
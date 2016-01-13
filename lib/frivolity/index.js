'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = frivolity;

var _subgeniusQuotes = require('./subgenius-quotes');

var _subgeniusQuotes2 = _interopRequireDefault(_subgeniusQuotes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function frivolity(conf, bot) {
  let triggers = ['hi', 'hello', 'say something', 'sup', 'wie gehts', 'bonjour', 'salut', 'hey', 'how\'s it going'].map(x => `^${ x }\\b`);
  bot.hears(triggers, ['mention', 'direct_mention'], (bot, msg) => bot.reply(msg, {
    icon_url: conf.botIcon,
    text: _subgeniusQuotes2.default[Math.floor(Math.random() * _subgeniusQuotes2.default.length)],
    username: conf.botName
  }));
  return bot;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9mcml2b2xpdHkvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7a0JBQ3dCLFNBQVM7Ozs7Ozs7O0FBQWxCLFNBQVMsU0FBUyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUU7QUFDM0MsTUFBSSxRQUFRLEdBQUcsQ0FDYixJQUFJLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFDN0QsT0FBTyxFQUFFLEtBQUssRUFBRSxpQkFBaUIsQ0FDbEMsQ0FBQyxHQUFHLENBQUMsQUFBQyxDQUFDLElBQUssQ0FBQyxDQUFDLEdBQUUsQ0FBQyxFQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDekIsS0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUMsQ0FBQyxTQUFTLEVBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEtBQ3hELEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFO0FBQ2IsWUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPO0FBQ3RCLFFBQUksRUFBRSwwQkFBZ0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUMsMEJBQWdCLE1BQU0sQ0FBQyxDQUFDO0FBQ3ZFLFlBQVEsRUFBRSxJQUFJLENBQUMsT0FBTztHQUN2QixDQUFDLENBQ0gsQ0FBQztBQUNGLFNBQU8sR0FBRyxDQUFDO0NBQ1oiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgc3ViZ2VuaXVzUXVvdGVzIGZyb20gJy4vc3ViZ2VuaXVzLXF1b3Rlcyc7XG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBmcml2b2xpdHkoY29uZiwgYm90KSB7XG4gIGxldCB0cmlnZ2VycyA9IFtcbiAgICAnaGknLCAnaGVsbG8nLCAnc2F5IHNvbWV0aGluZycsICdzdXAnLCAnd2llIGdlaHRzJywgJ2JvbmpvdXInLFxuICAgICdzYWx1dCcsICdoZXknLCAnaG93XFwncyBpdCBnb2luZydcbiAgXS5tYXAoKHgpID0+IGBeJHt4fVxcXFxiYCk7XG4gIGJvdC5oZWFycyh0cmlnZ2VycyxbJ21lbnRpb24nLCdkaXJlY3RfbWVudGlvbiddLCAoYm90LCBtc2cpID0+XG4gICAgYm90LnJlcGx5KG1zZywge1xuICAgICAgaWNvbl91cmw6IGNvbmYuYm90SWNvbixcbiAgICAgIHRleHQ6IHN1Ymdlbml1c1F1b3Rlc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqc3ViZ2VuaXVzUXVvdGVzLmxlbmd0aCldLFxuICAgICAgdXNlcm5hbWU6IGNvbmYuYm90TmFtZVxuICAgIH0pXG4gICk7XG4gIHJldHVybiBib3Q7XG59XG4iXX0=
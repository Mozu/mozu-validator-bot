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
  bot.hears(triggers, ['mention', 'direct_mention'], (bot, msg) => (0, _subgeniusQuotes2.default)().then(subgeniusQuotes => bot.reply(msg, {
    icon_url: conf.botIcon,
    text: subgeniusQuotes[Math.floor(Math.random() * subgeniusQuotes.length)],
    username: conf.botName
  })));
  return bot;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9mcml2b2xpdHkvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7a0JBQ3dCLFNBQVM7Ozs7Ozs7O0FBQWxCLFNBQVMsU0FBUyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUU7QUFDM0MsTUFBSSxRQUFRLEdBQUcsQ0FDYixJQUFJLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFDN0QsT0FBTyxFQUFFLEtBQUssRUFBRSxpQkFBaUIsQ0FDbEMsQ0FBQyxHQUFHLENBQUMsQUFBQyxDQUFDLElBQUssQ0FBQyxDQUFDLEdBQUUsQ0FBQyxFQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDekIsS0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUMsQ0FBQyxTQUFTLEVBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEtBQ3hELGdDQUFvQixDQUFDLElBQUksQ0FBQyxBQUFDLGVBQWUsSUFBSyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRTtBQUM1RCxZQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU87QUFDdEIsUUFBSSxFQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDdkUsWUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPO0dBQ3ZCLENBQUMsQ0FBQyxDQUNKLENBQUM7QUFDRixTQUFPLEdBQUcsQ0FBQztDQUNaIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGdldFN1Ymdlbml1c1F1b3RlcyBmcm9tICcuL3N1Ymdlbml1cy1xdW90ZXMnO1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZnJpdm9saXR5KGNvbmYsIGJvdCkge1xuICBsZXQgdHJpZ2dlcnMgPSBbXG4gICAgJ2hpJywgJ2hlbGxvJywgJ3NheSBzb21ldGhpbmcnLCAnc3VwJywgJ3dpZSBnZWh0cycsICdib25qb3VyJyxcbiAgICAnc2FsdXQnLCAnaGV5JywgJ2hvd1xcJ3MgaXQgZ29pbmcnXG4gIF0ubWFwKCh4KSA9PiBgXiR7eH1cXFxcYmApO1xuICBib3QuaGVhcnModHJpZ2dlcnMsWydtZW50aW9uJywnZGlyZWN0X21lbnRpb24nXSwgKGJvdCwgbXNnKSA9PlxuICAgIGdldFN1Ymdlbml1c1F1b3RlcygpLnRoZW4oKHN1Ymdlbml1c1F1b3RlcykgPT4gYm90LnJlcGx5KG1zZywge1xuICAgICAgaWNvbl91cmw6IGNvbmYuYm90SWNvbixcbiAgICAgIHRleHQ6IHN1Ymdlbml1c1F1b3Rlc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqc3ViZ2VuaXVzUXVvdGVzLmxlbmd0aCldLFxuICAgICAgdXNlcm5hbWU6IGNvbmYuYm90TmFtZVxuICAgIH0pKVxuICApO1xuICByZXR1cm4gYm90O1xufVxuIl19
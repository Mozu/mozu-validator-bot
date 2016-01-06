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
  githubOrg: 'mozu',
  // Each CI provider in this list will make the bot check, for each repo,
  // whether it has a file in its root that matches the `configFile` name for
  // the provider. If the repo has such a file, then for every "success" event
  // for that repo, the bot will check all recent GitHub statuses for success
  // messages whose `context` property matches the `statusContext` for the
  // provider.
  // The effect of this is that if a repo has a `.travis.yml` at root, then
  // the bot won't validate the new version until it sees a "success" status
  // whose `context` value is "continuous-integration/travis-ci/push". Thus,
  // the bot always waits for all configured providers to succeed.
  ciProviders: [{
    name: 'Appveyor',
    configFile: 'appveyor.yml',
    statusContext: 'continuous-integration/appveyor/branch'
  }, {
    name: 'Travis',
    configFile: '.travis.yml',
    statusContext: 'continuous-integration/travis-ci/push'
  }]
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jb25mLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7Ozs7Ozs7Ozs7Ozs7OzttQkFHb0QsT0FBTyxDQUFDLEdBQUc7TUFBcEUsSUFBSSxnQkFBSixJQUFJO01BQUUsV0FBVyxnQkFBWCxXQUFXO01BQUUsWUFBWSxnQkFBWixZQUFZO01BQUUsUUFBUSxnQkFBUixRQUFRO01BQUUsU0FBUyxnQkFBVCxTQUFTO2tCQUM3QyxrQkFBRyxvQkFBb0IsRUFBRTtBQUN0QyxNQUFJLEVBQUUsSUFBSSxJQUFJLElBQUk7QUFDbEIsVUFBUSxFQUFFLGNBQWM7QUFDeEIsWUFBVSxFQUFFLFdBQVc7QUFDdkIsU0FBTyxFQUFFLFFBQVEsSUFBSSxlQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsd0JBQXdCLENBQUM7QUFDdkUsVUFBUSxFQUFFLFNBQVMsSUFBSSxDQUFDO0FBQ3hCLFNBQU8sRUFBRSxnQ0FBZ0M7QUFDekMsYUFBVyxFQUFFLGdDQUFnQztBQUM3QyxXQUFTLEVBQUUsZ0NBQWdDO0FBQzNDLFNBQU8sRUFBRSxrQkFBa0I7Ozs7Ozs7O0FBUTNCLGFBQVcsRUFBRSxZQUFZO0FBQ3pCLFdBQVMsRUFBRSxNQUFNOzs7Ozs7Ozs7OztBQVdqQixhQUFXLEVBQUUsQ0FDWDtBQUNFLFFBQUksRUFBRSxVQUFVO0FBQ2hCLGNBQVUsRUFBRSxjQUFjO0FBQzFCLGlCQUFhLEVBQUUsd0NBQXdDO0dBQ3hELEVBQ0Q7QUFDRSxRQUFJLEVBQUUsUUFBUTtBQUNkLGNBQVUsRUFBRSxhQUFhO0FBQ3pCLGlCQUFhLEVBQUUsdUNBQXVDO0dBQ3ZELENBQ0Y7Q0FDRixDQUFDIiwiZmlsZSI6ImNvbmYuanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5pbXBvcnQgcmMgZnJvbSAncmMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5jb25zdCB7IFBPUlQsIFNMQUNLX1RPS0VOLCBHSVRIVUJfVE9LRU4sIExPR19QQVRILCBMT0dfTEVWRUwgfSA9IHByb2Nlc3MuZW52O1xuZXhwb3J0IGRlZmF1bHQgcmMoJ21venUtdmFsaWRhdG9yLWJvdCcsIHtcbiAgcG9ydDogUE9SVCB8fCA4MDA5LFxuICBob29rUGF0aDogJy9naXRodWItaG9vaycsXG4gIHNsYWNrVG9rZW46IFNMQUNLX1RPS0VOLFxuICBsb2dQYXRoOiBMT0dfUEFUSCB8fCBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgJ21venUtdmFsaWRhdG9yLWJvdC5sb2cnKSxcbiAgbG9nTGV2ZWw6IExPR19MRVZFTCB8fCA1LFxuICBib3RJY29uOiAnaHR0cDovL2kuaW1ndXIuY29tL1FGRkFtWVQucG5nJyxcbiAgc3VjY2Vzc0ljb246ICdodHRwOi8vaS5pbWd1ci5jb20vOXl6TmZzbC5wbmcnLFxuICBlcnJvckljb246ICdodHRwOi8vaS5pbWd1ci5jb20veExVV2hGNi5wbmcnLFxuICBib3ROYW1lOiAnSi5SLiBcIkJvYlwiIERvYmJzJyxcbiAgLy8gTGlrZWx5IGFzIG5vdCwgeW91J2xsIHdhbnQgdG8gY3JlYXRlIGEgXCJQZXJzb25hbCBBY2Nlc3MgVG9rZW5cIiBoZXJlLlxuICAvLyBUaGlzIGlzbid0IGEgd2ViIGFwcGxpY2F0aW9uLCBzbyB1c2VycyB3aWxsIG5vdCBiZSBhdXRoaW5nIGFuZFxuICAvLyBkZWF1dGhpbmcgaXQuIEFuZCBpdCBzaG91bGRuJ3QgYmUgbG9nZ2VkIGluIGFzIGEgc3BlY2lmaWMgdXNlcjsgYnV0XG4gIC8vIHVuZm9ydHVuYXRlbHkgR2l0SHViIGNhbiBvbmx5IGdyYW50IGFjY2VzcyB0b2tlbnMgZm9yIHVzZXJzLCByYXRoZXJcbiAgLy8gdGhhbiBvcmdhbml6YXRpb25zLiBTbyB0aGlzIHRva2VuIG11c3QgYmVsb25nIHRvIHNvbWVvbmUgd2hvIGJlbG9uZ3NcbiAgLy8gdG8gdGhlIG9yZ2FuaXphdGlvbi4gT2J2aW91c2x5IGEgYmxhbmsgdG9rZW4gd29uJ3Qgd29yazsgcHV0IGEgdXNlclxuICAvLyB0b2tlbiBpbiBgLm1venUtdmFsaWRhdG9yLWJvdHJjYC5cbiAgZ2l0aHViVG9rZW46IEdJVEhVQl9UT0tFTixcbiAgZ2l0aHViT3JnOiAnbW96dScsXG4gIC8vIEVhY2ggQ0kgcHJvdmlkZXIgaW4gdGhpcyBsaXN0IHdpbGwgbWFrZSB0aGUgYm90IGNoZWNrLCBmb3IgZWFjaCByZXBvLFxuICAvLyB3aGV0aGVyIGl0IGhhcyBhIGZpbGUgaW4gaXRzIHJvb3QgdGhhdCBtYXRjaGVzIHRoZSBgY29uZmlnRmlsZWAgbmFtZSBmb3JcbiAgLy8gdGhlIHByb3ZpZGVyLiBJZiB0aGUgcmVwbyBoYXMgc3VjaCBhIGZpbGUsIHRoZW4gZm9yIGV2ZXJ5IFwic3VjY2Vzc1wiIGV2ZW50XG4gIC8vIGZvciB0aGF0IHJlcG8sIHRoZSBib3Qgd2lsbCBjaGVjayBhbGwgcmVjZW50IEdpdEh1YiBzdGF0dXNlcyBmb3Igc3VjY2Vzc1xuICAvLyBtZXNzYWdlcyB3aG9zZSBgY29udGV4dGAgcHJvcGVydHkgbWF0Y2hlcyB0aGUgYHN0YXR1c0NvbnRleHRgIGZvciB0aGVcbiAgLy8gcHJvdmlkZXIuXG4gIC8vIFRoZSBlZmZlY3Qgb2YgdGhpcyBpcyB0aGF0IGlmIGEgcmVwbyBoYXMgYSBgLnRyYXZpcy55bWxgIGF0IHJvb3QsIHRoZW5cbiAgLy8gdGhlIGJvdCB3b24ndCB2YWxpZGF0ZSB0aGUgbmV3IHZlcnNpb24gdW50aWwgaXQgc2VlcyBhIFwic3VjY2Vzc1wiIHN0YXR1c1xuICAvLyB3aG9zZSBgY29udGV4dGAgdmFsdWUgaXMgXCJjb250aW51b3VzLWludGVncmF0aW9uL3RyYXZpcy1jaS9wdXNoXCIuIFRodXMsXG4gIC8vIHRoZSBib3QgYWx3YXlzIHdhaXRzIGZvciBhbGwgY29uZmlndXJlZCBwcm92aWRlcnMgdG8gc3VjY2VlZC5cbiAgY2lQcm92aWRlcnM6IFtcbiAgICB7XG4gICAgICBuYW1lOiAnQXBwdmV5b3InLFxuICAgICAgY29uZmlnRmlsZTogJ2FwcHZleW9yLnltbCcsXG4gICAgICBzdGF0dXNDb250ZXh0OiAnY29udGludW91cy1pbnRlZ3JhdGlvbi9hcHB2ZXlvci9icmFuY2gnXG4gICAgfSxcbiAgICB7XG4gICAgICBuYW1lOiAnVHJhdmlzJyxcbiAgICAgIGNvbmZpZ0ZpbGU6ICcudHJhdmlzLnltbCcsXG4gICAgICBzdGF0dXNDb250ZXh0OiAnY29udGludW91cy1pbnRlZ3JhdGlvbi90cmF2aXMtY2kvcHVzaCdcbiAgICB9XG4gIF1cbn0pO1xuIl19
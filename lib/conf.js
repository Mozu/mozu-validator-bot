'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _rc = require('rc');

var _rc2 = _interopRequireDefault(_rc);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _process$env = process.env;
const PORT = _process$env.PORT;
const SLACK_TOKEN = _process$env.SLACK_TOKEN;
const SLACK_WEBHOOK_URL = _process$env.SLACK_WEBHOOK_URL;
const GITHUB_TOKEN = _process$env.GITHUB_TOKEN;
const LOG_LEVEL = _process$env.LOG_LEVEL;
exports.default = (0, _rc2.default)('mozu-validator-bot', {
  web: {
    port: PORT || 8009,
    protocol: 'http:',
    hookPath: '/github-hook',
    checkPath: '/check-package'
  },
  slack: {
    token: SLACK_TOKEN,
    incoming_webhook: {
      url: SLACK_WEBHOOK_URL
    }
  },
  npm: {
    registry: 'https://registry.npmjs.org/'
  },
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
  github: {
    token: GITHUB_TOKEN,
    org: 'mozu'
  },
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jb25mLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7Ozs7Ozs7Ozs7O21CQVFULE9BQU8sQ0FBQyxHQUFHO01BTGIsSUFBSSxnQkFBSixJQUFJO01BQ0osV0FBVyxnQkFBWCxXQUFXO01BQ1gsaUJBQWlCLGdCQUFqQixpQkFBaUI7TUFDakIsWUFBWSxnQkFBWixZQUFZO01BQ1osU0FBUyxnQkFBVCxTQUFTO2tCQUVJLGtCQUFHLG9CQUFvQixFQUFFO0FBQ3RDLEtBQUcsRUFBRTtBQUNILFFBQUksRUFBRSxJQUFJLElBQUksSUFBSTtBQUNsQixZQUFRLEVBQUUsT0FBTztBQUNqQixZQUFRLEVBQUUsY0FBYztBQUN4QixhQUFTLEVBQUUsZ0JBQWdCO0dBQzVCO0FBQ0QsT0FBSyxFQUFFO0FBQ0wsU0FBSyxFQUFFLFdBQVc7QUFDbEIsb0JBQWdCLEVBQUU7QUFDaEIsU0FBRyxFQUFFLGlCQUFpQjtLQUN2QjtHQUNGO0FBQ0QsS0FBRyxFQUFFO0FBQ0gsWUFBUSxFQUFFLDZCQUE2QjtHQUN4QztBQUNELFVBQVEsRUFBRSxTQUFTLElBQUksQ0FBQztBQUN4QixTQUFPLEVBQUUsZ0NBQWdDO0FBQ3pDLGFBQVcsRUFBRSxnQ0FBZ0M7QUFDN0MsV0FBUyxFQUFFLGdDQUFnQztBQUMzQyxTQUFPLEVBQUUsa0JBQWtCOzs7Ozs7OztBQVEzQixRQUFNLEVBQUU7QUFDTixTQUFLLEVBQUUsWUFBWTtBQUNuQixPQUFHLEVBQUUsTUFBTTtHQUNaOzs7Ozs7Ozs7OztBQVdELGFBQVcsRUFBRSxDQUNYO0FBQ0UsUUFBSSxFQUFFLFVBQVU7QUFDaEIsY0FBVSxFQUFFLGNBQWM7QUFDMUIsaUJBQWEsRUFBRSx3Q0FBd0M7R0FDeEQsRUFDRDtBQUNFLFFBQUksRUFBRSxRQUFRO0FBQ2QsY0FBVSxFQUFFLGFBQWE7QUFDekIsaUJBQWEsRUFBRSx1Q0FBdUM7R0FDdkQsQ0FDRjtDQUNGLENBQUMiLCJmaWxlIjoiY29uZi5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcbmltcG9ydCByYyBmcm9tICdyYyc7XG5jb25zdCB7XG4gIFBPUlQsXG4gIFNMQUNLX1RPS0VOLFxuICBTTEFDS19XRUJIT09LX1VSTCxcbiAgR0lUSFVCX1RPS0VOLFxuICBMT0dfTEVWRUxcbn0gPSBwcm9jZXNzLmVudjtcbmV4cG9ydCBkZWZhdWx0IHJjKCdtb3p1LXZhbGlkYXRvci1ib3QnLCB7XG4gIHdlYjoge1xuICAgIHBvcnQ6IFBPUlQgfHwgODAwOSxcbiAgICBwcm90b2NvbDogJ2h0dHA6JyxcbiAgICBob29rUGF0aDogJy9naXRodWItaG9vaycsXG4gICAgY2hlY2tQYXRoOiAnL2NoZWNrLXBhY2thZ2UnXG4gIH0sXG4gIHNsYWNrOiB7XG4gICAgdG9rZW46IFNMQUNLX1RPS0VOLFxuICAgIGluY29taW5nX3dlYmhvb2s6IHtcbiAgICAgIHVybDogU0xBQ0tfV0VCSE9PS19VUkwsXG4gICAgfVxuICB9LFxuICBucG06IHtcbiAgICByZWdpc3RyeTogJ2h0dHBzOi8vcmVnaXN0cnkubnBtanMub3JnLydcbiAgfSxcbiAgbG9nTGV2ZWw6IExPR19MRVZFTCB8fCA1LFxuICBib3RJY29uOiAnaHR0cDovL2kuaW1ndXIuY29tL1FGRkFtWVQucG5nJyxcbiAgc3VjY2Vzc0ljb246ICdodHRwOi8vaS5pbWd1ci5jb20vOXl6TmZzbC5wbmcnLFxuICBlcnJvckljb246ICdodHRwOi8vaS5pbWd1ci5jb20veExVV2hGNi5wbmcnLFxuICBib3ROYW1lOiAnSi5SLiBcIkJvYlwiIERvYmJzJyxcbiAgLy8gTGlrZWx5IGFzIG5vdCwgeW91J2xsIHdhbnQgdG8gY3JlYXRlIGEgXCJQZXJzb25hbCBBY2Nlc3MgVG9rZW5cIiBoZXJlLlxuICAvLyBUaGlzIGlzbid0IGEgd2ViIGFwcGxpY2F0aW9uLCBzbyB1c2VycyB3aWxsIG5vdCBiZSBhdXRoaW5nIGFuZFxuICAvLyBkZWF1dGhpbmcgaXQuIEFuZCBpdCBzaG91bGRuJ3QgYmUgbG9nZ2VkIGluIGFzIGEgc3BlY2lmaWMgdXNlcjsgYnV0XG4gIC8vIHVuZm9ydHVuYXRlbHkgR2l0SHViIGNhbiBvbmx5IGdyYW50IGFjY2VzcyB0b2tlbnMgZm9yIHVzZXJzLCByYXRoZXJcbiAgLy8gdGhhbiBvcmdhbml6YXRpb25zLiBTbyB0aGlzIHRva2VuIG11c3QgYmVsb25nIHRvIHNvbWVvbmUgd2hvIGJlbG9uZ3NcbiAgLy8gdG8gdGhlIG9yZ2FuaXphdGlvbi4gT2J2aW91c2x5IGEgYmxhbmsgdG9rZW4gd29uJ3Qgd29yazsgcHV0IGEgdXNlclxuICAvLyB0b2tlbiBpbiBgLm1venUtdmFsaWRhdG9yLWJvdHJjYC5cbiAgZ2l0aHViOiB7XG4gICAgdG9rZW46IEdJVEhVQl9UT0tFTixcbiAgICBvcmc6ICdtb3p1J1xuICB9LFxuICAvLyBFYWNoIENJIHByb3ZpZGVyIGluIHRoaXMgbGlzdCB3aWxsIG1ha2UgdGhlIGJvdCBjaGVjaywgZm9yIGVhY2ggcmVwbyxcbiAgLy8gd2hldGhlciBpdCBoYXMgYSBmaWxlIGluIGl0cyByb290IHRoYXQgbWF0Y2hlcyB0aGUgYGNvbmZpZ0ZpbGVgIG5hbWUgZm9yXG4gIC8vIHRoZSBwcm92aWRlci4gSWYgdGhlIHJlcG8gaGFzIHN1Y2ggYSBmaWxlLCB0aGVuIGZvciBldmVyeSBcInN1Y2Nlc3NcIiBldmVudFxuICAvLyBmb3IgdGhhdCByZXBvLCB0aGUgYm90IHdpbGwgY2hlY2sgYWxsIHJlY2VudCBHaXRIdWIgc3RhdHVzZXMgZm9yIHN1Y2Nlc3NcbiAgLy8gbWVzc2FnZXMgd2hvc2UgYGNvbnRleHRgIHByb3BlcnR5IG1hdGNoZXMgdGhlIGBzdGF0dXNDb250ZXh0YCBmb3IgdGhlXG4gIC8vIHByb3ZpZGVyLlxuICAvLyBUaGUgZWZmZWN0IG9mIHRoaXMgaXMgdGhhdCBpZiBhIHJlcG8gaGFzIGEgYC50cmF2aXMueW1sYCBhdCByb290LCB0aGVuXG4gIC8vIHRoZSBib3Qgd29uJ3QgdmFsaWRhdGUgdGhlIG5ldyB2ZXJzaW9uIHVudGlsIGl0IHNlZXMgYSBcInN1Y2Nlc3NcIiBzdGF0dXNcbiAgLy8gd2hvc2UgYGNvbnRleHRgIHZhbHVlIGlzIFwiY29udGludW91cy1pbnRlZ3JhdGlvbi90cmF2aXMtY2kvcHVzaFwiLiBUaHVzLFxuICAvLyB0aGUgYm90IGFsd2F5cyB3YWl0cyBmb3IgYWxsIGNvbmZpZ3VyZWQgcHJvdmlkZXJzIHRvIHN1Y2NlZWQuXG4gIGNpUHJvdmlkZXJzOiBbXG4gICAge1xuICAgICAgbmFtZTogJ0FwcHZleW9yJyxcbiAgICAgIGNvbmZpZ0ZpbGU6ICdhcHB2ZXlvci55bWwnLFxuICAgICAgc3RhdHVzQ29udGV4dDogJ2NvbnRpbnVvdXMtaW50ZWdyYXRpb24vYXBwdmV5b3IvYnJhbmNoJ1xuICAgIH0sXG4gICAge1xuICAgICAgbmFtZTogJ1RyYXZpcycsXG4gICAgICBjb25maWdGaWxlOiAnLnRyYXZpcy55bWwnLFxuICAgICAgc3RhdHVzQ29udGV4dDogJ2NvbnRpbnVvdXMtaW50ZWdyYXRpb24vdHJhdmlzLWNpL3B1c2gnXG4gICAgfVxuICBdXG59KTtcbiJdfQ==
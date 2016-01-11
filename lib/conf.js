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

debugger;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jb25mLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7Ozs7Ozs7Ozs7O21CQVFULE9BQU8sQ0FBQyxHQUFHO01BTGIsSUFBSSxnQkFBSixJQUFJO01BQ0osV0FBVyxnQkFBWCxXQUFXO01BQ1gsaUJBQWlCLGdCQUFqQixpQkFBaUI7TUFDakIsWUFBWSxnQkFBWixZQUFZO01BQ1osU0FBUyxnQkFBVCxTQUFTOztBQUVYLFNBQVM7a0JBQ00sa0JBQUcsb0JBQW9CLEVBQUU7QUFDdEMsS0FBRyxFQUFFO0FBQ0gsUUFBSSxFQUFFLElBQUksSUFBSSxJQUFJO0FBQ2xCLFlBQVEsRUFBRSxPQUFPO0FBQ2pCLFlBQVEsRUFBRSxjQUFjO0FBQ3hCLGFBQVMsRUFBRSxnQkFBZ0I7R0FDNUI7QUFDRCxPQUFLLEVBQUU7QUFDTCxTQUFLLEVBQUUsV0FBVztBQUNsQixvQkFBZ0IsRUFBRTtBQUNoQixTQUFHLEVBQUUsaUJBQWlCO0tBQ3ZCO0dBQ0Y7QUFDRCxLQUFHLEVBQUU7QUFDSCxZQUFRLEVBQUUsNkJBQTZCO0dBQ3hDO0FBQ0QsVUFBUSxFQUFFLFNBQVMsSUFBSSxDQUFDO0FBQ3hCLFNBQU8sRUFBRSxnQ0FBZ0M7QUFDekMsYUFBVyxFQUFFLGdDQUFnQztBQUM3QyxXQUFTLEVBQUUsZ0NBQWdDO0FBQzNDLFNBQU8sRUFBRSxrQkFBa0I7Ozs7Ozs7O0FBUTNCLFFBQU0sRUFBRTtBQUNOLFNBQUssRUFBRSxZQUFZO0FBQ25CLE9BQUcsRUFBRSxNQUFNO0dBQ1o7Ozs7Ozs7Ozs7O0FBV0QsYUFBVyxFQUFFLENBQ1g7QUFDRSxRQUFJLEVBQUUsVUFBVTtBQUNoQixjQUFVLEVBQUUsY0FBYztBQUMxQixpQkFBYSxFQUFFLHdDQUF3QztHQUN4RCxFQUNEO0FBQ0UsUUFBSSxFQUFFLFFBQVE7QUFDZCxjQUFVLEVBQUUsYUFBYTtBQUN6QixpQkFBYSxFQUFFLHVDQUF1QztHQUN2RCxDQUNGO0NBQ0YsQ0FBQyIsImZpbGUiOiJjb25mLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuaW1wb3J0IHJjIGZyb20gJ3JjJztcbmNvbnN0IHtcbiAgUE9SVCxcbiAgU0xBQ0tfVE9LRU4sXG4gIFNMQUNLX1dFQkhPT0tfVVJMLFxuICBHSVRIVUJfVE9LRU4sXG4gIExPR19MRVZFTFxufSA9IHByb2Nlc3MuZW52O1xuZGVidWdnZXI7XG5leHBvcnQgZGVmYXVsdCByYygnbW96dS12YWxpZGF0b3ItYm90Jywge1xuICB3ZWI6IHtcbiAgICBwb3J0OiBQT1JUIHx8IDgwMDksXG4gICAgcHJvdG9jb2w6ICdodHRwOicsXG4gICAgaG9va1BhdGg6ICcvZ2l0aHViLWhvb2snLFxuICAgIGNoZWNrUGF0aDogJy9jaGVjay1wYWNrYWdlJ1xuICB9LFxuICBzbGFjazoge1xuICAgIHRva2VuOiBTTEFDS19UT0tFTixcbiAgICBpbmNvbWluZ193ZWJob29rOiB7XG4gICAgICB1cmw6IFNMQUNLX1dFQkhPT0tfVVJMLFxuICAgIH1cbiAgfSxcbiAgbnBtOiB7XG4gICAgcmVnaXN0cnk6ICdodHRwczovL3JlZ2lzdHJ5Lm5wbWpzLm9yZy8nXG4gIH0sXG4gIGxvZ0xldmVsOiBMT0dfTEVWRUwgfHwgNSxcbiAgYm90SWNvbjogJ2h0dHA6Ly9pLmltZ3VyLmNvbS9RRkZBbVlULnBuZycsXG4gIHN1Y2Nlc3NJY29uOiAnaHR0cDovL2kuaW1ndXIuY29tLzl5ek5mc2wucG5nJyxcbiAgZXJyb3JJY29uOiAnaHR0cDovL2kuaW1ndXIuY29tL3hMVVdoRjYucG5nJyxcbiAgYm90TmFtZTogJ0ouUi4gXCJCb2JcIiBEb2JicycsXG4gIC8vIExpa2VseSBhcyBub3QsIHlvdSdsbCB3YW50IHRvIGNyZWF0ZSBhIFwiUGVyc29uYWwgQWNjZXNzIFRva2VuXCIgaGVyZS5cbiAgLy8gVGhpcyBpc24ndCBhIHdlYiBhcHBsaWNhdGlvbiwgc28gdXNlcnMgd2lsbCBub3QgYmUgYXV0aGluZyBhbmRcbiAgLy8gZGVhdXRoaW5nIGl0LiBBbmQgaXQgc2hvdWxkbid0IGJlIGxvZ2dlZCBpbiBhcyBhIHNwZWNpZmljIHVzZXI7IGJ1dFxuICAvLyB1bmZvcnR1bmF0ZWx5IEdpdEh1YiBjYW4gb25seSBncmFudCBhY2Nlc3MgdG9rZW5zIGZvciB1c2VycywgcmF0aGVyXG4gIC8vIHRoYW4gb3JnYW5pemF0aW9ucy4gU28gdGhpcyB0b2tlbiBtdXN0IGJlbG9uZyB0byBzb21lb25lIHdobyBiZWxvbmdzXG4gIC8vIHRvIHRoZSBvcmdhbml6YXRpb24uIE9idmlvdXNseSBhIGJsYW5rIHRva2VuIHdvbid0IHdvcms7IHB1dCBhIHVzZXJcbiAgLy8gdG9rZW4gaW4gYC5tb3p1LXZhbGlkYXRvci1ib3RyY2AuXG4gIGdpdGh1Yjoge1xuICAgIHRva2VuOiBHSVRIVUJfVE9LRU4sXG4gICAgb3JnOiAnbW96dSdcbiAgfSxcbiAgLy8gRWFjaCBDSSBwcm92aWRlciBpbiB0aGlzIGxpc3Qgd2lsbCBtYWtlIHRoZSBib3QgY2hlY2ssIGZvciBlYWNoIHJlcG8sXG4gIC8vIHdoZXRoZXIgaXQgaGFzIGEgZmlsZSBpbiBpdHMgcm9vdCB0aGF0IG1hdGNoZXMgdGhlIGBjb25maWdGaWxlYCBuYW1lIGZvclxuICAvLyB0aGUgcHJvdmlkZXIuIElmIHRoZSByZXBvIGhhcyBzdWNoIGEgZmlsZSwgdGhlbiBmb3IgZXZlcnkgXCJzdWNjZXNzXCIgZXZlbnRcbiAgLy8gZm9yIHRoYXQgcmVwbywgdGhlIGJvdCB3aWxsIGNoZWNrIGFsbCByZWNlbnQgR2l0SHViIHN0YXR1c2VzIGZvciBzdWNjZXNzXG4gIC8vIG1lc3NhZ2VzIHdob3NlIGBjb250ZXh0YCBwcm9wZXJ0eSBtYXRjaGVzIHRoZSBgc3RhdHVzQ29udGV4dGAgZm9yIHRoZVxuICAvLyBwcm92aWRlci5cbiAgLy8gVGhlIGVmZmVjdCBvZiB0aGlzIGlzIHRoYXQgaWYgYSByZXBvIGhhcyBhIGAudHJhdmlzLnltbGAgYXQgcm9vdCwgdGhlblxuICAvLyB0aGUgYm90IHdvbid0IHZhbGlkYXRlIHRoZSBuZXcgdmVyc2lvbiB1bnRpbCBpdCBzZWVzIGEgXCJzdWNjZXNzXCIgc3RhdHVzXG4gIC8vIHdob3NlIGBjb250ZXh0YCB2YWx1ZSBpcyBcImNvbnRpbnVvdXMtaW50ZWdyYXRpb24vdHJhdmlzLWNpL3B1c2hcIi4gVGh1cyxcbiAgLy8gdGhlIGJvdCBhbHdheXMgd2FpdHMgZm9yIGFsbCBjb25maWd1cmVkIHByb3ZpZGVycyB0byBzdWNjZWVkLlxuICBjaVByb3ZpZGVyczogW1xuICAgIHtcbiAgICAgIG5hbWU6ICdBcHB2ZXlvcicsXG4gICAgICBjb25maWdGaWxlOiAnYXBwdmV5b3IueW1sJyxcbiAgICAgIHN0YXR1c0NvbnRleHQ6ICdjb250aW51b3VzLWludGVncmF0aW9uL2FwcHZleW9yL2JyYW5jaCdcbiAgICB9LFxuICAgIHtcbiAgICAgIG5hbWU6ICdUcmF2aXMnLFxuICAgICAgY29uZmlnRmlsZTogJy50cmF2aXMueW1sJyxcbiAgICAgIHN0YXR1c0NvbnRleHQ6ICdjb250aW51b3VzLWludGVncmF0aW9uL3RyYXZpcy1jaS9wdXNoJ1xuICAgIH1cbiAgXVxufSk7XG4iXX0=
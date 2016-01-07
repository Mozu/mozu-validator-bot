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
  npmRegistry: 'https://registry.npmjs.org/',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jb25mLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7Ozs7Ozs7Ozs7Ozs7OzttQkFHb0QsT0FBTyxDQUFDLEdBQUc7TUFBcEUsSUFBSSxnQkFBSixJQUFJO01BQUUsV0FBVyxnQkFBWCxXQUFXO01BQUUsWUFBWSxnQkFBWixZQUFZO01BQUUsUUFBUSxnQkFBUixRQUFRO01BQUUsU0FBUyxnQkFBVCxTQUFTO2tCQUM3QyxrQkFBRyxvQkFBb0IsRUFBRTtBQUN0QyxNQUFJLEVBQUUsSUFBSSxJQUFJLElBQUk7QUFDbEIsVUFBUSxFQUFFLGNBQWM7QUFDeEIsWUFBVSxFQUFFLFdBQVc7QUFDdkIsU0FBTyxFQUFFLFFBQVEsSUFBSSxlQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsd0JBQXdCLENBQUM7QUFDdkUsVUFBUSxFQUFFLFNBQVMsSUFBSSxDQUFDO0FBQ3hCLGFBQVcsRUFBRSw2QkFBNkI7QUFDMUMsU0FBTyxFQUFFLGdDQUFnQztBQUN6QyxhQUFXLEVBQUUsZ0NBQWdDO0FBQzdDLFdBQVMsRUFBRSxnQ0FBZ0M7QUFDM0MsU0FBTyxFQUFFLGtCQUFrQjs7Ozs7Ozs7QUFRM0IsYUFBVyxFQUFFLFlBQVk7QUFDekIsV0FBUyxFQUFFLE1BQU07Ozs7Ozs7Ozs7O0FBV2pCLGFBQVcsRUFBRSxDQUNYO0FBQ0UsUUFBSSxFQUFFLFVBQVU7QUFDaEIsY0FBVSxFQUFFLGNBQWM7QUFDMUIsaUJBQWEsRUFBRSx3Q0FBd0M7R0FDeEQsRUFDRDtBQUNFLFFBQUksRUFBRSxRQUFRO0FBQ2QsY0FBVSxFQUFFLGFBQWE7QUFDekIsaUJBQWEsRUFBRSx1Q0FBdUM7R0FDdkQsQ0FDRjtDQUNGLENBQUMiLCJmaWxlIjoiY29uZi5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcbmltcG9ydCByYyBmcm9tICdyYyc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmNvbnN0IHsgUE9SVCwgU0xBQ0tfVE9LRU4sIEdJVEhVQl9UT0tFTiwgTE9HX1BBVEgsIExPR19MRVZFTCB9ID0gcHJvY2Vzcy5lbnY7XG5leHBvcnQgZGVmYXVsdCByYygnbW96dS12YWxpZGF0b3ItYm90Jywge1xuICBwb3J0OiBQT1JUIHx8IDgwMDksXG4gIGhvb2tQYXRoOiAnL2dpdGh1Yi1ob29rJyxcbiAgc2xhY2tUb2tlbjogU0xBQ0tfVE9LRU4sXG4gIGxvZ1BhdGg6IExPR19QQVRIIHx8IHBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCAnbW96dS12YWxpZGF0b3ItYm90LmxvZycpLFxuICBsb2dMZXZlbDogTE9HX0xFVkVMIHx8IDUsXG4gIG5wbVJlZ2lzdHJ5OiAnaHR0cHM6Ly9yZWdpc3RyeS5ucG1qcy5vcmcvJyxcbiAgYm90SWNvbjogJ2h0dHA6Ly9pLmltZ3VyLmNvbS9RRkZBbVlULnBuZycsXG4gIHN1Y2Nlc3NJY29uOiAnaHR0cDovL2kuaW1ndXIuY29tLzl5ek5mc2wucG5nJyxcbiAgZXJyb3JJY29uOiAnaHR0cDovL2kuaW1ndXIuY29tL3hMVVdoRjYucG5nJyxcbiAgYm90TmFtZTogJ0ouUi4gXCJCb2JcIiBEb2JicycsXG4gIC8vIExpa2VseSBhcyBub3QsIHlvdSdsbCB3YW50IHRvIGNyZWF0ZSBhIFwiUGVyc29uYWwgQWNjZXNzIFRva2VuXCIgaGVyZS5cbiAgLy8gVGhpcyBpc24ndCBhIHdlYiBhcHBsaWNhdGlvbiwgc28gdXNlcnMgd2lsbCBub3QgYmUgYXV0aGluZyBhbmRcbiAgLy8gZGVhdXRoaW5nIGl0LiBBbmQgaXQgc2hvdWxkbid0IGJlIGxvZ2dlZCBpbiBhcyBhIHNwZWNpZmljIHVzZXI7IGJ1dFxuICAvLyB1bmZvcnR1bmF0ZWx5IEdpdEh1YiBjYW4gb25seSBncmFudCBhY2Nlc3MgdG9rZW5zIGZvciB1c2VycywgcmF0aGVyXG4gIC8vIHRoYW4gb3JnYW5pemF0aW9ucy4gU28gdGhpcyB0b2tlbiBtdXN0IGJlbG9uZyB0byBzb21lb25lIHdobyBiZWxvbmdzXG4gIC8vIHRvIHRoZSBvcmdhbml6YXRpb24uIE9idmlvdXNseSBhIGJsYW5rIHRva2VuIHdvbid0IHdvcms7IHB1dCBhIHVzZXJcbiAgLy8gdG9rZW4gaW4gYC5tb3p1LXZhbGlkYXRvci1ib3RyY2AuXG4gIGdpdGh1YlRva2VuOiBHSVRIVUJfVE9LRU4sXG4gIGdpdGh1Yk9yZzogJ21venUnLFxuICAvLyBFYWNoIENJIHByb3ZpZGVyIGluIHRoaXMgbGlzdCB3aWxsIG1ha2UgdGhlIGJvdCBjaGVjaywgZm9yIGVhY2ggcmVwbyxcbiAgLy8gd2hldGhlciBpdCBoYXMgYSBmaWxlIGluIGl0cyByb290IHRoYXQgbWF0Y2hlcyB0aGUgYGNvbmZpZ0ZpbGVgIG5hbWUgZm9yXG4gIC8vIHRoZSBwcm92aWRlci4gSWYgdGhlIHJlcG8gaGFzIHN1Y2ggYSBmaWxlLCB0aGVuIGZvciBldmVyeSBcInN1Y2Nlc3NcIiBldmVudFxuICAvLyBmb3IgdGhhdCByZXBvLCB0aGUgYm90IHdpbGwgY2hlY2sgYWxsIHJlY2VudCBHaXRIdWIgc3RhdHVzZXMgZm9yIHN1Y2Nlc3NcbiAgLy8gbWVzc2FnZXMgd2hvc2UgYGNvbnRleHRgIHByb3BlcnR5IG1hdGNoZXMgdGhlIGBzdGF0dXNDb250ZXh0YCBmb3IgdGhlXG4gIC8vIHByb3ZpZGVyLlxuICAvLyBUaGUgZWZmZWN0IG9mIHRoaXMgaXMgdGhhdCBpZiBhIHJlcG8gaGFzIGEgYC50cmF2aXMueW1sYCBhdCByb290LCB0aGVuXG4gIC8vIHRoZSBib3Qgd29uJ3QgdmFsaWRhdGUgdGhlIG5ldyB2ZXJzaW9uIHVudGlsIGl0IHNlZXMgYSBcInN1Y2Nlc3NcIiBzdGF0dXNcbiAgLy8gd2hvc2UgYGNvbnRleHRgIHZhbHVlIGlzIFwiY29udGludW91cy1pbnRlZ3JhdGlvbi90cmF2aXMtY2kvcHVzaFwiLiBUaHVzLFxuICAvLyB0aGUgYm90IGFsd2F5cyB3YWl0cyBmb3IgYWxsIGNvbmZpZ3VyZWQgcHJvdmlkZXJzIHRvIHN1Y2NlZWQuXG4gIGNpUHJvdmlkZXJzOiBbXG4gICAge1xuICAgICAgbmFtZTogJ0FwcHZleW9yJyxcbiAgICAgIGNvbmZpZ0ZpbGU6ICdhcHB2ZXlvci55bWwnLFxuICAgICAgc3RhdHVzQ29udGV4dDogJ2NvbnRpbnVvdXMtaW50ZWdyYXRpb24vYXBwdmV5b3IvYnJhbmNoJ1xuICAgIH0sXG4gICAge1xuICAgICAgbmFtZTogJ1RyYXZpcycsXG4gICAgICBjb25maWdGaWxlOiAnLnRyYXZpcy55bWwnLFxuICAgICAgc3RhdHVzQ29udGV4dDogJ2NvbnRpbnVvdXMtaW50ZWdyYXRpb24vdHJhdmlzLWNpL3B1c2gnXG4gICAgfVxuICBdXG59KTtcbiJdfQ==
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = GithubClient;

var _rx = require('rx');

var _octonode = require('octonode');

var _octonode2 = _interopRequireDefault(_octonode);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function GithubClient(_ref) {
  let logger = _ref.logger;
  let githubToken = _ref.githubToken;
  let githubOrg = _ref.githubOrg;

  const github = _octonode2.default.client(githubToken);
  const getClient = repo => {
    let path = `${ githubOrg }/${ repo }`;
    let repoClient = github.repo(path);
    let methods = {};
    return function (method) {
      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      logger.log('info', `calling github api method '${ method } for ${ path }`);
      methods[method] = methods[method] || _rx.Observable.fromNodeCallback(repoClient[method], repoClient, data => data);
      return methods[method].apply(methods, args);
    };
  };
  return {
    fullCommitStatus(repo, sha) {
      logger.info(`getting full commit status for ${ repo }#${ sha }`);
      let retrieve = getClient(repo);
      return _rx.Observable.forkJoin(retrieve('statuses', sha), retrieve('contents', '/', 'master'), (statuses, contents) => ({ statuses, contents }));
    },
    tags(repo) {
      return getClient(repo)('tags');
    }
  };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9naXRodWItY2xpZW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O2tCQUd3QixZQUFZOzs7Ozs7Ozs7O0FBQXJCLFNBQVMsWUFBWSxPQUFxQztNQUFsQyxNQUFNLFFBQU4sTUFBTTtNQUFFLFdBQVcsUUFBWCxXQUFXO01BQUUsU0FBUyxRQUFULFNBQVM7O0FBQ25FLFFBQU0sTUFBTSxHQUFHLG1CQUFTLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUM1QyxRQUFNLFNBQVMsR0FBRyxBQUFDLElBQUksSUFBSztBQUMxQixRQUFJLElBQUksR0FBRyxDQUFDLEdBQUUsU0FBUyxFQUFDLENBQUMsR0FBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO0FBQ2xDLFFBQUksVUFBVSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDbkMsUUFBSSxPQUFPLEdBQUcsRUFBRSxDQUFDO0FBQ2pCLFdBQU8sVUFBQyxNQUFNLEVBQWM7d0NBQVQsSUFBSTtBQUFKLFlBQUk7OztBQUNyQixZQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLDJCQUEyQixHQUFFLE1BQU0sRUFBQyxLQUFLLEdBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZFLGFBQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksSUFYbEMsVUFBVSxDQVdtQyxnQkFBZ0IsQ0FDOUQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUNsQixVQUFVLEVBQ1YsQUFBQyxJQUFJLElBQUssSUFBSSxDQUNmLENBQUM7QUFDRixhQUFPLE9BQU8sQ0FBQyxNQUFNLE9BQUMsQ0FBZixPQUFPLEVBQVksSUFBSSxDQUFDLENBQUM7S0FDakMsQ0FBQztHQUNILENBQUM7QUFDRixTQUFPO0FBQ0wsb0JBQWdCLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRTtBQUMxQixZQUFNLENBQUMsSUFBSSxDQUNULENBQUMsK0JBQStCLEdBQUUsSUFBSSxFQUFDLENBQUMsR0FBRSxHQUFHLEVBQUMsQ0FBQyxDQUNoRCxDQUFDO0FBQ0YsVUFBSSxRQUFRLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQy9CLGFBQU8sSUF6QkosVUFBVSxDQXlCSyxRQUFRLENBQ3hCLFFBQVEsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLEVBQ3pCLFFBQVEsQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFLFFBQVEsQ0FBQyxFQUNuQyxDQUFDLFFBQVEsRUFBRSxRQUFRLE1BQU0sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FDakQsQ0FBQztLQUNIO0FBQ0QsUUFBSSxDQUFDLElBQUksRUFBRTtBQUNULGFBQU8sU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQ2hDO0dBQ0YsQ0FBQTtDQUNGIiwiZmlsZSI6ImdpdGh1Yi1jbGllbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBPYnNlcnZhYmxlIH0gZnJvbSAncngnO1xuaW1wb3J0IG9jdG9ub2RlIGZyb20gJ29jdG9ub2RlJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gR2l0aHViQ2xpZW50KHsgbG9nZ2VyLCBnaXRodWJUb2tlbiwgZ2l0aHViT3JnIH0pIHtcbiAgY29uc3QgZ2l0aHViID0gb2N0b25vZGUuY2xpZW50KGdpdGh1YlRva2VuKTtcbiAgY29uc3QgZ2V0Q2xpZW50ID0gKHJlcG8pID0+IHtcbiAgICBsZXQgcGF0aCA9IGAke2dpdGh1Yk9yZ30vJHtyZXBvfWA7XG4gICAgbGV0IHJlcG9DbGllbnQgPSBnaXRodWIucmVwbyhwYXRoKTtcbiAgICBsZXQgbWV0aG9kcyA9IHt9O1xuICAgIHJldHVybiAobWV0aG9kLCAuLi5hcmdzKSA9PiB7XG4gICAgICBsb2dnZXIubG9nKCdpbmZvJywgYGNhbGxpbmcgZ2l0aHViIGFwaSBtZXRob2QgJyR7bWV0aG9kfSBmb3IgJHtwYXRofWApO1xuICAgICAgbWV0aG9kc1ttZXRob2RdID0gbWV0aG9kc1ttZXRob2RdIHx8IE9ic2VydmFibGUuZnJvbU5vZGVDYWxsYmFjayhcbiAgICAgICAgcmVwb0NsaWVudFttZXRob2RdLFxuICAgICAgICByZXBvQ2xpZW50LFxuICAgICAgICAoZGF0YSkgPT4gZGF0YVxuICAgICAgKTtcbiAgICAgIHJldHVybiBtZXRob2RzW21ldGhvZF0oLi4uYXJncyk7XG4gICAgfTtcbiAgfTtcbiAgcmV0dXJuIHtcbiAgICBmdWxsQ29tbWl0U3RhdHVzKHJlcG8sIHNoYSkge1xuICAgICAgbG9nZ2VyLmluZm8oXG4gICAgICAgIGBnZXR0aW5nIGZ1bGwgY29tbWl0IHN0YXR1cyBmb3IgJHtyZXBvfSMke3NoYX1gXG4gICAgICApO1xuICAgICAgbGV0IHJldHJpZXZlID0gZ2V0Q2xpZW50KHJlcG8pO1xuICAgICAgcmV0dXJuIE9ic2VydmFibGUuZm9ya0pvaW4oXG4gICAgICAgIHJldHJpZXZlKCdzdGF0dXNlcycsIHNoYSksXG4gICAgICAgIHJldHJpZXZlKCdjb250ZW50cycsICcvJywgJ21hc3RlcicpLFxuICAgICAgICAoc3RhdHVzZXMsIGNvbnRlbnRzKSA9PiAoeyBzdGF0dXNlcywgY29udGVudHMgfSlcbiAgICAgICk7XG4gICAgfSxcbiAgICB0YWdzKHJlcG8pIHtcbiAgICAgIHJldHVybiBnZXRDbGllbnQocmVwbykoJ3RhZ3MnKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==
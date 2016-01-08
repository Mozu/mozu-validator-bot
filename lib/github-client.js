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
  return {
    forRepo: repo => {
      let path = `${ githubOrg }/${ repo }`;
      let repoClient = github.repo(path);
      let methods = {};
      return function (method) {
        for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }

        logger.log('info', `calling github method '${ method }' for ${ path }`);
        methods[method] = methods[method] || _rx.Observable.fromNodeCallback(repoClient[method], repoClient, data => data);
        return methods[method].apply(methods, args);
      };
    }
  };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9naXRodWItY2xpZW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O2tCQUd3QixZQUFZOzs7Ozs7Ozs7O0FBQXJCLFNBQVMsWUFBWSxPQUFxQztNQUFsQyxNQUFNLFFBQU4sTUFBTTtNQUFFLFdBQVcsUUFBWCxXQUFXO01BQUUsU0FBUyxRQUFULFNBQVM7O0FBQ25FLFFBQU0sTUFBTSxHQUFHLG1CQUFTLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUM1QyxTQUFPO0FBQ0wsV0FBTyxFQUFFLEFBQUMsSUFBSSxJQUFLO0FBQ2pCLFVBQUksSUFBSSxHQUFHLENBQUMsR0FBRSxTQUFTLEVBQUMsQ0FBQyxHQUFFLElBQUksRUFBQyxDQUFDLENBQUM7QUFDbEMsVUFBSSxVQUFVLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNuQyxVQUFJLE9BQU8sR0FBRyxFQUFFLENBQUM7QUFDakIsYUFBTyxVQUFDLE1BQU0sRUFBYzswQ0FBVCxJQUFJO0FBQUosY0FBSTs7O0FBQ3JCLGNBQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsdUJBQXVCLEdBQUUsTUFBTSxFQUFDLE1BQU0sR0FBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEUsZUFBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxJQVpwQyxVQUFVLENBWXFDLGdCQUFnQixDQUM5RCxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQ2xCLFVBQVUsRUFDVixBQUFDLElBQUksSUFBSyxJQUFJLENBQ2YsQ0FBQztBQUNGLGVBQU8sT0FBTyxDQUFDLE1BQU0sT0FBQyxDQUFmLE9BQU8sRUFBWSxJQUFJLENBQUMsQ0FBQztPQUNqQyxDQUFDO0tBQ0g7R0FDRixDQUFDO0NBQ0giLCJmaWxlIjoiZ2l0aHViLWNsaWVudC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE9ic2VydmFibGUgfSBmcm9tICdyeCc7XG5pbXBvcnQgb2N0b25vZGUgZnJvbSAnb2N0b25vZGUnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBHaXRodWJDbGllbnQoeyBsb2dnZXIsIGdpdGh1YlRva2VuLCBnaXRodWJPcmcgfSkge1xuICBjb25zdCBnaXRodWIgPSBvY3Rvbm9kZS5jbGllbnQoZ2l0aHViVG9rZW4pO1xuICByZXR1cm4ge1xuICAgIGZvclJlcG86IChyZXBvKSA9PiB7XG4gICAgICBsZXQgcGF0aCA9IGAke2dpdGh1Yk9yZ30vJHtyZXBvfWA7XG4gICAgICBsZXQgcmVwb0NsaWVudCA9IGdpdGh1Yi5yZXBvKHBhdGgpO1xuICAgICAgbGV0IG1ldGhvZHMgPSB7fTtcbiAgICAgIHJldHVybiAobWV0aG9kLCAuLi5hcmdzKSA9PiB7XG4gICAgICAgIGxvZ2dlci5sb2coJ2luZm8nLCBgY2FsbGluZyBnaXRodWIgbWV0aG9kICcke21ldGhvZH0nIGZvciAke3BhdGh9YCk7XG4gICAgICAgIG1ldGhvZHNbbWV0aG9kXSA9IG1ldGhvZHNbbWV0aG9kXSB8fCBPYnNlcnZhYmxlLmZyb21Ob2RlQ2FsbGJhY2soXG4gICAgICAgICAgcmVwb0NsaWVudFttZXRob2RdLFxuICAgICAgICAgIHJlcG9DbGllbnQsXG4gICAgICAgICAgKGRhdGEpID0+IGRhdGFcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuIG1ldGhvZHNbbWV0aG9kXSguLi5hcmdzKTtcbiAgICAgIH07XG4gICAgfVxuICB9O1xufVxuIl19
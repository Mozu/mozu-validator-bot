'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = GithubClient;

var _rx = require('rx');

var _octonode = require('octonode');

var _octonode2 = _interopRequireDefault(_octonode);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function createMethodMemoizer(logger, instance) {
  let methods = {};
  return function (method) {
    methods[method] = methods[method] || _rx.Observable.fromNodeCallback(instance[method], instance, (maybeStatus, data) => typeof maybeStatus === 'number' ? data : maybeStatus);
    logger.info(`calling github method '${ method }'`);

    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }

    return methods[method].apply(methods, args);
  };
}

function GithubClient(_ref) {
  let logger = _ref.logger;
  let github = _ref.github;

  const client = _octonode2.default.client(github.token);
  let runMethod = createMethodMemoizer(logger, client);
  runMethod.forRepo = repo => createMethodMemoizer(logger, client.repo(`${ github.org }/${ repo }`));
  return runMethod;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9naXRodWItY2xpZW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O2tCQWlCd0IsWUFBWTs7Ozs7Ozs7OztBQWRwQyxTQUFTLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUU7QUFDOUMsTUFBSSxPQUFPLEdBQUcsRUFBRSxDQUFDO0FBQ2pCLFNBQU8sVUFBUyxNQUFNLEVBQVc7QUFDL0IsV0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxJQU5oQyxVQUFVLENBTWlDLGdCQUFnQixDQUM5RCxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQ2hCLFFBQVEsRUFDUixDQUFDLFdBQVcsRUFBRSxJQUFJLEtBQ2hCLE9BQU8sV0FBVyxLQUFLLFFBQVEsR0FBRyxJQUFJLEdBQUcsV0FBVyxDQUN2RCxDQUFDO0FBQ0YsVUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLHVCQUF1QixHQUFFLE1BQU0sRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztzQ0FQeEIsSUFBSTtBQUFKLFVBQUk7OztBQVE3QixXQUFPLE9BQU8sQ0FBQyxNQUFNLE9BQUMsQ0FBZixPQUFPLEVBQVksSUFBSSxDQUFDLENBQUM7R0FDakMsQ0FBQztDQUNIOztBQUVjLFNBQVMsWUFBWSxPQUFxQjtNQUFsQixNQUFNLFFBQU4sTUFBTTtNQUFFLE1BQU0sUUFBTixNQUFNOztBQUNuRCxRQUFNLE1BQU0sR0FBRyxtQkFBUyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzdDLE1BQUksU0FBUyxHQUFHLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztBQUNyRCxXQUFTLENBQUMsT0FBTyxHQUFHLEFBQUMsSUFBSSxJQUN2QixvQkFBb0IsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUUsTUFBTSxDQUFDLEdBQUcsRUFBQyxDQUFDLEdBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDckUsU0FBTyxTQUFTLENBQUM7Q0FDbEIiLCJmaWxlIjoiZ2l0aHViLWNsaWVudC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE9ic2VydmFibGUgfSBmcm9tICdyeCc7XG5pbXBvcnQgb2N0b25vZGUgZnJvbSAnb2N0b25vZGUnO1xuXG5mdW5jdGlvbiBjcmVhdGVNZXRob2RNZW1vaXplcihsb2dnZXIsIGluc3RhbmNlKSB7XG4gIGxldCBtZXRob2RzID0ge307XG4gIHJldHVybiBmdW5jdGlvbihtZXRob2QsIC4uLmFyZ3MpIHtcbiAgICBtZXRob2RzW21ldGhvZF0gPSBtZXRob2RzW21ldGhvZF0gfHwgT2JzZXJ2YWJsZS5mcm9tTm9kZUNhbGxiYWNrKFxuICAgICAgaW5zdGFuY2VbbWV0aG9kXSxcbiAgICAgIGluc3RhbmNlLFxuICAgICAgKG1heWJlU3RhdHVzLCBkYXRhKSA9PlxuICAgICAgICB0eXBlb2YgbWF5YmVTdGF0dXMgPT09ICdudW1iZXInID8gZGF0YSA6IG1heWJlU3RhdHVzXG4gICAgKTtcbiAgICBsb2dnZXIuaW5mbyhgY2FsbGluZyBnaXRodWIgbWV0aG9kICcke21ldGhvZH0nYCk7XG4gICAgcmV0dXJuIG1ldGhvZHNbbWV0aG9kXSguLi5hcmdzKTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gR2l0aHViQ2xpZW50KHsgbG9nZ2VyLCBnaXRodWIgfSkge1xuICBjb25zdCBjbGllbnQgPSBvY3Rvbm9kZS5jbGllbnQoZ2l0aHViLnRva2VuKTtcbiAgbGV0IHJ1bk1ldGhvZCA9IGNyZWF0ZU1ldGhvZE1lbW9pemVyKGxvZ2dlciwgY2xpZW50KTtcbiAgcnVuTWV0aG9kLmZvclJlcG8gPSAocmVwbykgPT5cbiAgICBjcmVhdGVNZXRob2RNZW1vaXplcihsb2dnZXIsIGNsaWVudC5yZXBvKGAke2dpdGh1Yi5vcmd9LyR7cmVwb31gKSk7XG4gIHJldHVybiBydW5NZXRob2Q7XG59XG4iXX0=
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

    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }

    if (method === 'get' || method === 'post') {
      logger.info(`calling github ${ method.toUpperCase() } ${ args[0] }`);
    } else {
      logger.info(`calling github method '${ method }'`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9naXRodWItY2xpZW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O2tCQXFCd0IsWUFBWTs7Ozs7Ozs7OztBQWxCcEMsU0FBUyxvQkFBb0IsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFO0FBQzlDLE1BQUksT0FBTyxHQUFHLEVBQUUsQ0FBQztBQUNqQixTQUFPLFVBQVMsTUFBTSxFQUFXO0FBQy9CLFdBQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksSUFOaEMsVUFBVSxDQU1pQyxnQkFBZ0IsQ0FDOUQsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUNoQixRQUFRLEVBQ1IsQ0FBQyxXQUFXLEVBQUUsSUFBSSxLQUNoQixPQUFPLFdBQVcsS0FBSyxRQUFRLEdBQUcsSUFBSSxHQUFHLFdBQVcsQ0FDdkQsQ0FBQzs7c0NBTnVCLElBQUk7QUFBSixVQUFJOzs7QUFPN0IsUUFBSSxNQUFNLEtBQUssS0FBSyxJQUFJLE1BQU0sS0FBSyxNQUFNLEVBQUU7QUFDekMsWUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsR0FBRSxNQUFNLENBQUMsV0FBVyxFQUFFLEVBQUMsQ0FBQyxHQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQztLQUNsRSxNQUFNO0FBQ0wsWUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLHVCQUF1QixHQUFFLE1BQU0sRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ2xEO0FBQ0QsV0FBTyxPQUFPLENBQUMsTUFBTSxPQUFDLENBQWYsT0FBTyxFQUFZLElBQUksQ0FBQyxDQUFDO0dBQ2pDLENBQUM7Q0FDSDs7QUFFYyxTQUFTLFlBQVksT0FBcUI7TUFBbEIsTUFBTSxRQUFOLE1BQU07TUFBRSxNQUFNLFFBQU4sTUFBTTs7QUFDbkQsUUFBTSxNQUFNLEdBQUcsbUJBQVMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUM3QyxNQUFJLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDckQsV0FBUyxDQUFDLE9BQU8sR0FBRyxBQUFDLElBQUksSUFDdkIsb0JBQW9CLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFFLE1BQU0sQ0FBQyxHQUFHLEVBQUMsQ0FBQyxHQUFFLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JFLFNBQU8sU0FBUyxDQUFDO0NBQ2xCIiwiZmlsZSI6ImdpdGh1Yi1jbGllbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBPYnNlcnZhYmxlIH0gZnJvbSAncngnO1xuaW1wb3J0IG9jdG9ub2RlIGZyb20gJ29jdG9ub2RlJztcblxuZnVuY3Rpb24gY3JlYXRlTWV0aG9kTWVtb2l6ZXIobG9nZ2VyLCBpbnN0YW5jZSkge1xuICBsZXQgbWV0aG9kcyA9IHt9O1xuICByZXR1cm4gZnVuY3Rpb24obWV0aG9kLCAuLi5hcmdzKSB7XG4gICAgbWV0aG9kc1ttZXRob2RdID0gbWV0aG9kc1ttZXRob2RdIHx8IE9ic2VydmFibGUuZnJvbU5vZGVDYWxsYmFjayhcbiAgICAgIGluc3RhbmNlW21ldGhvZF0sXG4gICAgICBpbnN0YW5jZSxcbiAgICAgIChtYXliZVN0YXR1cywgZGF0YSkgPT5cbiAgICAgICAgdHlwZW9mIG1heWJlU3RhdHVzID09PSAnbnVtYmVyJyA/IGRhdGEgOiBtYXliZVN0YXR1c1xuICAgICk7XG4gICAgaWYgKG1ldGhvZCA9PT0gJ2dldCcgfHwgbWV0aG9kID09PSAncG9zdCcpIHtcbiAgICAgIGxvZ2dlci5pbmZvKGBjYWxsaW5nIGdpdGh1YiAke21ldGhvZC50b1VwcGVyQ2FzZSgpfSAke2FyZ3NbMF19YCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZ2dlci5pbmZvKGBjYWxsaW5nIGdpdGh1YiBtZXRob2QgJyR7bWV0aG9kfSdgKTtcbiAgICB9XG4gICAgcmV0dXJuIG1ldGhvZHNbbWV0aG9kXSguLi5hcmdzKTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gR2l0aHViQ2xpZW50KHsgbG9nZ2VyLCBnaXRodWIgfSkge1xuICBjb25zdCBjbGllbnQgPSBvY3Rvbm9kZS5jbGllbnQoZ2l0aHViLnRva2VuKTtcbiAgbGV0IHJ1bk1ldGhvZCA9IGNyZWF0ZU1ldGhvZE1lbW9pemVyKGxvZ2dlciwgY2xpZW50KTtcbiAgcnVuTWV0aG9kLmZvclJlcG8gPSAocmVwbykgPT5cbiAgICBjcmVhdGVNZXRob2RNZW1vaXplcihsb2dnZXIsIGNsaWVudC5yZXBvKGAke2dpdGh1Yi5vcmd9LyR7cmVwb31gKSk7XG4gIHJldHVybiBydW5NZXRob2Q7XG59XG4iXX0=
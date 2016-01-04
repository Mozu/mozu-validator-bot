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
    repoStatus(repo) {
      let retrieve = getClient(repo);
      return retrieve('statuses', 'master');
    },
    repoInfo(repo) {
      let retrieve = getClient(repo);
      return _rx.Observable.forkJoin(retrieve('contents', '/', 'master'), retrieve('tags'), retrieve('commit', 'HEAD'), (contents, tags, head) => ({ contents, tags, head }));
    }
  };
}
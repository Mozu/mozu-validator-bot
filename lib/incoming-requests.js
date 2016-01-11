'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (_ref) {
  let logger = _ref.logger;
  let web = _ref.web;
  let githubClient = _ref.githubClient;
  let github = _ref.github;
  const port = web.port;
  const hostname = web.hostname;
  const protocol = web.protocol;
  const hookPath = web.hookPath;
  const checkPath = web.checkPath;
  const hookSecret = web.hookSecret;

  logger.info(`github hook listener starting at localhost:${ port }${ hookPath }`, `check listener starting at localhost:${ port }${ checkPath }`);
  const app = (0, _express2.default)();
  const githubHooks = new _rx.Subject();
  const checkRequests = new _rx.Subject();
  app.use((0, _bodyParser.text)({ type: '*/*' }));
  app.get('/', (req, res, next) => res.send('I\'m listening.'));
  app.post(hookPath, (req, res, next) => {
    let hmac = (0, _crypto.createHmac)('sha1', hookSecret);
    hmac.update(req.body);
    let sig = req.get('X-Hub-Signature');
    let valid = sig && hmac.digest('hex') === sig.slice(sig.indexOf('=') + 1);
    logger[valid ? 'notice' : 'warning'](valid ? 'Received valid webhook.' : 'Webhook request did not validate with secure signature.', sig);
    res.status(200).send('Thanks! Bathe in slack.');
    if (valid) {
      githubHooks.onNext({
        req,
        event: req.get('X-GitHub-Event'),
        data: JSON.parse(req.body)
      });
    }
  });
  app.get(checkPath, (req, res, next) => {
    checkRequests.onNext(_extends({
      reply: (status, response) => res.status(status).json(response)
    }, req.query));
  });

  let server = app.listen(port, ensureHookExistsForHost);

  return { server, githubHooks, checkRequests };

  function getOrCreateHook(host) {
    const url = `${ protocol }//${ host }:${ port }${ hookPath }`;
    return githubClient('get', `/orgs/${ github.org }/hooks`).concatMap(hooks => {
      const ourHook = hooks.find(_ref2 => {
        let name = _ref2.name;
        let events = _ref2.events;
        let config = _ref2.config;
        let active = _ref2.active;
        return active && name === 'web' && (~events.indexOf('status') || ~events.indexOf('*')) && config.url === url && config.content_type === 'json';
      });
      if (ourHook) {
        logger.info('Webhook already exists');
        return _rx.Observable.just(ourHook);
      } else {
        logger.notice('Webhook does not exist. Attempting to create...');
        return githubClient('post', `/orgs/${ github.org }/hooks`, {
          name: 'web',
          events: ['status'],
          config: { url, content_type: 'json', secret: hookSecret },
          active: true
        });
      }
    });
  }

  function getHost() {
    return web.hostname ? _rx.Observable.just(web.hostname) : _rx.Observable.fromNodeCallback(_publicIp2.default.v4, _publicIp2.default)();
  }

  function ensureHookExistsForHost() {
    getHost().concatMap(getOrCreateHook).subscribe(_ref3 => {
      let url = _ref3.url;
      let events = _ref3.events;
      let config = _ref3.config;
      return logger.notice(`Webhook ${ url } is set up to post ${ events } events to ${ config.url }`);
    }, logger.error);
  }
};

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _rx = require('rx');

var _bodyParser = require('body-parser');

var _crypto = require('crypto');

var _publicIp = require('public-ip');

var _publicIp2 = _interopRequireDefault(_publicIp);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmNvbWluZy1yZXF1ZXN0cy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7OztrQkFLZSxnQkFBZ0Q7TUFBckMsTUFBTSxRQUFOLE1BQU07TUFBRSxHQUFHLFFBQUgsR0FBRztNQUFFLFlBQVksUUFBWixZQUFZO01BQUUsTUFBTSxRQUFOLE1BQU07UUFDakQsSUFBSSxHQUEwRCxHQUFHLENBQWpFLElBQUk7UUFBRSxRQUFRLEdBQWdELEdBQUcsQ0FBM0QsUUFBUTtRQUFFLFFBQVEsR0FBc0MsR0FBRyxDQUFqRCxRQUFRO1FBQUUsUUFBUSxHQUE0QixHQUFHLENBQXZDLFFBQVE7UUFBRSxTQUFTLEdBQWlCLEdBQUcsQ0FBN0IsU0FBUztRQUFFLFVBQVUsR0FBSyxHQUFHLENBQWxCLFVBQVU7O0FBQ2pFLFFBQU0sQ0FBQyxJQUFJLENBQ1QsQ0FBQywyQ0FBMkMsR0FBRSxJQUFJLEVBQUMsR0FBRSxRQUFRLEVBQUMsQ0FBQyxFQUMvRCxDQUFDLHFDQUFxQyxHQUFFLElBQUksRUFBQyxHQUFFLFNBQVMsRUFBQyxDQUFDLENBQzNELENBQUM7QUFDRixRQUFNLEdBQUcsR0FBRyx3QkFBUyxDQUFDO0FBQ3RCLFFBQU0sV0FBVyxHQUFHLFFBWEQsT0FBTyxFQVdPLENBQUM7QUFDbEMsUUFBTSxhQUFhLEdBQUcsUUFaSCxPQUFPLEVBWVMsQ0FBQztBQUNwQyxLQUFHLENBQUMsR0FBRyxDQUFDLGdCQVpELElBQUksRUFZRSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDL0IsS0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztBQUM5RCxLQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxLQUFLO0FBQ3JDLFFBQUks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LE1BQU0sQ0FBQyxHQUFHLEVBQUMsTUFBTSxDQUFDLEVBQzNCO0FBQ0UsY0FBSSxFQUFFLEtBQUs7QUFDWCxnQkFBTSxFQUFFLENBQUMsUUFBUSxDQUFDO0FBQ2xCLGdCQUFNLEVBQUUsRUFBRSxHQUFHLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFO0FBQ3pELGdCQUFNLEVBQUUsSUFBSTtTQUNiLENBQ0YsQ0FBQztPQUNIO0tBQ0YsQ0FBQyxDQUFDO0dBQ0o7O0FBRUQsV0FBUyxPQUFPLEdBQUc7QUFDakIsV0FBTyxHQUFHLENBQUMsUUFBUSxHQUFHLElBNUVqQixVQUFVLENBNEVrQixJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUNqRCxJQTdFRyxVQUFVLENBNkVGLGdCQUFnQixDQUN6QixtQkFBUyxFQUFFLHFCQUNaLEVBQUUsQ0FBQTtHQUNOOztBQUVELFdBQVMsdUJBQXVCLEdBQUc7QUFDakMsV0FBTyxFQUFFLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDLFNBQVMsQ0FDNUM7VUFBRyxHQUFHLFNBQUgsR0FBRztVQUFFLE1BQU0sU0FBTixNQUFNO1VBQUUsTUFBTSxTQUFOLE1BQU07YUFBTyxNQUFNLENBQUMsTUFBTSxDQUN4QyxDQUFDLFFBQVEsR0FBRSxHQUFHLEVBQUMsbUJBQW1CLEdBQUUsTUFBTSxFQUFDLFdBQVcsR0FBRSxNQUFNLENBQUMsR0FBRyxFQUFDLENBQUMsQ0FDckU7S0FBQSxFQUNELE1BQU0sQ0FBQyxLQUFLLENBQ2IsQ0FBQztHQUNIO0NBQ0Y7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLENBQUMiLCJmaWxlIjoiaW5jb21pbmctcmVxdWVzdHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZXhwcmVzcyBmcm9tICdleHByZXNzJztcbmltcG9ydCB7IE9ic2VydmFibGUsIFN1YmplY3QgfSBmcm9tICdyeCc7XG5pbXBvcnQgeyB0ZXh0IH0gZnJvbSAnYm9keS1wYXJzZXInO1xuaW1wb3J0IHsgY3JlYXRlSG1hYyB9IGZyb20gJ2NyeXB0byc7XG5pbXBvcnQgcHVibGljSXAgZnJvbSAncHVibGljLWlwJztcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHsgbG9nZ2VyLCB3ZWIsIGdpdGh1YkNsaWVudCwgZ2l0aHViIH0pIHtcbiAgY29uc3QgeyBwb3J0LCBob3N0bmFtZSwgcHJvdG9jb2wsIGhvb2tQYXRoLCBjaGVja1BhdGgsIGhvb2tTZWNyZXQgfSA9IHdlYjtcbiAgbG9nZ2VyLmluZm8oXG4gICAgYGdpdGh1YiBob29rIGxpc3RlbmVyIHN0YXJ0aW5nIGF0IGxvY2FsaG9zdDoke3BvcnR9JHtob29rUGF0aH1gLFxuICAgIGBjaGVjayBsaXN0ZW5lciBzdGFydGluZyBhdCBsb2NhbGhvc3Q6JHtwb3J0fSR7Y2hlY2tQYXRofWBcbiAgKTtcbiAgY29uc3QgYXBwID0gZXhwcmVzcygpO1xuICBjb25zdCBnaXRodWJIb29rcyA9IG5ldyBTdWJqZWN0KCk7XG4gIGNvbnN0IGNoZWNrUmVxdWVzdHMgPSBuZXcgU3ViamVjdCgpO1xuICBhcHAudXNlKHRleHQoeyB0eXBlOiAnKi8qJyB9KSk7XG4gIGFwcC5nZXQoJy8nLCAocmVxLCByZXMsIG5leHQpID0+IHJlcy5zZW5kKCdJXFwnbSBsaXN0ZW5pbmcuJykpO1xuICBhcHAucG9zdChob29rUGF0aCwgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgbGV0IGhtYWMgPSBjcmVhdGVIbWFjKCdzaGExJywgaG9va1NlY3JldCk7XG4gICAgaG1hYy51cGRhdGUocmVxLmJvZHkpO1xuICAgIGxldCBzaWcgPSByZXEuZ2V0KCdYLUh1Yi1TaWduYXR1cmUnKTtcbiAgICBsZXQgdmFsaWQgPSBzaWcgJiYgaG1hYy5kaWdlc3QoJ2hleCcpID09PSBzaWcuc2xpY2Uoc2lnLmluZGV4T2YoJz0nKSsxKTtcbiAgICBsb2dnZXJbdmFsaWQgPyAnbm90aWNlJyA6ICd3YXJuaW5nJ10oXG4gICAgICB2YWxpZCA/ICdSZWNlaXZlZCB2YWxpZCB3ZWJob29rLicgOlxuICAgICAgICAgICdXZWJob29rIHJlcXVlc3QgZGlkIG5vdCB2YWxpZGF0ZSB3aXRoIHNlY3VyZSBzaWduYXR1cmUuJyxcbiAgICAgICAgICBzaWdcbiAgICApO1xuICAgIHJlcy5zdGF0dXMoMjAwKS5zZW5kKCdUaGFua3MhIEJhdGhlIGluIHNsYWNrLicpO1xuICAgIGlmICh2YWxpZCkge1xuICAgICAgZ2l0aHViSG9va3Mub25OZXh0KHtcbiAgICAgICAgcmVxLFxuICAgICAgICBldmVudDogcmVxLmdldCgnWC1HaXRIdWItRXZlbnQnKSxcbiAgICAgICAgZGF0YTogSlNPTi5wYXJzZShyZXEuYm9keSlcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG4gIGFwcC5nZXQoY2hlY2tQYXRoLCAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICBjaGVja1JlcXVlc3RzLm9uTmV4dCh7XG4gICAgICByZXBseTogKHN0YXR1cywgcmVzcG9uc2UpID0+IHJlcy5zdGF0dXMoc3RhdHVzKS5qc29uKHJlc3BvbnNlKSxcbiAgICAgIC4uLnJlcS5xdWVyeVxuICAgIH0pO1xuICB9KVxuXG4gIGxldCBzZXJ2ZXIgPSBhcHAubGlzdGVuKHBvcnQsIGVuc3VyZUhvb2tFeGlzdHNGb3JIb3N0KTtcblxuICByZXR1cm4geyBzZXJ2ZXIsIGdpdGh1Ykhvb2tzLCBjaGVja1JlcXVlc3RzIH07XG5cbiAgZnVuY3Rpb24gZ2V0T3JDcmVhdGVIb29rKGhvc3QpIHtcbiAgICBjb25zdCB1cmwgPSBgJHtwcm90b2NvbH0vLyR7aG9zdH06JHtwb3J0fSR7aG9va1BhdGh9YCA7XG4gICAgcmV0dXJuIGdpdGh1YkNsaWVudCgnZ2V0JywgYC9vcmdzLyR7Z2l0aHViLm9yZ30vaG9va3NgKVxuICAgIC5jb25jYXRNYXAoKGhvb2tzKSA9PiB7XG4gICAgICBjb25zdCBvdXJIb29rID0gaG9va3MuZmluZCgoeyBuYW1lLCBldmVudHMsIGNvbmZpZywgYWN0aXZlIH0pID0+XG4gICAgICAgIGFjdGl2ZSAmJlxuICAgICAgICBuYW1lID09PSAnd2ViJyAmJlxuICAgICAgICAofmV2ZW50cy5pbmRleE9mKCdzdGF0dXMnKSB8fCB+ZXZlbnRzLmluZGV4T2YoJyonKSkgJiZcbiAgICAgICAgY29uZmlnLnVybCA9PT0gdXJsICYmXG4gICAgICAgIGNvbmZpZy5jb250ZW50X3R5cGUgPT09ICdqc29uJ1xuICAgICAgKTtcbiAgICAgIGlmIChvdXJIb29rKSB7XG4gICAgICAgIGxvZ2dlci5pbmZvKCdXZWJob29rIGFscmVhZHkgZXhpc3RzJyk7XG4gICAgICAgIHJldHVybiBPYnNlcnZhYmxlLmp1c3Qob3VySG9vayk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2dnZXIubm90aWNlKCdXZWJob29rIGRvZXMgbm90IGV4aXN0LiBBdHRlbXB0aW5nIHRvIGNyZWF0ZS4uLicpO1xuICAgICAgICByZXR1cm4gZ2l0aHViQ2xpZW50KFxuICAgICAgICAgICdwb3N0JyxcbiAgICAgICAgICBgL29yZ3MvJHtnaXRodWIub3JnfS9ob29rc2AsXG4gICAgICAgICAge1xuICAgICAgICAgICAgbmFtZTogJ3dlYicsXG4gICAgICAgICAgICBldmVudHM6IFsnc3RhdHVzJ10sXG4gICAgICAgICAgICBjb25maWc6IHsgdXJsLCBjb250ZW50X3R5cGU6ICdqc29uJywgc2VjcmV0OiBob29rU2VjcmV0IH0sXG4gICAgICAgICAgICBhY3RpdmU6IHRydWVcbiAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRIb3N0KCkge1xuICAgIHJldHVybiB3ZWIuaG9zdG5hbWUgPyBPYnNlcnZhYmxlLmp1c3Qod2ViLmhvc3RuYW1lKSA6XG4gICAgICBPYnNlcnZhYmxlLmZyb21Ob2RlQ2FsbGJhY2soXG4gICAgICAgIHB1YmxpY0lwLnY0LCBwdWJsaWNJcFxuICAgICAgKSgpXG4gIH1cblxuICBmdW5jdGlvbiBlbnN1cmVIb29rRXhpc3RzRm9ySG9zdCgpIHtcbiAgICBnZXRIb3N0KCkuY29uY2F0TWFwKGdldE9yQ3JlYXRlSG9vaykuc3Vic2NyaWJlKFxuICAgICAgKHsgdXJsLCBldmVudHMsIGNvbmZpZyB9KSA9PiBsb2dnZXIubm90aWNlKFxuICAgICAgICBgV2ViaG9vayAke3VybH0gaXMgc2V0IHVwIHRvIHBvc3QgJHtldmVudHN9IGV2ZW50cyB0byAke2NvbmZpZy51cmx9YFxuICAgICAgKSxcbiAgICAgIGxvZ2dlci5lcnJvclxuICAgICk7XG4gIH1cbn07XG4iXX0=
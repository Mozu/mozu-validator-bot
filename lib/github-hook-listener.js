'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (_ref) {
  let logger = _ref.logger;
  let port = _ref.port;
  let hookPath = _ref.hookPath;
  let hookSecret = _ref.hookSecret;

  logger.info(`github hook listener starting at localhost:${ port }${ hookPath }`);
  const app = (0, _express2.default)();
  const incoming = new _rx.Subject();
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
      incoming.onNext({
        req,
        event: req.get('X-GitHub-Event'),
        data: JSON.parse(req.body)
      });
    }
  });
  let server = app.listen(port);
  return { server, incoming };
};

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _rx = require('rx');

var _bodyParser = require('body-parser');

var _crypto = require('crypto');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

;
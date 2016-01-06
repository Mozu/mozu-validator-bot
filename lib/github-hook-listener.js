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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9naXRodWItaG9vay1saXN0ZW5lci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7a0JBSWUsZ0JBQWlEO01BQXRDLE1BQU0sUUFBTixNQUFNO01BQUUsSUFBSSxRQUFKLElBQUk7TUFBRSxRQUFRLFFBQVIsUUFBUTtNQUFFLFVBQVUsUUFBVixVQUFVOztBQUMxRCxRQUFNLENBQUMsSUFBSSxDQUNULENBQUMsMkNBQTJDLEdBQUUsSUFBSSxFQUFDLEdBQUUsUUFBUSxFQUFDLENBQUMsQ0FDaEUsQ0FBQztBQUNGLFFBQU0sR0FBRyxHQUFHLHdCQUFTLENBQUM7QUFDdEIsUUFBTSxRQUFRLEdBQUcsUUFSVixPQUFPLEVBUWdCLENBQUM7QUFDL0IsS0FBRyxDQUFDLEdBQUcsQ0FBQyxnQkFSRCxJQUFJLEVBUUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQy9CLEtBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7QUFDOUQsS0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksS0FBSztBQUNyQyxRQUFJLElBQUksR0FBRyxZQVZOLFVBQVUsRUFVTyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFDMUMsUUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDdEIsUUFBSSxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQ3JDLFFBQUksS0FBSyxHQUFHLEdBQUcsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RSxVQUFNLENBQUMsS0FBSyxHQUFHLFFBQVEsR0FBRyxTQUFTLENBQUMsQ0FDbEMsS0FBSyxHQUFHLHlCQUF5QixHQUM3Qix5REFBeUQsRUFDekQsR0FBRyxDQUNSLENBQUM7QUFDRixPQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0FBQ2hELFFBQUksS0FBSyxFQUFFO0FBQ1QsY0FBUSxDQUFDLE1BQU0sQ0FBQztBQUNkLFdBQUc7QUFDSCxhQUFLLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQztBQUNoQyxZQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO09BQzNCLENBQUMsQ0FBQztLQUNKO0dBQ0YsQ0FBQyxDQUFDO0FBQ0gsTUFBSSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM5QixTQUFPLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxDQUFDO0NBQzdCOzs7Ozs7Ozs7Ozs7OztBQUFBLENBQUMiLCJmaWxlIjoiZ2l0aHViLWhvb2stbGlzdGVuZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZXhwcmVzcyBmcm9tICdleHByZXNzJztcbmltcG9ydCB7IFN1YmplY3QgfSBmcm9tICdyeCc7XG5pbXBvcnQgeyB0ZXh0IH0gZnJvbSAnYm9keS1wYXJzZXInO1xuaW1wb3J0IHsgY3JlYXRlSG1hYyB9IGZyb20gJ2NyeXB0byc7XG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih7IGxvZ2dlciwgcG9ydCwgaG9va1BhdGgsIGhvb2tTZWNyZXQgfSkge1xuICBsb2dnZXIuaW5mbyhcbiAgICBgZ2l0aHViIGhvb2sgbGlzdGVuZXIgc3RhcnRpbmcgYXQgbG9jYWxob3N0OiR7cG9ydH0ke2hvb2tQYXRofWBcbiAgKTtcbiAgY29uc3QgYXBwID0gZXhwcmVzcygpO1xuICBjb25zdCBpbmNvbWluZyA9IG5ldyBTdWJqZWN0KCk7XG4gIGFwcC51c2UodGV4dCh7IHR5cGU6ICcqLyonIH0pKTtcbiAgYXBwLmdldCgnLycsIChyZXEsIHJlcywgbmV4dCkgPT4gcmVzLnNlbmQoJ0lcXCdtIGxpc3RlbmluZy4nKSk7XG4gIGFwcC5wb3N0KGhvb2tQYXRoLCAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICBsZXQgaG1hYyA9IGNyZWF0ZUhtYWMoJ3NoYTEnLCBob29rU2VjcmV0KTtcbiAgICBobWFjLnVwZGF0ZShyZXEuYm9keSk7XG4gICAgbGV0IHNpZyA9IHJlcS5nZXQoJ1gtSHViLVNpZ25hdHVyZScpO1xuICAgIGxldCB2YWxpZCA9IHNpZyAmJiBobWFjLmRpZ2VzdCgnaGV4JykgPT09IHNpZy5zbGljZShzaWcuaW5kZXhPZignPScpKzEpO1xuICAgIGxvZ2dlclt2YWxpZCA/ICdub3RpY2UnIDogJ3dhcm5pbmcnXShcbiAgICAgIHZhbGlkID8gJ1JlY2VpdmVkIHZhbGlkIHdlYmhvb2suJyA6XG4gICAgICAgICAgJ1dlYmhvb2sgcmVxdWVzdCBkaWQgbm90IHZhbGlkYXRlIHdpdGggc2VjdXJlIHNpZ25hdHVyZS4nLFxuICAgICAgICAgIHNpZ1xuICAgICk7XG4gICAgcmVzLnN0YXR1cygyMDApLnNlbmQoJ1RoYW5rcyEgQmF0aGUgaW4gc2xhY2suJyk7XG4gICAgaWYgKHZhbGlkKSB7XG4gICAgICBpbmNvbWluZy5vbk5leHQoe1xuICAgICAgICByZXEsXG4gICAgICAgIGV2ZW50OiByZXEuZ2V0KCdYLUdpdEh1Yi1FdmVudCcpLFxuICAgICAgICBkYXRhOiBKU09OLnBhcnNlKHJlcS5ib2R5KVxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbiAgbGV0IHNlcnZlciA9IGFwcC5saXN0ZW4ocG9ydCk7XG4gIHJldHVybiB7IHNlcnZlciwgaW5jb21pbmcgfTtcbn07XG4iXX0=
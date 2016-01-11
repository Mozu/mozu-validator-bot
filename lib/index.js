'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _util = require('util');

var _rx = require('rx');

var _rx2 = _interopRequireDefault(_rx);

var _botkit = require('botkit');

var _conf = require('./conf');

var _conf2 = _interopRequireDefault(_conf);

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _githubClient = require('./github-client');

var _githubClient2 = _interopRequireDefault(_githubClient);

var _npmClient = require('./npm-client');

var _npmClient2 = _interopRequireDefault(_npmClient);

var _frivolity = require('./frivolity');

var _frivolity2 = _interopRequireDefault(_frivolity);

var _incomingRequests = require('./incoming-requests');

var _incomingRequests2 = _interopRequireDefault(_incomingRequests);

var _formatting = require('./formatting');

var _ciCheck = require('./ci-check');

var _statusMonitors = require('./status-monitors');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const logLevel = _conf2.default.logLevel;
const ciProviders = _conf2.default.ciProviders;
const github = _conf2.default.github;
const slack = _conf2.default.slack;
const statusChannel = _conf2.default.statusChannel;

if (logLevel > 5) _rx2.default.config.longStackSupport = true;

const logger = (0, _logger2.default)(_conf2.default);
const githubClient = (0, _githubClient2.default)(_extends({ logger }, _conf2.default));
const npmClient = (0, _npmClient2.default)(_extends({ logger }, _conf2.default));
const botController = (0, _botkit.slackbot)({ logger });
const incoming = (0, _incomingRequests2.default)(_extends({ logger, githubClient }, _conf2.default));
const bot = botController.spawn(slack).startRTM();
const dobbs = (0, _frivolity2.default)(_conf2.default, botController);

let successfulBuilds$ = (0, _statusMonitors.filterForBuildSuccess)({
  events$: incoming.githubHooks,
  logger,
  githubClient,
  github
});

successfulBuilds$.subscribe(_ref => {
  let repository = _ref.repository;
  let sha = _ref.sha;
  let tag = _ref.tag;

  let name = repository.name;
  logger.notice('gonna notify CI success on tag', name, sha);
  bot.sendWebhook(_extends({
    channel: statusChannel,
    attachments: [{
      color: _formatting.colors.success,
      fallback: `${ name } ${ tag.name } ready for publish.`,
      pretext: `npm package build success for \`${ name }\`!`,
      title: `${ tag.name } of the ${ name } package is ready to be ` + `published to NPM.`,
      text: `When publishing, be sure your local repository is at ` + `that exact version: \`git checkout ${ tag.name } && npm ` + `publish\`.`,
      fields: Object.keys(tag).map(k => {
        let stringValue = typeof tag[k] === 'string' ? tag[k] : JSON.stringify(tag[k]);
        return {
          title: k,
          value: stringValue,
          short: stringValue.length < 20
        };
      }),
      mrkdwn_in: ['pretext', 'text']
    }]
  }, _formatting.formats.success));
}, logger.error);

dobbs.hears(['status ([A-Za-z0-9\-\.\_]+)(?: ([A-Za-z0-9\-\/\_]+))?'], ['direct_mention'], (dobbs, msg) => {
  let packageName = msg.match[1];
  let branch = msg.match[2] || 'master';
  logger.info('package status requested', packageName, msg);

  let packageStatus$ = (0, _statusMonitors.getPackageStatus)({
    packageName,
    branch,
    githubClient,
    github,
    npmClient,
    ciProviders
  });

  packageStatus$.subscribe(data => {
    let status = (0, _formatting.formatPackageStatus)(_extends({ packageName, branch }, data));
    dobbs.reply(msg, _extends({
      text: `Status for \`${ packageName }\``,
      attachments: [{
        color: status.good ? _formatting.colors.success : _formatting.colors.error,
        title: status.title || (status.good ? 'Good News!' : 'Keep Calm!'),
        text: status.text,
        fields: Object.keys(status.fields).map(k => ({
          title: k,
          value: status.fields[k],
          short: status.fields[k].length < 40
        })),
        mrkdwn_in: ['text', 'fields']
      }],
      mrkdwn_in: ['text', 'fields']
    }, _formatting.formats.standard));
  }, e => {
    logger.error('status check failed', e);
    let reply = _extends({}, _formatting.formats.error);
    if (e.statusCode === 404 && e.headers && e.headers.server === 'GitHub.com') {
      reply.text = `Could not find \`${ packageName }\` in the ` + `\`${ github.org }\` GitHub organization. Is it private? _Does ` + `it even exist?_`;
    } else {
      reply.text = `Boy, I had a doozy of a time trying to do that. Here ` + `is the error.`;
      reply.attachments = [{
        color: _formatting.colors.error,
        title: e.message,
        text: '```\n' + (0, _util.inspect)(e) + '\n```',
        fields: [{
          title: 'Stack trace',
          value: '```\n' + e.stack + '\n```',
          short: false
        }],
        mrkdwn_in: ['text', 'fields']
      }];
      console.log(e.stack);
    }
    dobbs.reply(msg, reply);
  });
});

incoming.checkRequests.subscribe(_ref2 => {
  let reply = _ref2.reply;
  let name = _ref2.name;
  var _ref2$branch = _ref2.branch;
  let branch = _ref2$branch === undefined ? 'master' : _ref2$branch;
  return (0, _statusMonitors.getPackageStatus)(name, branch).subscribe(d => reply(200, d), e => reply(400, e));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztNQWFRLFFBQVEsa0JBQVIsUUFBUTtNQUFFLFdBQVcsa0JBQVgsV0FBVztNQUFFLE1BQU0sa0JBQU4sTUFBTTtNQUFFLEtBQUssa0JBQUwsS0FBSztNQUFFLGFBQWEsa0JBQWIsYUFBYTs7QUFFM0QsSUFBSSxRQUFRLEdBQUcsQ0FBQyxFQUFFLGFBQUcsTUFBTSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQzs7QUFFcEQsTUFBTSxNQUFNLEdBQUcscUNBQVksQ0FBQztBQUM1QixNQUFNLFlBQVksR0FBRyx1Q0FBZSxNQUFNLG9CQUFZLENBQUM7QUFDdkQsTUFBTSxTQUFTLEdBQUcsb0NBQVksTUFBTSxvQkFBWSxDQUFDO0FBQ2pELE1BQU0sYUFBYSxHQUFHLFlBbEJiLFFBQVEsRUFrQmMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBQzNDLE1BQU0sUUFBUSxHQUFHLDJDQUFtQixNQUFNLEVBQUUsWUFBWSxvQkFBVyxDQUFDO0FBQ3BFLE1BQU0sR0FBRyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7QUFDbEQsTUFBTSxLQUFLLEdBQUcseUNBQWdCLGFBQWEsQ0FBQyxDQUFDOztBQUU3QyxJQUFJLGlCQUFpQixHQUFHLG9CQWRmLHFCQUFxQixFQWNnQjtBQUM1QyxTQUFPLEVBQUUsUUFBUSxDQUFDLFdBQVc7QUFDN0IsUUFBTTtBQUNOLGNBQVk7QUFDWixRQUFNO0NBQ1AsQ0FBQyxDQUFDOztBQUVILGlCQUFpQixDQUFDLFNBQVMsQ0FDekIsUUFBOEI7TUFBM0IsVUFBVSxRQUFWLFVBQVU7TUFBRSxHQUFHLFFBQUgsR0FBRztNQUFFLEdBQUcsUUFBSCxHQUFHOztBQUNyQixNQUFJLElBQUksR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDO0FBQzNCLFFBQU0sQ0FBQyxNQUFNLENBQ1gsZ0NBQWdDLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FDNUMsQ0FBQztBQUNGLEtBQUcsQ0FBQyxXQUFXO0FBQ2IsV0FBTyxFQUFFLGFBQWE7QUFDdEIsZUFBVyxFQUFFLENBQ1g7QUFDRSxXQUFLLEVBQUUsWUFqQ1IsTUFBTSxDQWlDUyxPQUFPO0FBQ3JCLGNBQVEsRUFBRSxDQUFDLEdBQUUsSUFBSSxFQUFDLENBQUMsR0FBRSxHQUFHLENBQUMsSUFBSSxFQUFDLG1CQUFtQixDQUFDO0FBQ2xELGFBQU8sRUFBRSxDQUFDLGdDQUFnQyxHQUFFLElBQUksRUFBQyxHQUFHLENBQUM7QUFDckQsV0FBSyxFQUFFLENBQUMsR0FBRSxHQUFHLENBQUMsSUFBSSxFQUFDLFFBQVEsR0FBRSxJQUFJLEVBQUMsd0JBQXdCLENBQUMsR0FDekQsQ0FBQyxpQkFBaUIsQ0FBQztBQUNuQixVQUFJLEVBQUUsQ0FBQyxxREFBcUQsQ0FBQyxHQUM3RCxDQUFDLG1DQUFtQyxHQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUMsUUFBUSxDQUFDLEdBQ3hELENBQUMsVUFBVSxDQUFDO0FBQ2QsWUFBTSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEFBQUMsQ0FBQyxJQUFLO0FBQ2xDLFlBQUksV0FBVyxHQUFHLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLFFBQVEsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQ2pELElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0IsZUFBTztBQUNMLGVBQUssRUFBRSxDQUFDO0FBQ1IsZUFBSyxFQUFFLFdBQVc7QUFDbEIsZUFBSyxFQUFFLFdBQVcsQ0FBQyxNQUFNLEdBQUcsRUFBRTtTQUMvQixDQUFDO09BQ0gsQ0FBQztBQUNGLGVBQVMsRUFBRSxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUM7S0FDL0IsQ0FDRjtLQUNFLFlBckRRLE9BQU8sQ0FxRFAsT0FBTyxFQUNsQixDQUFDO0NBQ0osRUFDRCxNQUFNLENBQUMsS0FBSyxDQUNiLENBQUM7O0FBRUYsS0FBSyxDQUFDLEtBQUssQ0FDVCxDQUFDLHVEQUF1RCxDQUFDLEVBQ3pELENBQUMsZ0JBQWdCLENBQUMsRUFDbEIsQ0FBQyxLQUFLLEVBQUUsR0FBRyxLQUFLO0FBQ2QsTUFBSSxXQUFXLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvQixNQUFJLE1BQU0sR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLFFBQVEsQ0FBQztBQUN0QyxRQUFNLENBQUMsSUFBSSxDQUFDLDBCQUEwQixFQUFFLFdBQVcsRUFBRSxHQUFHLENBQUMsQ0FBQzs7QUFFMUQsTUFBSSxjQUFjLEdBQUcsb0JBakVPLGdCQUFnQixFQWlFTjtBQUNwQyxlQUFXO0FBQ1gsVUFBTTtBQUNOLGdCQUFZO0FBQ1osVUFBTTtBQUNOLGFBQVM7QUFDVCxlQUFXO0dBQ1osQ0FBQyxDQUFDOztBQUVILGdCQUFjLENBQUMsU0FBUyxDQUFDLEFBQUMsSUFBSSxJQUFLO0FBQ2pDLFFBQUksTUFBTSxHQUFHLGdCQTdFTyxtQkFBbUIsYUE4RW5DLFdBQVcsRUFBRSxNQUFNLElBQUssSUFBSSxFQUMvQixDQUFDO0FBQ0YsU0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHO0FBQ2IsVUFBSSxFQUFFLENBQUMsYUFBYSxHQUFFLFdBQVcsRUFBQyxFQUFFLENBQUM7QUFDckMsaUJBQVcsRUFBRSxDQUFDO0FBQ1osYUFBSyxFQUFFLE1BQU0sQ0FBQyxJQUFJLEdBQUcsWUFuRnRCLE1BQU0sQ0FtRnVCLE9BQU8sR0FBRyxZQW5GdkMsTUFBTSxDQW1Gd0MsS0FBSztBQUNsRCxhQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUssS0FBSyxNQUFNLENBQUMsSUFBSSxHQUFHLFlBQVksR0FBRyxZQUFZLENBQUEsQUFBQztBQUNsRSxZQUFJLEVBQUUsTUFBTSxDQUFDLElBQUk7QUFDakIsY0FBTSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxBQUFDLENBQUMsS0FBTTtBQUM3QyxlQUFLLEVBQUUsQ0FBQztBQUNSLGVBQUssRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUN2QixlQUFLLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsRUFBRTtTQUNwQyxDQUFDLENBQUM7QUFDSCxpQkFBUyxFQUFFLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQztPQUM5QixDQUFDO0FBQ0YsZUFBUyxFQUFFLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQztPQUMxQixZQTlGTSxPQUFPLENBOEZMLFFBQVEsRUFDbkIsQ0FBQztHQUNKLEVBQ0QsQUFBQyxDQUFDLElBQUs7QUFDTCxVQUFNLENBQUMsS0FBSyxDQUFDLHFCQUFxQixFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3ZDLFFBQUksS0FBSyxnQkFBTyxZQW5HTCxPQUFPLENBbUdNLEtBQUssQ0FBQyxDQUFDO0FBQy9CLFFBQUksQ0FBQyxDQUFDLFVBQVUsS0FBSyxHQUFHLElBQ3BCLENBQUMsQ0FBQyxPQUFPLElBQ1QsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEtBQUssWUFBWSxFQUFFO0FBQ3JDLFdBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxpQkFBaUIsR0FBRSxXQUFXLEVBQUMsVUFBVSxDQUFDLEdBQ3RELENBQUMsRUFBRSxHQUFFLE1BQU0sQ0FBQyxHQUFHLEVBQUMsNkNBQTZDLENBQUMsR0FDOUQsQ0FBQyxlQUFlLENBQUMsQ0FBQztLQUNyQixNQUFNO0FBQ0wsV0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLHFEQUFxRCxDQUFDLEdBQ2xFLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDbEIsV0FBSyxDQUFDLFdBQVcsR0FBRyxDQUNsQjtBQUNFLGFBQUssRUFBRSxZQS9HVixNQUFNLENBK0dXLEtBQUs7QUFDbkIsYUFBSyxFQUFFLENBQUMsQ0FBQyxPQUFPO0FBQ2hCLFlBQUksRUFBRSxPQUFPLEdBQUcsVUExSG5CLE9BQU8sRUEwSG9CLENBQUMsQ0FBQyxHQUFHLE9BQU87QUFDcEMsY0FBTSxFQUFFLENBQ047QUFDRSxlQUFLLEVBQUUsYUFBYTtBQUNwQixlQUFLLEVBQUUsT0FBTyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsT0FBTztBQUNsQyxlQUFLLEVBQUUsS0FBSztTQUNiLENBQ0Y7QUFDRCxpQkFBUyxFQUFFLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQztPQUM5QixDQUNGLENBQUM7QUFDRixhQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUN0QjtBQUNELFNBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO0dBQ3pCLENBQUMsQ0FBQztDQUNKLENBQ0YsQ0FBQzs7QUFFRixRQUFRLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FDOUI7TUFBRyxLQUFLLFNBQUwsS0FBSztNQUFFLElBQUksU0FBSixJQUFJOzJCQUFFLE1BQU07TUFBTixNQUFNLGdDQUFHLFFBQVE7U0FDL0Isb0JBbkk0QixnQkFBZ0IsRUFtSTNCLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQ3RDLEFBQUMsQ0FBQyxJQUFLLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQ3BCLEFBQUMsQ0FBQyxJQUFLLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQ3JCO0NBQUEsQ0FDSixDQUFDIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgaW5zcGVjdCB9IGZyb20gJ3V0aWwnO1xuaW1wb3J0IFJ4IGZyb20gJ3J4JztcbmltcG9ydCB7IHNsYWNrYm90IH0gZnJvbSAnYm90a2l0JztcbmltcG9ydCBjb25mIGZyb20gJy4vY29uZic7XG5pbXBvcnQgTG9nZ2VyIGZyb20gJy4vbG9nZ2VyJztcbmltcG9ydCBHaXRodWJDbGllbnQgZnJvbSAnLi9naXRodWItY2xpZW50JztcbmltcG9ydCBOcG1DbGllbnQgZnJvbSAnLi9ucG0tY2xpZW50JztcbmltcG9ydCBmcml2b2xpdHkgZnJvbSAnLi9mcml2b2xpdHknO1xuaW1wb3J0IEluY29taW5nUmVxdWVzdHMgZnJvbSAnLi9pbmNvbWluZy1yZXF1ZXN0cyc7XG5pbXBvcnQgeyBjb2xvcnMsIGZvcm1hdHMsIGZvcm1hdFBhY2thZ2VTdGF0dXMgfSBmcm9tICcuL2Zvcm1hdHRpbmcnO1xuaW1wb3J0IHsgYWxsQ2lTdWNjZWVkZWQgfSBmcm9tICcuL2NpLWNoZWNrJztcbmltcG9ydCB7IGZpbHRlckZvckJ1aWxkU3VjY2VzcywgZ2V0UGFja2FnZVN0YXR1cyB9IGZyb20gJy4vc3RhdHVzLW1vbml0b3JzJztcblxuY29uc3QgeyBsb2dMZXZlbCwgY2lQcm92aWRlcnMsIGdpdGh1Yiwgc2xhY2ssIHN0YXR1c0NoYW5uZWwgfSA9IGNvbmY7XG5cbmlmIChsb2dMZXZlbCA+IDUpIFJ4LmNvbmZpZy5sb25nU3RhY2tTdXBwb3J0ID0gdHJ1ZTtcblxuY29uc3QgbG9nZ2VyID0gTG9nZ2VyKGNvbmYpO1xuY29uc3QgZ2l0aHViQ2xpZW50ID0gR2l0aHViQ2xpZW50KHsgbG9nZ2VyLCAuLi5jb25mIH0pO1xuY29uc3QgbnBtQ2xpZW50ID0gTnBtQ2xpZW50KHsgbG9nZ2VyLCAuLi5jb25mIH0pO1xuY29uc3QgYm90Q29udHJvbGxlciA9IHNsYWNrYm90KHsgbG9nZ2VyIH0pO1xuY29uc3QgaW5jb21pbmcgPSBJbmNvbWluZ1JlcXVlc3RzKHsgbG9nZ2VyLCBnaXRodWJDbGllbnQsIC4uLmNvbmZ9KTtcbmNvbnN0IGJvdCA9IGJvdENvbnRyb2xsZXIuc3Bhd24oc2xhY2spLnN0YXJ0UlRNKCk7XG5jb25zdCBkb2JicyA9IGZyaXZvbGl0eShjb25mLCBib3RDb250cm9sbGVyKTtcblxubGV0IHN1Y2Nlc3NmdWxCdWlsZHMkID0gZmlsdGVyRm9yQnVpbGRTdWNjZXNzKHtcbiAgZXZlbnRzJDogaW5jb21pbmcuZ2l0aHViSG9va3MsXG4gIGxvZ2dlcixcbiAgZ2l0aHViQ2xpZW50LFxuICBnaXRodWJcbn0pO1xuXG5zdWNjZXNzZnVsQnVpbGRzJC5zdWJzY3JpYmUoXG4gICh7IHJlcG9zaXRvcnksIHNoYSwgdGFnIH0pID0+IHtcbiAgICBsZXQgbmFtZSA9IHJlcG9zaXRvcnkubmFtZTtcbiAgICBsb2dnZXIubm90aWNlKFxuICAgICAgJ2dvbm5hIG5vdGlmeSBDSSBzdWNjZXNzIG9uIHRhZycsIG5hbWUsIHNoYVxuICAgICk7XG4gICAgYm90LnNlbmRXZWJob29rKHtcbiAgICAgIGNoYW5uZWw6IHN0YXR1c0NoYW5uZWwsXG4gICAgICBhdHRhY2htZW50czogW1xuICAgICAgICB7XG4gICAgICAgICAgY29sb3I6IGNvbG9ycy5zdWNjZXNzLFxuICAgICAgICAgIGZhbGxiYWNrOiBgJHtuYW1lfSAke3RhZy5uYW1lfSByZWFkeSBmb3IgcHVibGlzaC5gLFxuICAgICAgICAgIHByZXRleHQ6IGBucG0gcGFja2FnZSBidWlsZCBzdWNjZXNzIGZvciBcXGAke25hbWV9XFxgIWAsXG4gICAgICAgICAgdGl0bGU6IGAke3RhZy5uYW1lfSBvZiB0aGUgJHtuYW1lfSBwYWNrYWdlIGlzIHJlYWR5IHRvIGJlIGAgK1xuICAgICAgICAgICAgYHB1Ymxpc2hlZCB0byBOUE0uYCxcbiAgICAgICAgICAgIHRleHQ6IGBXaGVuIHB1Ymxpc2hpbmcsIGJlIHN1cmUgeW91ciBsb2NhbCByZXBvc2l0b3J5IGlzIGF0IGAgK1xuICAgICAgICAgICAgYHRoYXQgZXhhY3QgdmVyc2lvbjogXFxgZ2l0IGNoZWNrb3V0ICR7dGFnLm5hbWV9ICYmIG5wbSBgICtcbiAgICAgICAgICAgIGBwdWJsaXNoXFxgLmAsXG4gICAgICAgICAgZmllbGRzOiBPYmplY3Qua2V5cyh0YWcpLm1hcCgoaykgPT4ge1xuICAgICAgICAgICAgbGV0IHN0cmluZ1ZhbHVlID0gdHlwZW9mIHRhZ1trXSA9PT0gJ3N0cmluZycgPyB0YWdba10gOlxuICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHRhZ1trXSk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICB0aXRsZTogayxcbiAgICAgICAgICAgICAgdmFsdWU6IHN0cmluZ1ZhbHVlLFxuICAgICAgICAgICAgICBzaG9ydDogc3RyaW5nVmFsdWUubGVuZ3RoIDwgMjBcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSksXG4gICAgICAgICAgbXJrZHduX2luOiBbJ3ByZXRleHQnLCAndGV4dCddXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICAuLi5mb3JtYXRzLnN1Y2Nlc3NcbiAgICB9KTtcbiAgfSxcbiAgbG9nZ2VyLmVycm9yXG4pO1xuXG5kb2Jicy5oZWFycyhcbiAgWydzdGF0dXMgKFtBLVphLXowLTlcXC1cXC5cXF9dKykoPzogKFtBLVphLXowLTlcXC1cXC9cXF9dKykpPyddLFxuICBbJ2RpcmVjdF9tZW50aW9uJ10sXG4gIChkb2JicywgbXNnKSA9PiB7XG4gICAgbGV0IHBhY2thZ2VOYW1lID0gbXNnLm1hdGNoWzFdO1xuICAgIGxldCBicmFuY2ggPSBtc2cubWF0Y2hbMl0gfHwgJ21hc3Rlcic7XG4gICAgbG9nZ2VyLmluZm8oJ3BhY2thZ2Ugc3RhdHVzIHJlcXVlc3RlZCcsIHBhY2thZ2VOYW1lLCBtc2cpO1xuXG4gICAgbGV0IHBhY2thZ2VTdGF0dXMkID0gZ2V0UGFja2FnZVN0YXR1cyh7XG4gICAgICBwYWNrYWdlTmFtZSxcbiAgICAgIGJyYW5jaCxcbiAgICAgIGdpdGh1YkNsaWVudCxcbiAgICAgIGdpdGh1YixcbiAgICAgIG5wbUNsaWVudCxcbiAgICAgIGNpUHJvdmlkZXJzXG4gICAgfSk7XG5cbiAgICBwYWNrYWdlU3RhdHVzJC5zdWJzY3JpYmUoKGRhdGEpID0+IHtcbiAgICAgIGxldCBzdGF0dXMgPSBmb3JtYXRQYWNrYWdlU3RhdHVzKFxuICAgICAgICB7IHBhY2thZ2VOYW1lLCBicmFuY2gsIC4uLmRhdGF9XG4gICAgICApO1xuICAgICAgZG9iYnMucmVwbHkobXNnLCB7XG4gICAgICAgIHRleHQ6IGBTdGF0dXMgZm9yIFxcYCR7cGFja2FnZU5hbWV9XFxgYCxcbiAgICAgICAgYXR0YWNobWVudHM6IFt7XG4gICAgICAgICAgY29sb3I6IHN0YXR1cy5nb29kID8gY29sb3JzLnN1Y2Nlc3MgOiBjb2xvcnMuZXJyb3IsXG4gICAgICAgICAgdGl0bGU6IHN0YXR1cy50aXRsZSB8fCAoc3RhdHVzLmdvb2QgPyAnR29vZCBOZXdzIScgOiAnS2VlcCBDYWxtIScpLFxuICAgICAgICAgIHRleHQ6IHN0YXR1cy50ZXh0LFxuICAgICAgICAgIGZpZWxkczogT2JqZWN0LmtleXMoc3RhdHVzLmZpZWxkcykubWFwKChrKSA9PiAoe1xuICAgICAgICAgICAgdGl0bGU6IGssXG4gICAgICAgICAgICB2YWx1ZTogc3RhdHVzLmZpZWxkc1trXSxcbiAgICAgICAgICAgIHNob3J0OiBzdGF0dXMuZmllbGRzW2tdLmxlbmd0aCA8IDQwXG4gICAgICAgICAgfSkpLFxuICAgICAgICAgIG1ya2R3bl9pbjogWyd0ZXh0JywgJ2ZpZWxkcyddXG4gICAgICAgIH1dLFxuICAgICAgICBtcmtkd25faW46IFsndGV4dCcsICdmaWVsZHMnXSxcbiAgICAgICAgLi4uZm9ybWF0cy5zdGFuZGFyZFxuICAgICAgfSk7XG4gICAgfSxcbiAgICAoZSkgPT4ge1xuICAgICAgbG9nZ2VyLmVycm9yKCdzdGF0dXMgY2hlY2sgZmFpbGVkJywgZSk7XG4gICAgICBsZXQgcmVwbHkgPSB7Li4uZm9ybWF0cy5lcnJvcn07XG4gICAgICBpZiAoZS5zdGF0dXNDb2RlID09PSA0MDQgJiZcbiAgICAgICAgICBlLmhlYWRlcnMgJiZcbiAgICAgICAgICBlLmhlYWRlcnMuc2VydmVyID09PSAnR2l0SHViLmNvbScpIHtcbiAgICAgICAgcmVwbHkudGV4dCA9IGBDb3VsZCBub3QgZmluZCBcXGAke3BhY2thZ2VOYW1lfVxcYCBpbiB0aGUgYCArXG4gICAgICAgICAgYFxcYCR7Z2l0aHViLm9yZ31cXGAgR2l0SHViIG9yZ2FuaXphdGlvbi4gSXMgaXQgcHJpdmF0ZT8gX0RvZXMgYCArXG4gICAgICAgICAgYGl0IGV2ZW4gZXhpc3Q/X2A7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXBseS50ZXh0ID0gYEJveSwgSSBoYWQgYSBkb296eSBvZiBhIHRpbWUgdHJ5aW5nIHRvIGRvIHRoYXQuIEhlcmUgYCArXG4gICAgICAgICAgYGlzIHRoZSBlcnJvci5gO1xuICAgICAgICByZXBseS5hdHRhY2htZW50cyA9IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBjb2xvcjogY29sb3JzLmVycm9yLFxuICAgICAgICAgICAgdGl0bGU6IGUubWVzc2FnZSxcbiAgICAgICAgICAgIHRleHQ6ICdgYGBcXG4nICsgaW5zcGVjdChlKSArICdcXG5gYGAnLFxuICAgICAgICAgICAgZmllbGRzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0aXRsZTogJ1N0YWNrIHRyYWNlJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogJ2BgYFxcbicgKyBlLnN0YWNrICsgJ1xcbmBgYCcsXG4gICAgICAgICAgICAgICAgc2hvcnQ6IGZhbHNlXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBtcmtkd25faW46IFsndGV4dCcsICdmaWVsZHMnXVxuICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICAgICAgY29uc29sZS5sb2coZS5zdGFjayk7XG4gICAgICB9XG4gICAgICBkb2Jicy5yZXBseShtc2csIHJlcGx5KTtcbiAgICB9KTtcbiAgfVxuKTtcblxuaW5jb21pbmcuY2hlY2tSZXF1ZXN0cy5zdWJzY3JpYmUoXG4gICh7IHJlcGx5LCBuYW1lLCBicmFuY2ggPSAnbWFzdGVyJyB9KSA9PlxuICAgIGdldFBhY2thZ2VTdGF0dXMobmFtZSwgYnJhbmNoKS5zdWJzY3JpYmUoXG4gICAgICAoZCkgPT4gcmVwbHkoMjAwLCBkKSxcbiAgICAgIChlKSA9PiByZXBseSg0MDAsIGUpXG4gICAgKVxuKTtcbiJdfQ==
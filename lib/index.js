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

var _formatting2 = _interopRequireDefault(_formatting);

var _ciCheck = require('./ci-check');

var _statusMonitors = require('./status-monitors');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const logLevel = _conf2.default.logLevel;
const ciProviders = _conf2.default.ciProviders;
const github = _conf2.default.github;
const slack = _conf2.default.slack;
const statusChannel = _conf2.default.statusChannel;

if (logLevel > 5) _rx2.default.config.longStackSupport = true;

var _Formatter = (0, _formatting2.default)(_conf2.default);

const colors = _Formatter.colors;
const formats = _Formatter.formats;
const formatPackageStatus = _Formatter.formatPackageStatus;

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
  let originalStatus = _ref.originalStatus;
  let tag = _ref.tag;
  let sha = originalStatus.sha;
  let name = originalStatus.name;
  let commit = originalStatus.commit;
  let author = commit.author;

  logger.notice('gonna notify CI success on tag', originalStatus, tag);
  bot.sendWebhook(_extends({
    channel: statusChannel,
    attachments: [{
      fallback: `${ name } ${ tag.name } ready for publish.`,
      pretext: `Build success for \`${ name }\`!`,
      color: colors.success,
      author_name: author.login,
      author_icon: author.avatar_url,
      author_link: author.html_url,
      thumb_url: originalStatus.organization.avatar_url,
      title: `${ tag.name } of the ${ name } package is ready to be ` + `published to NPM.`,
      title_link: originalStatus.repository.html_url,
      text: `When publishing, be sure your local repository is at ` + `that exact version: \`git checkout ${ tag.name } && npm ` + `publish\`.`,
      mrkdwn_in: ['pretext', 'text']
    }]
  }, formats.success));
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
    let status = formatPackageStatus(_extends({ packageName, branch }, data));
    dobbs.reply(msg, _extends({
      text: `Status for \`${ packageName }\``,
      attachments: [{
        color: status.good ? colors.success : colors.error,
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
    }, formats.standard));
  }, e => {
    logger.error('status check failed', e);
    let reply = _extends({}, formats.error);
    if (e.statusCode === 404 && e.headers && e.headers.server === 'GitHub.com') {
      reply.text = `Could not find \`${ packageName }\` in the ` + `\`${ github.org }\` GitHub organization. Is it private? _Does ` + `it even exist?_`;
    } else {
      reply.text = `Boy, I had a doozy of a time trying to do that. Here ` + `is the error.`;
      reply.attachments = [{
        color: colors.error,
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
//# sourceMappingURL=data:application/json;base64,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QUUsQ0FDTjtBQUNFLGVBQUssRUFBRSxhQUFhO0FBQ3BCLGVBQUssRUFBRSxPQUFPLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxPQUFPO0FBQ2xDLGVBQUssRUFBRSxLQUFLO1NBQ2IsQ0FDRjtBQUNELGlCQUFTLEVBQUUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDO09BQzlCLENBQ0YsQ0FBQztBQUNGLGFBQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQ3RCO0FBQ0QsU0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7R0FDekIsQ0FBQyxDQUFDO0NBQ0osQ0FDRixDQUFDOztBQUVGLFFBQVEsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUM5QjtNQUFHLEtBQUssU0FBTCxLQUFLO01BQUUsSUFBSSxTQUFKLElBQUk7MkJBQUUsTUFBTTtNQUFOLE1BQU0sZ0NBQUcsUUFBUTtTQUMvQixvQkFqSTRCLGdCQUFnQixFQWlJM0IsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FDdEMsQUFBQyxDQUFDLElBQUssS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFDcEIsQUFBQyxDQUFDLElBQUssS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FDckI7Q0FBQSxDQUNKLENBQUMiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBpbnNwZWN0IH0gZnJvbSAndXRpbCc7XG5pbXBvcnQgUnggZnJvbSAncngnO1xuaW1wb3J0IHsgc2xhY2tib3QgfSBmcm9tICdib3RraXQnO1xuaW1wb3J0IGNvbmYgZnJvbSAnLi9jb25mJztcbmltcG9ydCBMb2dnZXIgZnJvbSAnLi9sb2dnZXInO1xuaW1wb3J0IEdpdGh1YkNsaWVudCBmcm9tICcuL2dpdGh1Yi1jbGllbnQnO1xuaW1wb3J0IE5wbUNsaWVudCBmcm9tICcuL25wbS1jbGllbnQnO1xuaW1wb3J0IGZyaXZvbGl0eSBmcm9tICcuL2ZyaXZvbGl0eSc7XG5pbXBvcnQgSW5jb21pbmdSZXF1ZXN0cyBmcm9tICcuL2luY29taW5nLXJlcXVlc3RzJztcbmltcG9ydCBGb3JtYXR0ZXIgZnJvbSAnLi9mb3JtYXR0aW5nJztcbmltcG9ydCB7IGFsbENpU3VjY2VlZGVkIH0gZnJvbSAnLi9jaS1jaGVjayc7XG5pbXBvcnQgeyBmaWx0ZXJGb3JCdWlsZFN1Y2Nlc3MsIGdldFBhY2thZ2VTdGF0dXMgfSBmcm9tICcuL3N0YXR1cy1tb25pdG9ycyc7XG5cbmNvbnN0IHsgbG9nTGV2ZWwsIGNpUHJvdmlkZXJzLCBnaXRodWIsIHNsYWNrLCBzdGF0dXNDaGFubmVsIH0gPSBjb25mO1xuXG5pZiAobG9nTGV2ZWwgPiA1KSBSeC5jb25maWcubG9uZ1N0YWNrU3VwcG9ydCA9IHRydWU7XG5cbmNvbnN0IHsgY29sb3JzLCBmb3JtYXRzLCBmb3JtYXRQYWNrYWdlU3RhdHVzIH0gPSBGb3JtYXR0ZXIoY29uZik7XG5jb25zdCBsb2dnZXIgPSBMb2dnZXIoY29uZik7XG5jb25zdCBnaXRodWJDbGllbnQgPSBHaXRodWJDbGllbnQoeyBsb2dnZXIsIC4uLmNvbmYgfSk7XG5jb25zdCBucG1DbGllbnQgPSBOcG1DbGllbnQoeyBsb2dnZXIsIC4uLmNvbmYgfSk7XG5jb25zdCBib3RDb250cm9sbGVyID0gc2xhY2tib3QoeyBsb2dnZXIgfSk7XG5jb25zdCBpbmNvbWluZyA9IEluY29taW5nUmVxdWVzdHMoeyBsb2dnZXIsIGdpdGh1YkNsaWVudCwgLi4uY29uZn0pO1xuY29uc3QgYm90ID0gYm90Q29udHJvbGxlci5zcGF3bihzbGFjaykuc3RhcnRSVE0oKTtcbmNvbnN0IGRvYmJzID0gZnJpdm9saXR5KGNvbmYsIGJvdENvbnRyb2xsZXIpO1xuXG5sZXQgc3VjY2Vzc2Z1bEJ1aWxkcyQgPSBmaWx0ZXJGb3JCdWlsZFN1Y2Nlc3Moe1xuICBldmVudHMkOiBpbmNvbWluZy5naXRodWJIb29rcyxcbiAgbG9nZ2VyLFxuICBnaXRodWJDbGllbnQsXG4gIGdpdGh1YlxufSk7XG5cbnN1Y2Nlc3NmdWxCdWlsZHMkLnN1YnNjcmliZShcbiAgKHsgb3JpZ2luYWxTdGF0dXMsIHRhZyB9KSA9PiB7XG4gICAgbGV0IHsgc2hhLCBuYW1lLCBjb21taXQgfSA9IG9yaWdpbmFsU3RhdHVzO1xuICAgIGxldCB7IGF1dGhvciB9ID0gY29tbWl0O1xuICAgIGxvZ2dlci5ub3RpY2UoXG4gICAgICAnZ29ubmEgbm90aWZ5IENJIHN1Y2Nlc3Mgb24gdGFnJywgb3JpZ2luYWxTdGF0dXMsIHRhZ1xuICAgICk7XG4gICAgYm90LnNlbmRXZWJob29rKHtcbiAgICAgIGNoYW5uZWw6IHN0YXR1c0NoYW5uZWwsXG4gICAgICBhdHRhY2htZW50czogW1xuICAgICAgICB7XG4gICAgICAgICAgZmFsbGJhY2s6IGAke25hbWV9ICR7dGFnLm5hbWV9IHJlYWR5IGZvciBwdWJsaXNoLmAsXG4gICAgICAgICAgcHJldGV4dDogYEJ1aWxkIHN1Y2Nlc3MgZm9yIFxcYCR7bmFtZX1cXGAhYCxcbiAgICAgICAgICBjb2xvcjogY29sb3JzLnN1Y2Nlc3MsXG4gICAgICAgICAgYXV0aG9yX25hbWU6IGF1dGhvci5sb2dpbixcbiAgICAgICAgICBhdXRob3JfaWNvbjogYXV0aG9yLmF2YXRhcl91cmwsXG4gICAgICAgICAgYXV0aG9yX2xpbms6IGF1dGhvci5odG1sX3VybCxcbiAgICAgICAgICB0aHVtYl91cmw6IG9yaWdpbmFsU3RhdHVzLm9yZ2FuaXphdGlvbi5hdmF0YXJfdXJsLFxuICAgICAgICAgIHRpdGxlOiBgJHt0YWcubmFtZX0gb2YgdGhlICR7bmFtZX0gcGFja2FnZSBpcyByZWFkeSB0byBiZSBgICtcbiAgICAgICAgICAgIGBwdWJsaXNoZWQgdG8gTlBNLmAsXG4gICAgICAgICAgdGl0bGVfbGluazogb3JpZ2luYWxTdGF0dXMucmVwb3NpdG9yeS5odG1sX3VybCxcbiAgICAgICAgICB0ZXh0OiBgV2hlbiBwdWJsaXNoaW5nLCBiZSBzdXJlIHlvdXIgbG9jYWwgcmVwb3NpdG9yeSBpcyBhdCBgICtcbiAgICAgICAgICBgdGhhdCBleGFjdCB2ZXJzaW9uOiBcXGBnaXQgY2hlY2tvdXQgJHt0YWcubmFtZX0gJiYgbnBtIGAgK1xuICAgICAgICAgIGBwdWJsaXNoXFxgLmAsXG4gICAgICAgICAgbXJrZHduX2luOiBbJ3ByZXRleHQnLCAndGV4dCddXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICAuLi5mb3JtYXRzLnN1Y2Nlc3NcbiAgICB9KTtcbiAgfSxcbiAgbG9nZ2VyLmVycm9yXG4pO1xuXG5kb2Jicy5oZWFycyhcbiAgWydzdGF0dXMgKFtBLVphLXowLTlcXC1cXC5cXF9dKykoPzogKFtBLVphLXowLTlcXC1cXC9cXF9dKykpPyddLFxuICBbJ2RpcmVjdF9tZW50aW9uJ10sXG4gIChkb2JicywgbXNnKSA9PiB7XG4gICAgbGV0IHBhY2thZ2VOYW1lID0gbXNnLm1hdGNoWzFdO1xuICAgIGxldCBicmFuY2ggPSBtc2cubWF0Y2hbMl0gfHwgJ21hc3Rlcic7XG4gICAgbG9nZ2VyLmluZm8oJ3BhY2thZ2Ugc3RhdHVzIHJlcXVlc3RlZCcsIHBhY2thZ2VOYW1lLCBtc2cpO1xuXG4gICAgbGV0IHBhY2thZ2VTdGF0dXMkID0gZ2V0UGFja2FnZVN0YXR1cyh7XG4gICAgICBwYWNrYWdlTmFtZSxcbiAgICAgIGJyYW5jaCxcbiAgICAgIGdpdGh1YkNsaWVudCxcbiAgICAgIGdpdGh1YixcbiAgICAgIG5wbUNsaWVudCxcbiAgICAgIGNpUHJvdmlkZXJzXG4gICAgfSk7XG5cbiAgICBwYWNrYWdlU3RhdHVzJC5zdWJzY3JpYmUoKGRhdGEpID0+IHtcbiAgICAgIGxldCBzdGF0dXMgPSBmb3JtYXRQYWNrYWdlU3RhdHVzKFxuICAgICAgICB7IHBhY2thZ2VOYW1lLCBicmFuY2gsIC4uLmRhdGF9XG4gICAgICApO1xuICAgICAgZG9iYnMucmVwbHkobXNnLCB7XG4gICAgICAgIHRleHQ6IGBTdGF0dXMgZm9yIFxcYCR7cGFja2FnZU5hbWV9XFxgYCxcbiAgICAgICAgYXR0YWNobWVudHM6IFt7XG4gICAgICAgICAgY29sb3I6IHN0YXR1cy5nb29kID8gY29sb3JzLnN1Y2Nlc3MgOiBjb2xvcnMuZXJyb3IsXG4gICAgICAgICAgdGl0bGU6IHN0YXR1cy50aXRsZSB8fCAoc3RhdHVzLmdvb2QgPyAnR29vZCBOZXdzIScgOiAnS2VlcCBDYWxtIScpLFxuICAgICAgICAgIHRleHQ6IHN0YXR1cy50ZXh0LFxuICAgICAgICAgIGZpZWxkczogT2JqZWN0LmtleXMoc3RhdHVzLmZpZWxkcykubWFwKChrKSA9PiAoe1xuICAgICAgICAgICAgdGl0bGU6IGssXG4gICAgICAgICAgICB2YWx1ZTogc3RhdHVzLmZpZWxkc1trXSxcbiAgICAgICAgICAgIHNob3J0OiBzdGF0dXMuZmllbGRzW2tdLmxlbmd0aCA8IDQwXG4gICAgICAgICAgfSkpLFxuICAgICAgICAgIG1ya2R3bl9pbjogWyd0ZXh0JywgJ2ZpZWxkcyddXG4gICAgICAgIH1dLFxuICAgICAgICBtcmtkd25faW46IFsndGV4dCcsICdmaWVsZHMnXSxcbiAgICAgICAgLi4uZm9ybWF0cy5zdGFuZGFyZFxuICAgICAgfSk7XG4gICAgfSxcbiAgICAoZSkgPT4ge1xuICAgICAgbG9nZ2VyLmVycm9yKCdzdGF0dXMgY2hlY2sgZmFpbGVkJywgZSk7XG4gICAgICBsZXQgcmVwbHkgPSB7Li4uZm9ybWF0cy5lcnJvcn07XG4gICAgICBpZiAoZS5zdGF0dXNDb2RlID09PSA0MDQgJiZcbiAgICAgICAgICBlLmhlYWRlcnMgJiZcbiAgICAgICAgICBlLmhlYWRlcnMuc2VydmVyID09PSAnR2l0SHViLmNvbScpIHtcbiAgICAgICAgcmVwbHkudGV4dCA9IGBDb3VsZCBub3QgZmluZCBcXGAke3BhY2thZ2VOYW1lfVxcYCBpbiB0aGUgYCArXG4gICAgICAgICAgYFxcYCR7Z2l0aHViLm9yZ31cXGAgR2l0SHViIG9yZ2FuaXphdGlvbi4gSXMgaXQgcHJpdmF0ZT8gX0RvZXMgYCArXG4gICAgICAgICAgYGl0IGV2ZW4gZXhpc3Q/X2A7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXBseS50ZXh0ID0gYEJveSwgSSBoYWQgYSBkb296eSBvZiBhIHRpbWUgdHJ5aW5nIHRvIGRvIHRoYXQuIEhlcmUgYCArXG4gICAgICAgICAgYGlzIHRoZSBlcnJvci5gO1xuICAgICAgICByZXBseS5hdHRhY2htZW50cyA9IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBjb2xvcjogY29sb3JzLmVycm9yLFxuICAgICAgICAgICAgdGl0bGU6IGUubWVzc2FnZSxcbiAgICAgICAgICAgIHRleHQ6ICdgYGBcXG4nICsgaW5zcGVjdChlKSArICdcXG5gYGAnLFxuICAgICAgICAgICAgZmllbGRzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0aXRsZTogJ1N0YWNrIHRyYWNlJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogJ2BgYFxcbicgKyBlLnN0YWNrICsgJ1xcbmBgYCcsXG4gICAgICAgICAgICAgICAgc2hvcnQ6IGZhbHNlXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBtcmtkd25faW46IFsndGV4dCcsICdmaWVsZHMnXVxuICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICAgICAgY29uc29sZS5sb2coZS5zdGFjayk7XG4gICAgICB9XG4gICAgICBkb2Jicy5yZXBseShtc2csIHJlcGx5KTtcbiAgICB9KTtcbiAgfVxuKTtcblxuaW5jb21pbmcuY2hlY2tSZXF1ZXN0cy5zdWJzY3JpYmUoXG4gICh7IHJlcGx5LCBuYW1lLCBicmFuY2ggPSAnbWFzdGVyJyB9KSA9PlxuICAgIGdldFBhY2thZ2VTdGF0dXMobmFtZSwgYnJhbmNoKS5zdWJzY3JpYmUoXG4gICAgICAoZCkgPT4gcmVwbHkoMjAwLCBkKSxcbiAgICAgIChlKSA9PiByZXBseSg0MDAsIGUpXG4gICAgKVxuKTtcbiJdfQ==
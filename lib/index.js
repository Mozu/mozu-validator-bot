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
  return (0, _statusMonitors.getPackageStatus)({
    packageName: name,
    branch,
    githubClient,
    github,
    npmClient,
    ciProviders
  }).subscribe(d => reply(200, d), e => reply(400, e));
});
//# sourceMappingURL=data:application/json;base64,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QUUsQ0FDTjtBQUNFLGVBQUssRUFBRSxhQUFhO0FBQ3BCLGVBQUssRUFBRSxPQUFPLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxPQUFPO0FBQ2xDLGVBQUssRUFBRSxLQUFLO1NBQ2IsQ0FDRjtBQUNELGlCQUFTLEVBQUUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDO09BQzlCLENBQ0YsQ0FBQztBQUNGLGFBQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQ3RCO0FBQ0QsU0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7R0FDekIsQ0FBQyxDQUFDO0NBQ0osQ0FDRixDQUFDOztBQUVGLFFBQVEsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUM5QjtNQUFHLEtBQUssU0FBTCxLQUFLO01BQUUsSUFBSSxTQUFKLElBQUk7MkJBQUUsTUFBTTtNQUFOLE1BQU0sZ0NBQUcsUUFBUTtTQUMvQixvQkFqSTRCLGdCQUFnQixFQWlJM0I7QUFDZixlQUFXLEVBQUUsSUFBSTtBQUNqQixVQUFNO0FBQ04sZ0JBQVk7QUFDWixVQUFNO0FBQ04sYUFBUztBQUNULGVBQVc7R0FDWixDQUFDLENBQUMsU0FBUyxDQUNWLEFBQUMsQ0FBQyxJQUFLLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQ3BCLEFBQUMsQ0FBQyxJQUFLLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQ3JCO0NBQUEsQ0FDSixDQUFDIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgaW5zcGVjdCB9IGZyb20gJ3V0aWwnO1xuaW1wb3J0IFJ4IGZyb20gJ3J4JztcbmltcG9ydCB7IHNsYWNrYm90IH0gZnJvbSAnYm90a2l0JztcbmltcG9ydCBjb25mIGZyb20gJy4vY29uZic7XG5pbXBvcnQgTG9nZ2VyIGZyb20gJy4vbG9nZ2VyJztcbmltcG9ydCBHaXRodWJDbGllbnQgZnJvbSAnLi9naXRodWItY2xpZW50JztcbmltcG9ydCBOcG1DbGllbnQgZnJvbSAnLi9ucG0tY2xpZW50JztcbmltcG9ydCBmcml2b2xpdHkgZnJvbSAnLi9mcml2b2xpdHknO1xuaW1wb3J0IEluY29taW5nUmVxdWVzdHMgZnJvbSAnLi9pbmNvbWluZy1yZXF1ZXN0cyc7XG5pbXBvcnQgRm9ybWF0dGVyIGZyb20gJy4vZm9ybWF0dGluZyc7XG5pbXBvcnQgeyBhbGxDaVN1Y2NlZWRlZCB9IGZyb20gJy4vY2ktY2hlY2snO1xuaW1wb3J0IHsgZmlsdGVyRm9yQnVpbGRTdWNjZXNzLCBnZXRQYWNrYWdlU3RhdHVzIH0gZnJvbSAnLi9zdGF0dXMtbW9uaXRvcnMnO1xuXG5jb25zdCB7IGxvZ0xldmVsLCBjaVByb3ZpZGVycywgZ2l0aHViLCBzbGFjaywgc3RhdHVzQ2hhbm5lbCB9ID0gY29uZjtcblxuaWYgKGxvZ0xldmVsID4gNSkgUnguY29uZmlnLmxvbmdTdGFja1N1cHBvcnQgPSB0cnVlO1xuXG5jb25zdCB7IGNvbG9ycywgZm9ybWF0cywgZm9ybWF0UGFja2FnZVN0YXR1cyB9ID0gRm9ybWF0dGVyKGNvbmYpO1xuY29uc3QgbG9nZ2VyID0gTG9nZ2VyKGNvbmYpO1xuY29uc3QgZ2l0aHViQ2xpZW50ID0gR2l0aHViQ2xpZW50KHsgbG9nZ2VyLCAuLi5jb25mIH0pO1xuY29uc3QgbnBtQ2xpZW50ID0gTnBtQ2xpZW50KHsgbG9nZ2VyLCAuLi5jb25mIH0pO1xuY29uc3QgYm90Q29udHJvbGxlciA9IHNsYWNrYm90KHsgbG9nZ2VyIH0pO1xuY29uc3QgaW5jb21pbmcgPSBJbmNvbWluZ1JlcXVlc3RzKHsgbG9nZ2VyLCBnaXRodWJDbGllbnQsIC4uLmNvbmZ9KTtcbmNvbnN0IGJvdCA9IGJvdENvbnRyb2xsZXIuc3Bhd24oc2xhY2spLnN0YXJ0UlRNKCk7XG5jb25zdCBkb2JicyA9IGZyaXZvbGl0eShjb25mLCBib3RDb250cm9sbGVyKTtcblxubGV0IHN1Y2Nlc3NmdWxCdWlsZHMkID0gZmlsdGVyRm9yQnVpbGRTdWNjZXNzKHtcbiAgZXZlbnRzJDogaW5jb21pbmcuZ2l0aHViSG9va3MsXG4gIGxvZ2dlcixcbiAgZ2l0aHViQ2xpZW50LFxuICBnaXRodWJcbn0pO1xuXG5zdWNjZXNzZnVsQnVpbGRzJC5zdWJzY3JpYmUoXG4gICh7IG9yaWdpbmFsU3RhdHVzLCB0YWcgfSkgPT4ge1xuICAgIGxldCB7IHNoYSwgbmFtZSwgY29tbWl0IH0gPSBvcmlnaW5hbFN0YXR1cztcbiAgICBsZXQgeyBhdXRob3IgfSA9IGNvbW1pdDtcbiAgICBsb2dnZXIubm90aWNlKFxuICAgICAgJ2dvbm5hIG5vdGlmeSBDSSBzdWNjZXNzIG9uIHRhZycsIG9yaWdpbmFsU3RhdHVzLCB0YWdcbiAgICApO1xuICAgIGJvdC5zZW5kV2ViaG9vayh7XG4gICAgICBjaGFubmVsOiBzdGF0dXNDaGFubmVsLFxuICAgICAgYXR0YWNobWVudHM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGZhbGxiYWNrOiBgJHtuYW1lfSAke3RhZy5uYW1lfSByZWFkeSBmb3IgcHVibGlzaC5gLFxuICAgICAgICAgIHByZXRleHQ6IGBCdWlsZCBzdWNjZXNzIGZvciBcXGAke25hbWV9XFxgIWAsXG4gICAgICAgICAgY29sb3I6IGNvbG9ycy5zdWNjZXNzLFxuICAgICAgICAgIGF1dGhvcl9uYW1lOiBhdXRob3IubG9naW4sXG4gICAgICAgICAgYXV0aG9yX2ljb246IGF1dGhvci5hdmF0YXJfdXJsLFxuICAgICAgICAgIGF1dGhvcl9saW5rOiBhdXRob3IuaHRtbF91cmwsXG4gICAgICAgICAgdGh1bWJfdXJsOiBvcmlnaW5hbFN0YXR1cy5vcmdhbml6YXRpb24uYXZhdGFyX3VybCxcbiAgICAgICAgICB0aXRsZTogYCR7dGFnLm5hbWV9IG9mIHRoZSAke25hbWV9IHBhY2thZ2UgaXMgcmVhZHkgdG8gYmUgYCArXG4gICAgICAgICAgICBgcHVibGlzaGVkIHRvIE5QTS5gLFxuICAgICAgICAgIHRpdGxlX2xpbms6IG9yaWdpbmFsU3RhdHVzLnJlcG9zaXRvcnkuaHRtbF91cmwsXG4gICAgICAgICAgdGV4dDogYFdoZW4gcHVibGlzaGluZywgYmUgc3VyZSB5b3VyIGxvY2FsIHJlcG9zaXRvcnkgaXMgYXQgYCArXG4gICAgICAgICAgYHRoYXQgZXhhY3QgdmVyc2lvbjogXFxgZ2l0IGNoZWNrb3V0ICR7dGFnLm5hbWV9ICYmIG5wbSBgICtcbiAgICAgICAgICBgcHVibGlzaFxcYC5gLFxuICAgICAgICAgIG1ya2R3bl9pbjogWydwcmV0ZXh0JywgJ3RleHQnXVxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgLi4uZm9ybWF0cy5zdWNjZXNzXG4gICAgfSk7XG4gIH0sXG4gIGxvZ2dlci5lcnJvclxuKTtcblxuZG9iYnMuaGVhcnMoXG4gIFsnc3RhdHVzIChbQS1aYS16MC05XFwtXFwuXFxfXSspKD86IChbQS1aYS16MC05XFwtXFwvXFxfXSspKT8nXSxcbiAgWydkaXJlY3RfbWVudGlvbiddLFxuICAoZG9iYnMsIG1zZykgPT4ge1xuICAgIGxldCBwYWNrYWdlTmFtZSA9IG1zZy5tYXRjaFsxXTtcbiAgICBsZXQgYnJhbmNoID0gbXNnLm1hdGNoWzJdIHx8ICdtYXN0ZXInO1xuICAgIGxvZ2dlci5pbmZvKCdwYWNrYWdlIHN0YXR1cyByZXF1ZXN0ZWQnLCBwYWNrYWdlTmFtZSwgbXNnKTtcblxuICAgIGxldCBwYWNrYWdlU3RhdHVzJCA9IGdldFBhY2thZ2VTdGF0dXMoe1xuICAgICAgcGFja2FnZU5hbWUsXG4gICAgICBicmFuY2gsXG4gICAgICBnaXRodWJDbGllbnQsXG4gICAgICBnaXRodWIsXG4gICAgICBucG1DbGllbnQsXG4gICAgICBjaVByb3ZpZGVyc1xuICAgIH0pO1xuXG4gICAgcGFja2FnZVN0YXR1cyQuc3Vic2NyaWJlKChkYXRhKSA9PiB7XG4gICAgICBsZXQgc3RhdHVzID0gZm9ybWF0UGFja2FnZVN0YXR1cyhcbiAgICAgICAgeyBwYWNrYWdlTmFtZSwgYnJhbmNoLCAuLi5kYXRhfVxuICAgICAgKTtcbiAgICAgIGRvYmJzLnJlcGx5KG1zZywge1xuICAgICAgICB0ZXh0OiBgU3RhdHVzIGZvciBcXGAke3BhY2thZ2VOYW1lfVxcYGAsXG4gICAgICAgIGF0dGFjaG1lbnRzOiBbe1xuICAgICAgICAgIGNvbG9yOiBzdGF0dXMuZ29vZCA/IGNvbG9ycy5zdWNjZXNzIDogY29sb3JzLmVycm9yLFxuICAgICAgICAgIHRpdGxlOiBzdGF0dXMudGl0bGUgfHwgKHN0YXR1cy5nb29kID8gJ0dvb2QgTmV3cyEnIDogJ0tlZXAgQ2FsbSEnKSxcbiAgICAgICAgICB0ZXh0OiBzdGF0dXMudGV4dCxcbiAgICAgICAgICBmaWVsZHM6IE9iamVjdC5rZXlzKHN0YXR1cy5maWVsZHMpLm1hcCgoaykgPT4gKHtcbiAgICAgICAgICAgIHRpdGxlOiBrLFxuICAgICAgICAgICAgdmFsdWU6IHN0YXR1cy5maWVsZHNba10sXG4gICAgICAgICAgICBzaG9ydDogc3RhdHVzLmZpZWxkc1trXS5sZW5ndGggPCA0MFxuICAgICAgICAgIH0pKSxcbiAgICAgICAgICBtcmtkd25faW46IFsndGV4dCcsICdmaWVsZHMnXVxuICAgICAgICB9XSxcbiAgICAgICAgbXJrZHduX2luOiBbJ3RleHQnLCAnZmllbGRzJ10sXG4gICAgICAgIC4uLmZvcm1hdHMuc3RhbmRhcmRcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgKGUpID0+IHtcbiAgICAgIGxvZ2dlci5lcnJvcignc3RhdHVzIGNoZWNrIGZhaWxlZCcsIGUpO1xuICAgICAgbGV0IHJlcGx5ID0gey4uLmZvcm1hdHMuZXJyb3J9O1xuICAgICAgaWYgKGUuc3RhdHVzQ29kZSA9PT0gNDA0ICYmXG4gICAgICAgICAgZS5oZWFkZXJzICYmXG4gICAgICAgICAgZS5oZWFkZXJzLnNlcnZlciA9PT0gJ0dpdEh1Yi5jb20nKSB7XG4gICAgICAgIHJlcGx5LnRleHQgPSBgQ291bGQgbm90IGZpbmQgXFxgJHtwYWNrYWdlTmFtZX1cXGAgaW4gdGhlIGAgK1xuICAgICAgICAgIGBcXGAke2dpdGh1Yi5vcmd9XFxgIEdpdEh1YiBvcmdhbml6YXRpb24uIElzIGl0IHByaXZhdGU/IF9Eb2VzIGAgK1xuICAgICAgICAgIGBpdCBldmVuIGV4aXN0P19gO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVwbHkudGV4dCA9IGBCb3ksIEkgaGFkIGEgZG9venkgb2YgYSB0aW1lIHRyeWluZyB0byBkbyB0aGF0LiBIZXJlIGAgK1xuICAgICAgICAgIGBpcyB0aGUgZXJyb3IuYDtcbiAgICAgICAgcmVwbHkuYXR0YWNobWVudHMgPSBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgY29sb3I6IGNvbG9ycy5lcnJvcixcbiAgICAgICAgICAgIHRpdGxlOiBlLm1lc3NhZ2UsXG4gICAgICAgICAgICB0ZXh0OiAnYGBgXFxuJyArIGluc3BlY3QoZSkgKyAnXFxuYGBgJyxcbiAgICAgICAgICAgIGZpZWxkczogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdGl0bGU6ICdTdGFjayB0cmFjZScsXG4gICAgICAgICAgICAgICAgdmFsdWU6ICdgYGBcXG4nICsgZS5zdGFjayArICdcXG5gYGAnLFxuICAgICAgICAgICAgICAgIHNob3J0OiBmYWxzZVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbXJrZHduX2luOiBbJ3RleHQnLCAnZmllbGRzJ11cbiAgICAgICAgICB9XG4gICAgICAgIF07XG4gICAgICAgIGNvbnNvbGUubG9nKGUuc3RhY2spO1xuICAgICAgfVxuICAgICAgZG9iYnMucmVwbHkobXNnLCByZXBseSk7XG4gICAgfSk7XG4gIH1cbik7XG5cbmluY29taW5nLmNoZWNrUmVxdWVzdHMuc3Vic2NyaWJlKFxuICAoeyByZXBseSwgbmFtZSwgYnJhbmNoID0gJ21hc3RlcicgfSkgPT5cbiAgICBnZXRQYWNrYWdlU3RhdHVzKHtcbiAgICAgIHBhY2thZ2VOYW1lOiBuYW1lLFxuICAgICAgYnJhbmNoLFxuICAgICAgZ2l0aHViQ2xpZW50LFxuICAgICAgZ2l0aHViLFxuICAgICAgbnBtQ2xpZW50LFxuICAgICAgY2lQcm92aWRlcnNcbiAgICB9KS5zdWJzY3JpYmUoXG4gICAgICAoZCkgPT4gcmVwbHkoMjAwLCBkKSxcbiAgICAgIChlKSA9PiByZXBseSg0MDAsIGUpXG4gICAgKVxuKTtcbiJdfQ==
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
const dobbs = (0, _frivolity2.default)(_conf2.default, logger, botController);

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

dobbs.hears(['^help\\b'], ['direct_mention'], (dobbs, msg) => {
  dobbs.reply(msg, _extends({
    text: `*I'm a validation monitor for Mozu NPM packages.*.

I'm configured to monitor all NPM packages (that is, repositories with a \`package.json\`) in the \`https://github.com/${ github.org }\` GitHub organization and notify this channel when one of them successfully builds using a configured continuous integration vendor.

You don't need to configure me when you add a new package. I'm always listening to the whole \`${ github.org }\` organization, so just create the NPM package and configure CI vendors (using a \`.travis.yml\` and/or an \`appveyor.yml\` file, for example) and I'll report about it.

If you need to check on a package, you can ask me directly. Just ask me something like "@dobbs: status <package name>" and I'll give you the deets.

You can also just say hi to me.`,
    mrkdwn_in: ['text']
  }, formats.standard));
});

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
//# sourceMappingURL=data:application/json;base64,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QixBQUFDLENBQUMsSUFBSyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUNyQjtDQUFBLENBQ0osQ0FBQyIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGluc3BlY3QgfSBmcm9tICd1dGlsJztcbmltcG9ydCBSeCBmcm9tICdyeCc7XG5pbXBvcnQgeyBzbGFja2JvdCB9IGZyb20gJ2JvdGtpdCc7XG5pbXBvcnQgY29uZiBmcm9tICcuL2NvbmYnO1xuaW1wb3J0IExvZ2dlciBmcm9tICcuL2xvZ2dlcic7XG5pbXBvcnQgR2l0aHViQ2xpZW50IGZyb20gJy4vZ2l0aHViLWNsaWVudCc7XG5pbXBvcnQgTnBtQ2xpZW50IGZyb20gJy4vbnBtLWNsaWVudCc7XG5pbXBvcnQgZnJpdm9saXR5IGZyb20gJy4vZnJpdm9saXR5JztcbmltcG9ydCBJbmNvbWluZ1JlcXVlc3RzIGZyb20gJy4vaW5jb21pbmctcmVxdWVzdHMnO1xuaW1wb3J0IEZvcm1hdHRlciBmcm9tICcuL2Zvcm1hdHRpbmcnO1xuaW1wb3J0IHsgYWxsQ2lTdWNjZWVkZWQgfSBmcm9tICcuL2NpLWNoZWNrJztcbmltcG9ydCB7IGZpbHRlckZvckJ1aWxkU3VjY2VzcywgZ2V0UGFja2FnZVN0YXR1cyB9IGZyb20gJy4vc3RhdHVzLW1vbml0b3JzJztcblxuY29uc3QgeyBsb2dMZXZlbCwgY2lQcm92aWRlcnMsIGdpdGh1Yiwgc2xhY2ssIHN0YXR1c0NoYW5uZWwgfSA9IGNvbmY7XG5cbmlmIChsb2dMZXZlbCA+IDUpIFJ4LmNvbmZpZy5sb25nU3RhY2tTdXBwb3J0ID0gdHJ1ZTtcblxuY29uc3QgeyBjb2xvcnMsIGZvcm1hdHMsIGZvcm1hdFBhY2thZ2VTdGF0dXMgfSA9IEZvcm1hdHRlcihjb25mKTtcbmNvbnN0IGxvZ2dlciA9IExvZ2dlcihjb25mKTtcbmNvbnN0IGdpdGh1YkNsaWVudCA9IEdpdGh1YkNsaWVudCh7IGxvZ2dlciwgLi4uY29uZiB9KTtcbmNvbnN0IG5wbUNsaWVudCA9IE5wbUNsaWVudCh7IGxvZ2dlciwgLi4uY29uZiB9KTtcbmNvbnN0IGJvdENvbnRyb2xsZXIgPSBzbGFja2JvdCh7IGxvZ2dlciB9KTtcbmNvbnN0IGluY29taW5nID0gSW5jb21pbmdSZXF1ZXN0cyh7IGxvZ2dlciwgZ2l0aHViQ2xpZW50LCAuLi5jb25mfSk7XG5jb25zdCBib3QgPSBib3RDb250cm9sbGVyLnNwYXduKHNsYWNrKS5zdGFydFJUTSgpO1xuY29uc3QgZG9iYnMgPSBmcml2b2xpdHkoY29uZiwgbG9nZ2VyLCBib3RDb250cm9sbGVyKTtcblxubGV0IHN1Y2Nlc3NmdWxCdWlsZHMkID0gZmlsdGVyRm9yQnVpbGRTdWNjZXNzKHtcbiAgZXZlbnRzJDogaW5jb21pbmcuZ2l0aHViSG9va3MsXG4gIGxvZ2dlcixcbiAgZ2l0aHViQ2xpZW50LFxuICBnaXRodWJcbn0pO1xuXG5zdWNjZXNzZnVsQnVpbGRzJC5zdWJzY3JpYmUoXG4gICh7IG9yaWdpbmFsU3RhdHVzLCB0YWcgfSkgPT4ge1xuICAgIGxldCB7IHNoYSwgbmFtZSwgY29tbWl0IH0gPSBvcmlnaW5hbFN0YXR1cztcbiAgICBsZXQgeyBhdXRob3IgfSA9IGNvbW1pdDtcbiAgICBsb2dnZXIubm90aWNlKFxuICAgICAgJ2dvbm5hIG5vdGlmeSBDSSBzdWNjZXNzIG9uIHRhZycsIG9yaWdpbmFsU3RhdHVzLCB0YWdcbiAgICApO1xuICAgIGJvdC5zZW5kV2ViaG9vayh7XG4gICAgICBjaGFubmVsOiBzdGF0dXNDaGFubmVsLFxuICAgICAgYXR0YWNobWVudHM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGZhbGxiYWNrOiBgJHtuYW1lfSAke3RhZy5uYW1lfSByZWFkeSBmb3IgcHVibGlzaC5gLFxuICAgICAgICAgIHByZXRleHQ6IGBCdWlsZCBzdWNjZXNzIGZvciBcXGAke25hbWV9XFxgIWAsXG4gICAgICAgICAgY29sb3I6IGNvbG9ycy5zdWNjZXNzLFxuICAgICAgICAgIGF1dGhvcl9uYW1lOiBhdXRob3IubG9naW4sXG4gICAgICAgICAgYXV0aG9yX2ljb246IGF1dGhvci5hdmF0YXJfdXJsLFxuICAgICAgICAgIGF1dGhvcl9saW5rOiBhdXRob3IuaHRtbF91cmwsXG4gICAgICAgICAgdGh1bWJfdXJsOiBvcmlnaW5hbFN0YXR1cy5vcmdhbml6YXRpb24uYXZhdGFyX3VybCxcbiAgICAgICAgICB0aXRsZTogYCR7dGFnLm5hbWV9IG9mIHRoZSAke25hbWV9IHBhY2thZ2UgaXMgcmVhZHkgdG8gYmUgYCArXG4gICAgICAgICAgICBgcHVibGlzaGVkIHRvIE5QTS5gLFxuICAgICAgICAgIHRpdGxlX2xpbms6IG9yaWdpbmFsU3RhdHVzLnJlcG9zaXRvcnkuaHRtbF91cmwsXG4gICAgICAgICAgdGV4dDogYFdoZW4gcHVibGlzaGluZywgYmUgc3VyZSB5b3VyIGxvY2FsIHJlcG9zaXRvcnkgaXMgYXQgYCArXG4gICAgICAgICAgYHRoYXQgZXhhY3QgdmVyc2lvbjogXFxgZ2l0IGNoZWNrb3V0ICR7dGFnLm5hbWV9ICYmIG5wbSBgICtcbiAgICAgICAgICBgcHVibGlzaFxcYC5gLFxuICAgICAgICAgIG1ya2R3bl9pbjogWydwcmV0ZXh0JywgJ3RleHQnXVxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgLi4uZm9ybWF0cy5zdWNjZXNzXG4gICAgfSk7XG4gIH0sXG4gIGxvZ2dlci5lcnJvclxuKTtcblxuZG9iYnMuaGVhcnMoXG4gIFsnXmhlbHBcXFxcYiddLFxuICBbJ2RpcmVjdF9tZW50aW9uJ10sXG4gIChkb2JicywgbXNnKSA9PiB7XG4gICAgZG9iYnMucmVwbHkobXNnLCB7XG4gICAgICB0ZXh0OiBgKkknbSBhIHZhbGlkYXRpb24gbW9uaXRvciBmb3IgTW96dSBOUE0gcGFja2FnZXMuKi5cblxuSSdtIGNvbmZpZ3VyZWQgdG8gbW9uaXRvciBhbGwgTlBNIHBhY2thZ2VzICh0aGF0IGlzLCByZXBvc2l0b3JpZXMgd2l0aCBhIFxcYHBhY2thZ2UuanNvblxcYCkgaW4gdGhlIFxcYGh0dHBzOi8vZ2l0aHViLmNvbS8ke2dpdGh1Yi5vcmd9XFxgIEdpdEh1YiBvcmdhbml6YXRpb24gYW5kIG5vdGlmeSB0aGlzIGNoYW5uZWwgd2hlbiBvbmUgb2YgdGhlbSBzdWNjZXNzZnVsbHkgYnVpbGRzIHVzaW5nIGEgY29uZmlndXJlZCBjb250aW51b3VzIGludGVncmF0aW9uIHZlbmRvci5cblxuWW91IGRvbid0IG5lZWQgdG8gY29uZmlndXJlIG1lIHdoZW4geW91IGFkZCBhIG5ldyBwYWNrYWdlLiBJJ20gYWx3YXlzIGxpc3RlbmluZyB0byB0aGUgd2hvbGUgXFxgJHtnaXRodWIub3JnfVxcYCBvcmdhbml6YXRpb24sIHNvIGp1c3QgY3JlYXRlIHRoZSBOUE0gcGFja2FnZSBhbmQgY29uZmlndXJlIENJIHZlbmRvcnMgKHVzaW5nIGEgXFxgLnRyYXZpcy55bWxcXGAgYW5kL29yIGFuIFxcYGFwcHZleW9yLnltbFxcYCBmaWxlLCBmb3IgZXhhbXBsZSkgYW5kIEknbGwgcmVwb3J0IGFib3V0IGl0LlxuXG5JZiB5b3UgbmVlZCB0byBjaGVjayBvbiBhIHBhY2thZ2UsIHlvdSBjYW4gYXNrIG1lIGRpcmVjdGx5LiBKdXN0IGFzayBtZSBzb21ldGhpbmcgbGlrZSBcIkBkb2Jiczogc3RhdHVzIDxwYWNrYWdlIG5hbWU+XCIgYW5kIEknbGwgZ2l2ZSB5b3UgdGhlIGRlZXRzLlxuXG5Zb3UgY2FuIGFsc28ganVzdCBzYXkgaGkgdG8gbWUuYCxcbiAgICAgIG1ya2R3bl9pbjogWyd0ZXh0J10sXG4gICAgICAuLi5mb3JtYXRzLnN0YW5kYXJkXG4gICAgfSk7XG4gIH1cbik7XG5cbmRvYmJzLmhlYXJzKFxuICBbJ3N0YXR1cyAoW0EtWmEtejAtOVxcLVxcLlxcX10rKSg/OiAoW0EtWmEtejAtOVxcLVxcL1xcX10rKSk/J10sXG4gIFsnZGlyZWN0X21lbnRpb24nXSxcbiAgKGRvYmJzLCBtc2cpID0+IHtcbiAgICBsZXQgcGFja2FnZU5hbWUgPSBtc2cubWF0Y2hbMV07XG4gICAgbGV0IGJyYW5jaCA9IG1zZy5tYXRjaFsyXSB8fCAnbWFzdGVyJztcbiAgICBsb2dnZXIuaW5mbygncGFja2FnZSBzdGF0dXMgcmVxdWVzdGVkJywgcGFja2FnZU5hbWUsIG1zZyk7XG5cbiAgICBsZXQgcGFja2FnZVN0YXR1cyQgPSBnZXRQYWNrYWdlU3RhdHVzKHtcbiAgICAgIHBhY2thZ2VOYW1lLFxuICAgICAgYnJhbmNoLFxuICAgICAgZ2l0aHViQ2xpZW50LFxuICAgICAgZ2l0aHViLFxuICAgICAgbnBtQ2xpZW50LFxuICAgICAgY2lQcm92aWRlcnNcbiAgICB9KTtcblxuICAgIHBhY2thZ2VTdGF0dXMkLnN1YnNjcmliZSgoZGF0YSkgPT4ge1xuICAgICAgbGV0IHN0YXR1cyA9IGZvcm1hdFBhY2thZ2VTdGF0dXMoXG4gICAgICAgIHsgcGFja2FnZU5hbWUsIGJyYW5jaCwgLi4uZGF0YX1cbiAgICAgICk7XG4gICAgICBkb2Jicy5yZXBseShtc2csIHtcbiAgICAgICAgdGV4dDogYFN0YXR1cyBmb3IgXFxgJHtwYWNrYWdlTmFtZX1cXGBgLFxuICAgICAgICBhdHRhY2htZW50czogW3tcbiAgICAgICAgICBjb2xvcjogc3RhdHVzLmdvb2QgPyBjb2xvcnMuc3VjY2VzcyA6IGNvbG9ycy5lcnJvcixcbiAgICAgICAgICB0aXRsZTogc3RhdHVzLnRpdGxlIHx8IChzdGF0dXMuZ29vZCA/ICdHb29kIE5ld3MhJyA6ICdLZWVwIENhbG0hJyksXG4gICAgICAgICAgdGV4dDogc3RhdHVzLnRleHQsXG4gICAgICAgICAgZmllbGRzOiBPYmplY3Qua2V5cyhzdGF0dXMuZmllbGRzKS5tYXAoKGspID0+ICh7XG4gICAgICAgICAgICB0aXRsZTogayxcbiAgICAgICAgICAgIHZhbHVlOiBzdGF0dXMuZmllbGRzW2tdLFxuICAgICAgICAgICAgc2hvcnQ6IHN0YXR1cy5maWVsZHNba10ubGVuZ3RoIDwgNDBcbiAgICAgICAgICB9KSksXG4gICAgICAgICAgbXJrZHduX2luOiBbJ3RleHQnLCAnZmllbGRzJ11cbiAgICAgICAgfV0sXG4gICAgICAgIG1ya2R3bl9pbjogWyd0ZXh0JywgJ2ZpZWxkcyddLFxuICAgICAgICAuLi5mb3JtYXRzLnN0YW5kYXJkXG4gICAgICB9KTtcbiAgICB9LFxuICAgIChlKSA9PiB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ3N0YXR1cyBjaGVjayBmYWlsZWQnLCBlKTtcbiAgICAgIGxldCByZXBseSA9IHsuLi5mb3JtYXRzLmVycm9yfTtcbiAgICAgIGlmIChlLnN0YXR1c0NvZGUgPT09IDQwNCAmJlxuICAgICAgICAgIGUuaGVhZGVycyAmJlxuICAgICAgICAgIGUuaGVhZGVycy5zZXJ2ZXIgPT09ICdHaXRIdWIuY29tJykge1xuICAgICAgICByZXBseS50ZXh0ID0gYENvdWxkIG5vdCBmaW5kIFxcYCR7cGFja2FnZU5hbWV9XFxgIGluIHRoZSBgICtcbiAgICAgICAgICBgXFxgJHtnaXRodWIub3JnfVxcYCBHaXRIdWIgb3JnYW5pemF0aW9uLiBJcyBpdCBwcml2YXRlPyBfRG9lcyBgICtcbiAgICAgICAgICBgaXQgZXZlbiBleGlzdD9fYDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlcGx5LnRleHQgPSBgQm95LCBJIGhhZCBhIGRvb3p5IG9mIGEgdGltZSB0cnlpbmcgdG8gZG8gdGhhdC4gSGVyZSBgICtcbiAgICAgICAgICBgaXMgdGhlIGVycm9yLmA7XG4gICAgICAgIHJlcGx5LmF0dGFjaG1lbnRzID0gW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGNvbG9yOiBjb2xvcnMuZXJyb3IsXG4gICAgICAgICAgICB0aXRsZTogZS5tZXNzYWdlLFxuICAgICAgICAgICAgdGV4dDogJ2BgYFxcbicgKyBpbnNwZWN0KGUpICsgJ1xcbmBgYCcsXG4gICAgICAgICAgICBmaWVsZHM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHRpdGxlOiAnU3RhY2sgdHJhY2UnLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAnYGBgXFxuJyArIGUuc3RhY2sgKyAnXFxuYGBgJyxcbiAgICAgICAgICAgICAgICBzaG9ydDogZmFsc2VcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG1ya2R3bl9pbjogWyd0ZXh0JywgJ2ZpZWxkcyddXG4gICAgICAgICAgfVxuICAgICAgICBdO1xuICAgICAgICBjb25zb2xlLmxvZyhlLnN0YWNrKTtcbiAgICAgIH1cbiAgICAgIGRvYmJzLnJlcGx5KG1zZywgcmVwbHkpO1xuICAgIH0pO1xuICB9XG4pO1xuXG5pbmNvbWluZy5jaGVja1JlcXVlc3RzLnN1YnNjcmliZShcbiAgKHsgcmVwbHksIG5hbWUsIGJyYW5jaCA9ICdtYXN0ZXInIH0pID0+XG4gICAgZ2V0UGFja2FnZVN0YXR1cyh7XG4gICAgICBwYWNrYWdlTmFtZTogbmFtZSxcbiAgICAgIGJyYW5jaCxcbiAgICAgIGdpdGh1YkNsaWVudCxcbiAgICAgIGdpdGh1YixcbiAgICAgIG5wbUNsaWVudCxcbiAgICAgIGNpUHJvdmlkZXJzXG4gICAgfSkuc3Vic2NyaWJlKFxuICAgICAgKGQpID0+IHJlcGx5KDIwMCwgZCksXG4gICAgICAoZSkgPT4gcmVwbHkoNDAwLCBlKVxuICAgIClcbik7XG4iXX0=
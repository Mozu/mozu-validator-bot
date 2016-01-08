'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _util = require('util');

var _rx = require('rx');

var _rx2 = _interopRequireDefault(_rx);

var _botkit = require('botkit');

var _nodeFetch = require('node-fetch');

var _nodeFetch2 = _interopRequireDefault(_nodeFetch);

var _semver = require('semver');

var _semver2 = _interopRequireDefault(_semver);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _conf = require('./conf');

var _conf2 = _interopRequireDefault(_conf);

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _githubClient = require('./github-client');

var _githubClient2 = _interopRequireDefault(_githubClient);

var _frivolity = require('./frivolity');

var _frivolity2 = _interopRequireDefault(_frivolity);

var _githubHookListener = require('./github-hook-listener');

var _githubHookListener2 = _interopRequireDefault(_githubHookListener);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

if (_conf2.default.logLevel > 5) _rx2.default.config.longStackSupport = true;
const Observable = _rx2.default.Observable;

const logger = (0, _logger2.default)(_conf2.default);
const github = (0, _githubClient2.default)(_extends({ logger }, _conf2.default));
const botController = (0, _botkit.slackbot)({ logger });
const githubHook = (0, _githubHookListener2.default)(_extends({ logger }, _conf2.default));

const bot = botController.spawn({
  token: _conf2.default.slackToken,
  incoming_webhook: {
    url: _conf2.default.slackWebhookUrl
  }
}).startRTM();

const dobbs = (0, _frivolity2.default)(_conf2.default, botController);

const successColor = '#1DED05';
const errorColor = '#D00D00';

const standardMessageFormat = {
  icon_url: _conf2.default.botIcon,
  username: _conf2.default.botName
};

const successMessageFormat = {
  icon_url: _conf2.default.successIcon,
  username: _conf2.default.botName
};

const errorMessageFormat = {
  icon_url: _conf2.default.errorIcon,
  username: _conf2.default.botName
};

function allCiSucceeded(_ref) {
  let repository = _ref.repository;
  let sha = _ref.sha;
  let statuses = _ref.statuses;
  let contents = _ref.contents;

  let successes = statuses.filter(_ref2 => {
    let state = _ref2.state;
    return state === 'success';
  });
  return _conf2.default.ciProviders.every(_ref3 => {
    let name = _ref3.name;
    let configFile = _ref3.configFile;
    let statusContext = _ref3.statusContext;

    let isConfigured = contents.some(_ref4 => {
      let path = _ref4.path;
      return path === configFile;
    });
    let successFound = !isConfigured || successes.find(_ref5 => {
      let context = _ref5.context;
      return context === statusContext;
    });
    if (isConfigured && successFound) {
      logger.notice(`${ name } build success for ${ repository.name }#${ sha }, triggered by`, successFound);
    }
    return !!successFound;
  });
}

function getNpmStatus(packageName) {
  return Observable.fromPromise((0, _nodeFetch2.default)(_conf2.default.npmRegistry + packageName).then(res => res.json()).catch(() => false));
}

let successfulBuilds$ = githubHook.incoming.filter(_ref6 => {
  let event = _ref6.event;
  let data = _ref6.data;
  return event === 'status' && data.state === 'success';
}).do(_ref7 => {
  let data = _ref7.data;
  return logger.info('Received success notification', data);
}).map(_ref8 => {
  let data = _ref8.data;

  let getRepoData = github.forRepo(data.repository.name);
  return Observable.forkJoin(Observable.just(data), getRepoData('statuses', data.sha), getRepoData('contents', '/', data.sha), (_ref9, statuses, contents) => {
    let repository = _ref9.repository;
    let sha = _ref9.sha;
    return { repository, sha, statuses, contents };
  });
}).concatAll().filter(_ref10 => {
  let repository = _ref10.repository;
  let sha = _ref10.sha;
  let statuses = _ref10.statuses;
  let contents = _ref10.contents;

  logger.info('Received full status for', repository.name, sha);
  let hasPkg = contents.some(_ref11 => {
    let path = _ref11.path;
    return path === 'package.json';
  });
  return hasPkg && allCiSucceeded({ repository, sha, statuses, contents });
}).map(_ref12 => {
  let repository = _ref12.repository;
  let sha = _ref12.sha;
  return Observable.forkJoin(Observable.of({ repository, sha }), github.forRepo(repository.name)('tags'), (_ref13, tags) => {
    let repository = _ref13.repository;
    let sha = _ref13.sha;
    return {
      repository,
      sha,
      tag: tags.find(_ref14 => {
        let commit = _ref14.commit;
        return commit && commit.sha === sha;
      })
    };
  });
}).concatAll().filter(_ref15 => {
  let tag = _ref15.tag;
  return tag && _semver2.default.clean(tag.name);
});

successfulBuilds$.subscribe(_ref16 => {
  let repository = _ref16.repository;
  let sha = _ref16.sha;
  let tag = _ref16.tag;

  let name = repository.name;
  logger.notice('gonna notify CI success on tag', name, sha);
  bot.sendWebhook(_extends({
    channel: _conf2.default.statusChannel,
    attachments: [{
      color: successColor,
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
  }, successMessageFormat));
}, logger.error);

function getPackageStatus(packageName, branch) {
  let getRepoData = github.forRepo(packageName);
  return getRepoData('tags').map(tags => Observable.forkJoin(Observable.just(tags), getRepoData('contents', '/', branch), getRepoData('statuses', branch), getRepoData('commits'), getNpmStatus(packageName), (tags, contents, statuses, commits, npmInfo) => ({ tags, contents, statuses, commits, npmInfo }))).concatAll().map(data => _extends({
    latestGoodTag: data.tags.find(tag => allCiSucceeded({
      repository: { name: packageName },
      sha: tag.commit.sha,
      statuses: data.statuses.filter(_ref17 => {
        let url = _ref17.url;
        return ~url.indexOf(tag.commit.sha);
      }),
      contents: data.contents
    })),
    ciProvidersConfigured: _conf2.default.ciProviders.filter(_ref18 => {
      let configFile = _ref18.configFile;
      return data.contents.some(_ref19 => {
        let path = _ref19.path;
        return path === configFile;
      });
    })
  }, data));
}

function formatPackageStatus(d) {
  let packageName = d.packageName;
  let branch = d.branch;
  let npmInfo = d.npmInfo;
  let contents = d.contents;
  let latestGoodTag = d.latestGoodTag;
  let commits = d.commits;
  let ciProvidersConfigured = d.ciProvidersConfigured;

  logger.info('about to format a status message', packageName, branch);
  let status = {
    fields: {}
  };
  let readyForPublish = false;
  let headIsPublishable = false;

  if (!contents.some(_ref20 => {
    let path = _ref20.path;
    return path === 'package.json';
  })) {
    status.good = false;
    status.title = 'Nuts!';
    status.text = `The \`${ packageName }\` repository does not appear to ` + `have a \`package.json\` file, so, not to put too fine a point on it, ` + `but I don't care about it.`;
    return status;
  }

  status.fields['CI Providers Configured'] = ciProvidersConfigured.length > 0 ? ciProvidersConfigured.map(_ref21 => {
    let name = _ref21.name;
    return name;
  }).join(', ') : '_None. I recommend at least one._';

  if (!latestGoodTag) {
    status.title = 'Jinkies!';
    status.good = false;
    status.text = `I couldn't find any tagged versions in the ` + `\`${ packageName }\` repository that had successfully built.`;
    return status;
  }

  status.fields['Latest valid tag in repo'] = latestGoodTag.name;
  logger.notice('latest good tag', latestGoodTag);
  // status.fields['Latest tag created'] =
  //   moment()
  headIsPublishable = latestGoodTag && latestGoodTag.commit.sha === commits[0].sha;

  if (!headIsPublishable) {
    status.fields['Don\'t publish HEAD!'] = `The tip of the \`${ branch }\` ` + `branch of the \`${ packageName }\` repository has moved ahead of the ` + `latest known-good tag, so don't run \`npm publish\` willy-nilly; ` + `use \`git checkout\` to get your working tree into a known-good ` + `state first.`;
  }

  if (!npmInfo || !npmInfo.versions) {
    status.fields['Current version on NPM'] = '_Never published!_';
    if (ciProvidersConfigured.length > 0) {
      status.text = `I couldn't find the \`${ packageName }\` package on NPM, ` + `but the ${ latestGoodTag.name } tag in the repository has passed CI, ` + `so we're ready for an initial publish to NPM!`;
      readyForPublish = true;
      status.good = true;
    } else {
      status.text = `I couldn't find the \`${ packageName }\` package on NPM, ` + `and the repo has no CI configured, so I don't know for sure ` + `whether the latest tag, ${ latestGoodTag.name }, is ready. *Publish ` + `to NPM at your own risk.*`;
      status.good = false;
      status.fields['Ready for publish?'] = ':question:';
      return status;
    }
  }

  let npmVersions = Object.keys(npmInfo.versions).sort(_semver2.default.rcompare).map(v => npmInfo.versions[v]);
  let currentNpm = npmVersions[0];

  status.fields['Current version on NPM'] = `<http://npmjs.org/package/${ packageName }|${ currentNpm.version }>`;
  status.fields['Last published to NPM'] = (0, _moment2.default)(npmInfo.time[currentNpm.version]).fromNow();

  switch (_semver2.default.compare(currentNpm.version, latestGoodTag.name)) {
    case 0:
      status.good = true;
      readyForPublish = false;
      // TODO: compare the currentNpm.gitHead and latestGoodTag.commit.sha
      // and say something terrified if they aren't the same
      // also TODO check package.json to make sure it's what it should be
      status.text = `NPM is already up to date with the latest good version ` + `of \`${ packageName }\`, *${ currentNpm.version }*`;
      break;
    case -1:
      status.good = true;
      readyForPublish = true;
      status.text = `The current version of \`${ packageName }\` published to ` + `NPM is *${ currentNpm.version }*, and the repository is ahead by at ` + `least one ${ _semver2.default.diff(currentNpm.version, latestGoodTag.name) } ` + `version: it's at *${ latestGoodTag.name }*. *Ready to publish!*`;
      break;
    case 1:
      status.good = false;
      readyForPublish = false;
      status.text = `*Not good.* The current version of \`${ packageName }\` ` + `published to NPM is *${ currentNpm.version }*, but the repository's ` + `latest good version is *${ latestGoodTag.name }*, which is at least ` + `one ${ _semver2.default.diff(currentNpm.version, latestGoodTag.name) } version ` + `behind. Was a version published before it had built successfully? ` + `Was a version published from a different branch than \`${ branch }\`` + `? *Please investigate.*`;
      break;
    default:
      status.good = false;
      status.text = `The entire world is on fire.`;
      break;
  }

  if (readyForPublish) {
    status.fields['Ready for publish?'] = ':white_check_mark:';
    status.fields['Run command:'] = headIsPublishable ? '`npm publish`' : `\`git checkout ${ latestGoodTag.name }; npm publish\``;
  } else {
    status.fields['Ready for publish?'] = ':x:';
  }

  return status;
}

dobbs.hears(['status ([A-Za-z0-9\-\.\_]+)(?: ([A-Za-z0-9\-\/\_]+))?'], ['direct_mention'], (dobbs, msg) => {
  let packageName = msg.match[1];
  let branch = msg.match[2] || 'master';
  logger.info('package status requested', packageName, msg);

  let packageStatus$ = getPackageStatus(packageName, branch);

  packageStatus$.subscribe(data => {
    let status = formatPackageStatus(_extends({ packageName, branch }, data));
    dobbs.reply(msg, _extends({
      text: `Status for \`${ packageName }\``,
      attachments: [{
        color: status.good ? successColor : errorColor,
        title: status.title || (status.good ? 'Good News!' : 'Keep Calm!'),
        text: status.text,
        fields: Object.keys(status.fields).map(k => ({
          title: k,
          value: status.fields[k],
          short: status.fields[k].length < 20
        })),
        mrkdwn_in: ['text', 'fields']
      }],
      mrkdwn_in: ['text', 'fields']
    }, standardMessageFormat));
  }, e => {
    logger.error('status check failed', e);
    let reply = _extends({}, errorMessageFormat);
    if (e.statusCode === 404 && e.headers && e.headers.server === 'GitHub.com') {
      reply.text = `Could not find \`${ packageName }\` in the ` + `\`${ _conf2.default.githubOrg }\` GitHub organization. Is it private? _Does ` + `it even exist?_`;
    } else {
      reply.text = `Boy, I had a doozy of a time trying to do that. Here ` + `is the error.`;
      reply.attachments = [{
        color: errorColor,
        title: e.message,
        text: '```\n' + (0, _util.inspect)(e) + '\n```'
      }];
    }
    dobbs.reply(msg, reply);
  });
});
//# sourceMappingURL=data:application/json;base64,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QyxxQkFBcUIsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUN2QyxRQUFJLEtBQUssZ0JBQU8sa0JBQWtCLENBQUMsQ0FBQztBQUNwQyxRQUFJLENBQUMsQ0FBQyxVQUFVLEtBQUssR0FBRyxJQUNwQixDQUFDLENBQUMsT0FBTyxJQUNULENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxLQUFLLFlBQVksRUFBRTtBQUNyQyxXQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsaUJBQWlCLEdBQUUsV0FBVyxFQUFDLFVBQVUsQ0FBQyxHQUN0RCxDQUFDLEVBQUUsR0FBRSxlQUFLLFNBQVMsRUFBQyw2Q0FBNkMsQ0FBQyxHQUNsRSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0tBQ3JCLE1BQU07QUFDTCxXQUFLLENBQUMsSUFBSSxHQUFHLENBQUMscURBQXFELENBQUMsR0FDbEUsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUNsQixXQUFLLENBQUMsV0FBVyxHQUFHLENBQ2xCO0FBQ0UsYUFBSyxFQUFFLFVBQVU7QUFDakIsYUFBSyxFQUFFLENBQUMsQ0FBQyxPQUFPO0FBQ2hCLFlBQUksRUFBRSxPQUFPLEdBQUcsVUFqV25CLE9BQU8sRUFpV29CLENBQUMsQ0FBQyxHQUFHLE9BQU87T0FDckMsQ0FDRixDQUFDO0tBQ0g7QUFDRCxTQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztHQUN6QixDQUFDLENBQUM7Q0FDSixDQUNGLENBQUMiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBpbnNwZWN0IH0gZnJvbSAndXRpbCc7XG5pbXBvcnQgUnggZnJvbSAncngnO1xuaW1wb3J0IHsgc2xhY2tib3QgfSBmcm9tICdib3RraXQnO1xuaW1wb3J0IGZldGNoIGZyb20gJ25vZGUtZmV0Y2gnO1xuaW1wb3J0IHNlbXZlciBmcm9tICdzZW12ZXInO1xuaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnO1xuaW1wb3J0IGNvbmYgZnJvbSAnLi9jb25mJztcbmltcG9ydCBMb2dnZXIgZnJvbSAnLi9sb2dnZXInO1xuaW1wb3J0IEdpdGh1YkNsaWVudCBmcm9tICcuL2dpdGh1Yi1jbGllbnQnO1xuaW1wb3J0IGZyaXZvbGl0eSBmcm9tICcuL2ZyaXZvbGl0eSc7XG5pbXBvcnQgR2l0aHViSG9vayBmcm9tICcuL2dpdGh1Yi1ob29rLWxpc3RlbmVyJztcblxuaWYgKGNvbmYubG9nTGV2ZWwgPiA1KSBSeC5jb25maWcubG9uZ1N0YWNrU3VwcG9ydCA9IHRydWU7XG5jb25zdCB7IE9ic2VydmFibGUgfSA9IFJ4O1xuXG5jb25zdCBsb2dnZXIgPSBMb2dnZXIoY29uZik7XG5jb25zdCBnaXRodWIgPSBHaXRodWJDbGllbnQoeyBsb2dnZXIsIC4uLmNvbmYgfSk7XG5jb25zdCBib3RDb250cm9sbGVyID0gc2xhY2tib3QoeyBsb2dnZXIgfSk7XG5jb25zdCBnaXRodWJIb29rID0gR2l0aHViSG9vayh7IGxvZ2dlciwgLi4uY29uZiB9KTtcblxuY29uc3QgYm90ID0gYm90Q29udHJvbGxlci5zcGF3bih7IFxuICB0b2tlbjogY29uZi5zbGFja1Rva2VuLFxuICBpbmNvbWluZ193ZWJob29rOiB7XG4gICAgdXJsOiBjb25mLnNsYWNrV2ViaG9va1VybFxuICB9XG59KS5zdGFydFJUTSgpO1xuXG5jb25zdCBkb2JicyA9IGZyaXZvbGl0eShjb25mLCBib3RDb250cm9sbGVyKTtcblxuY29uc3Qgc3VjY2Vzc0NvbG9yID0gJyMxREVEMDUnO1xuY29uc3QgZXJyb3JDb2xvciA9ICcjRDAwRDAwJztcblxuY29uc3Qgc3RhbmRhcmRNZXNzYWdlRm9ybWF0ID0ge1xuICBpY29uX3VybDogY29uZi5ib3RJY29uLFxuICB1c2VybmFtZTogY29uZi5ib3ROYW1lXG59O1xuXG5jb25zdCBzdWNjZXNzTWVzc2FnZUZvcm1hdCA9IHtcbiAgaWNvbl91cmw6IGNvbmYuc3VjY2Vzc0ljb24sXG4gIHVzZXJuYW1lOiBjb25mLmJvdE5hbWVcbn07XG5cbmNvbnN0IGVycm9yTWVzc2FnZUZvcm1hdCA9IHtcbiAgaWNvbl91cmw6IGNvbmYuZXJyb3JJY29uLFxuICB1c2VybmFtZTogY29uZi5ib3ROYW1lXG59O1xuXG5mdW5jdGlvbiBhbGxDaVN1Y2NlZWRlZCh7IHJlcG9zaXRvcnksIHNoYSwgc3RhdHVzZXMsIGNvbnRlbnRzIH0pIHtcbiAgbGV0IHN1Y2Nlc3NlcyA9IHN0YXR1c2VzLmZpbHRlcigoeyBzdGF0ZSB9KSA9PiBzdGF0ZSA9PT0gJ3N1Y2Nlc3MnKTtcbiAgcmV0dXJuIGNvbmYuY2lQcm92aWRlcnMuZXZlcnkoXG4gICAgKHsgbmFtZSwgY29uZmlnRmlsZSwgc3RhdHVzQ29udGV4dCB9KSA9PiB7XG4gICAgICBsZXQgaXNDb25maWd1cmVkID0gY29udGVudHMuc29tZSgoeyBwYXRoIH0pID0+IHBhdGggPT09IGNvbmZpZ0ZpbGUpO1xuICAgICAgbGV0IHN1Y2Nlc3NGb3VuZCA9ICFpc0NvbmZpZ3VyZWQgfHxcbiAgICAgICAgc3VjY2Vzc2VzLmZpbmQoKHsgY29udGV4dCB9KSA9PiBjb250ZXh0ID09PSBzdGF0dXNDb250ZXh0KTtcbiAgICAgIGlmIChpc0NvbmZpZ3VyZWQgJiYgc3VjY2Vzc0ZvdW5kKSB7XG4gICAgICAgIGxvZ2dlci5ub3RpY2UoXG4gICAgICAgICAgYCR7bmFtZX0gYnVpbGQgc3VjY2VzcyBmb3IgJHtyZXBvc2l0b3J5Lm5hbWV9IyR7c2hhfSwgdHJpZ2dlcmVkIGJ5YCxcbiAgICAgICAgICBzdWNjZXNzRm91bmRcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAhIXN1Y2Nlc3NGb3VuZDtcbiAgICB9XG4gIClcbn1cblxuZnVuY3Rpb24gZ2V0TnBtU3RhdHVzKHBhY2thZ2VOYW1lKSB7XG4gIHJldHVybiBPYnNlcnZhYmxlLmZyb21Qcm9taXNlKFxuICAgIGZldGNoKGNvbmYubnBtUmVnaXN0cnkgKyBwYWNrYWdlTmFtZSlcbiAgICAgIC50aGVuKChyZXMpID0+IHJlcy5qc29uKCkpXG4gICAgICAuY2F0Y2goKCkgPT4gZmFsc2UpXG4gICk7XG59XG5cbmxldCBzdWNjZXNzZnVsQnVpbGRzJCA9IGdpdGh1Ykhvb2suaW5jb21pbmcuZmlsdGVyKFxuICAoeyBldmVudCwgZGF0YSB9KSA9PiBldmVudCA9PT0gJ3N0YXR1cycgJiYgZGF0YS5zdGF0ZSA9PT0gJ3N1Y2Nlc3MnXG4pLmRvKFxuICAoeyBkYXRhIH0pID0+IGxvZ2dlci5pbmZvKCdSZWNlaXZlZCBzdWNjZXNzIG5vdGlmaWNhdGlvbicsIGRhdGEpXG4pLm1hcChcbiAgKHsgZGF0YSB9KSA9PiB7XG4gICAgbGV0IGdldFJlcG9EYXRhID0gZ2l0aHViLmZvclJlcG8oZGF0YS5yZXBvc2l0b3J5Lm5hbWUpO1xuICAgIHJldHVybiBPYnNlcnZhYmxlLmZvcmtKb2luKFxuICAgICAgT2JzZXJ2YWJsZS5qdXN0KGRhdGEpLFxuICAgICAgZ2V0UmVwb0RhdGEoJ3N0YXR1c2VzJywgZGF0YS5zaGEpLFxuICAgICAgZ2V0UmVwb0RhdGEoJ2NvbnRlbnRzJywgJy8nLCBkYXRhLnNoYSksXG4gICAgICAoeyByZXBvc2l0b3J5LCBzaGEgfSwgc3RhdHVzZXMsIGNvbnRlbnRzICkgPT5cbiAgICAgICAgKHsgcmVwb3NpdG9yeSwgc2hhLCBzdGF0dXNlcywgY29udGVudHMgfSlcbiAgICApO1xuICB9XG4pLmNvbmNhdEFsbCgpLmZpbHRlcihcbiAgKHsgcmVwb3NpdG9yeSwgc2hhLCBzdGF0dXNlcywgY29udGVudHMgfSkgPT4ge1xuICAgIGxvZ2dlci5pbmZvKCdSZWNlaXZlZCBmdWxsIHN0YXR1cyBmb3InLCByZXBvc2l0b3J5Lm5hbWUsICBzaGEpO1xuICAgIGxldCBoYXNQa2cgPSBjb250ZW50cy5zb21lKCh7IHBhdGggfSkgPT4gcGF0aCA9PT0gJ3BhY2thZ2UuanNvbicpO1xuICAgIHJldHVybiBoYXNQa2cgJiYgYWxsQ2lTdWNjZWVkZWQoeyByZXBvc2l0b3J5LCBzaGEsIHN0YXR1c2VzLCBjb250ZW50cyB9KTtcbiAgfVxuKS5tYXAoXG4gICh7IHJlcG9zaXRvcnksIHNoYSB9KSA9PiBPYnNlcnZhYmxlLmZvcmtKb2luKFxuICAgIE9ic2VydmFibGUub2YoeyByZXBvc2l0b3J5LCBzaGEgfSksXG4gICAgZ2l0aHViLmZvclJlcG8ocmVwb3NpdG9yeS5uYW1lKSgndGFncycpLFxuICAgICh7IHJlcG9zaXRvcnksIHNoYSB9LCB0YWdzKSA9PlxuICAgICAgKHtcbiAgICAgICAgcmVwb3NpdG9yeSxcbiAgICAgICAgc2hhLFxuICAgICAgICB0YWc6IHRhZ3MuZmluZCgoeyBjb21taXQgfSkgPT4gY29tbWl0ICYmIGNvbW1pdC5zaGEgPT09IHNoYSlcbiAgICAgIH0pXG4gIClcbikuY29uY2F0QWxsKCkuZmlsdGVyKCh7IHRhZyB9KSA9PiB0YWcgJiYgc2VtdmVyLmNsZWFuKHRhZy5uYW1lKSk7XG5cbnN1Y2Nlc3NmdWxCdWlsZHMkLnN1YnNjcmliZShcbiAgKHsgcmVwb3NpdG9yeSwgc2hhLCB0YWcgfSkgPT4ge1xuICAgIGxldCBuYW1lID0gcmVwb3NpdG9yeS5uYW1lO1xuICAgIGxvZ2dlci5ub3RpY2UoXG4gICAgICAnZ29ubmEgbm90aWZ5IENJIHN1Y2Nlc3Mgb24gdGFnJywgbmFtZSwgc2hhXG4gICAgKTtcbiAgICBib3Quc2VuZFdlYmhvb2soe1xuICAgICAgY2hhbm5lbDogY29uZi5zdGF0dXNDaGFubmVsLFxuICAgICAgYXR0YWNobWVudHM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGNvbG9yOiBzdWNjZXNzQ29sb3IsXG4gICAgICAgICAgZmFsbGJhY2s6IGAke25hbWV9ICR7dGFnLm5hbWV9IHJlYWR5IGZvciBwdWJsaXNoLmAsXG4gICAgICAgICAgcHJldGV4dDogYG5wbSBwYWNrYWdlIGJ1aWxkIHN1Y2Nlc3MgZm9yIFxcYCR7bmFtZX1cXGAhYCxcbiAgICAgICAgICB0aXRsZTogYCR7dGFnLm5hbWV9IG9mIHRoZSAke25hbWV9IHBhY2thZ2UgaXMgcmVhZHkgdG8gYmUgYCArXG4gICAgICAgICAgICBgcHVibGlzaGVkIHRvIE5QTS5gLFxuICAgICAgICAgICAgdGV4dDogYFdoZW4gcHVibGlzaGluZywgYmUgc3VyZSB5b3VyIGxvY2FsIHJlcG9zaXRvcnkgaXMgYXQgYCArXG4gICAgICAgICAgICBgdGhhdCBleGFjdCB2ZXJzaW9uOiBcXGBnaXQgY2hlY2tvdXQgJHt0YWcubmFtZX0gJiYgbnBtIGAgK1xuICAgICAgICAgICAgYHB1Ymxpc2hcXGAuYCxcbiAgICAgICAgICBmaWVsZHM6IE9iamVjdC5rZXlzKHRhZykubWFwKChrKSA9PiB7XG4gICAgICAgICAgICBsZXQgc3RyaW5nVmFsdWUgPSB0eXBlb2YgdGFnW2tdID09PSAnc3RyaW5nJyA/IHRhZ1trXSA6XG4gICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkodGFnW2tdKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIHRpdGxlOiBrLFxuICAgICAgICAgICAgICB2YWx1ZTogc3RyaW5nVmFsdWUsXG4gICAgICAgICAgICAgIHNob3J0OiBzdHJpbmdWYWx1ZS5sZW5ndGggPCAyMFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBtcmtkd25faW46IFsncHJldGV4dCcsICd0ZXh0J11cbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIC4uLnN1Y2Nlc3NNZXNzYWdlRm9ybWF0XG4gICAgfSk7XG4gIH0sXG4gIGxvZ2dlci5lcnJvclxuKTtcblxuZnVuY3Rpb24gZ2V0UGFja2FnZVN0YXR1cyhwYWNrYWdlTmFtZSwgYnJhbmNoKSB7XG4gIGxldCBnZXRSZXBvRGF0YSA9IGdpdGh1Yi5mb3JSZXBvKHBhY2thZ2VOYW1lKTtcbiAgcmV0dXJuIGdldFJlcG9EYXRhKCd0YWdzJylcbiAgLm1hcChcbiAgICAodGFncykgPT4gT2JzZXJ2YWJsZS5mb3JrSm9pbihcbiAgICAgIE9ic2VydmFibGUuanVzdCh0YWdzKSxcbiAgICAgIGdldFJlcG9EYXRhKCdjb250ZW50cycsICcvJywgYnJhbmNoKSxcbiAgICAgIGdldFJlcG9EYXRhKCdzdGF0dXNlcycsIGJyYW5jaCksXG4gICAgICBnZXRSZXBvRGF0YSgnY29tbWl0cycpLFxuICAgICAgZ2V0TnBtU3RhdHVzKHBhY2thZ2VOYW1lKSxcbiAgICAgICh0YWdzLCBjb250ZW50cywgc3RhdHVzZXMsIGNvbW1pdHMsIG5wbUluZm8pID0+XG4gICAgICAgICh7IHRhZ3MsIGNvbnRlbnRzLCBzdGF0dXNlcywgY29tbWl0cywgbnBtSW5mbyB9KVxuICAgIClcbiAgKS5jb25jYXRBbGwoKS5tYXAoXG4gICAgKGRhdGEpID0+ICh7XG4gICAgICBsYXRlc3RHb29kVGFnOiBkYXRhLnRhZ3MuZmluZChcbiAgICAgICAgKHRhZykgPT4gYWxsQ2lTdWNjZWVkZWQoe1xuICAgICAgICAgIHJlcG9zaXRvcnk6IHsgbmFtZTogcGFja2FnZU5hbWUgfSxcbiAgICAgICAgICBzaGE6IHRhZy5jb21taXQuc2hhLFxuICAgICAgICAgIHN0YXR1c2VzOiBkYXRhLnN0YXR1c2VzLmZpbHRlcihcbiAgICAgICAgICAgICh7IHVybCB9KSA9PiB+dXJsLmluZGV4T2YodGFnLmNvbW1pdC5zaGEpXG4gICAgICAgICAgKSxcbiAgICAgICAgICBjb250ZW50czogZGF0YS5jb250ZW50c1xuICAgICAgICB9KVxuICAgICAgKSxcbiAgICAgIGNpUHJvdmlkZXJzQ29uZmlndXJlZDogY29uZi5jaVByb3ZpZGVycy5maWx0ZXIoXG4gICAgICAgICh7IGNvbmZpZ0ZpbGUgfSkgPT5cbiAgICAgICAgICBkYXRhLmNvbnRlbnRzLnNvbWUoKHsgcGF0aCB9KSA9PiBwYXRoID09PSBjb25maWdGaWxlKVxuICAgICAgKSxcbiAgICAgIC4uLmRhdGFcbiAgICB9KVxuICApXG59XG5cbmZ1bmN0aW9uIGZvcm1hdFBhY2thZ2VTdGF0dXMoZCkge1xuICBsZXQge1xuICAgIHBhY2thZ2VOYW1lLFxuICAgIGJyYW5jaCxcbiAgICBucG1JbmZvLFxuICAgIGNvbnRlbnRzLFxuICAgIGxhdGVzdEdvb2RUYWcsXG4gICAgY29tbWl0cyxcbiAgICBjaVByb3ZpZGVyc0NvbmZpZ3VyZWRcbiAgfSA9IGQ7XG4gIGxvZ2dlci5pbmZvKCdhYm91dCB0byBmb3JtYXQgYSBzdGF0dXMgbWVzc2FnZScsIHBhY2thZ2VOYW1lLCBicmFuY2gpO1xuICBsZXQgc3RhdHVzID0ge1xuICAgIGZpZWxkczoge31cbiAgfTtcbiAgbGV0IHJlYWR5Rm9yUHVibGlzaCA9IGZhbHNlO1xuICBsZXQgaGVhZElzUHVibGlzaGFibGUgPSBmYWxzZTtcblxuICBpZiAoIWNvbnRlbnRzLnNvbWUoKHsgcGF0aCB9KSA9PiBwYXRoID09PSAncGFja2FnZS5qc29uJykpIHtcbiAgICBzdGF0dXMuZ29vZCA9IGZhbHNlO1xuICAgIHN0YXR1cy50aXRsZSA9ICdOdXRzISc7XG4gICAgc3RhdHVzLnRleHQgPSBgVGhlIFxcYCR7cGFja2FnZU5hbWV9XFxgIHJlcG9zaXRvcnkgZG9lcyBub3QgYXBwZWFyIHRvIGAgK1xuICAgICAgYGhhdmUgYSBcXGBwYWNrYWdlLmpzb25cXGAgZmlsZSwgc28sIG5vdCB0byBwdXQgdG9vIGZpbmUgYSBwb2ludCBvbiBpdCwgYCArXG4gICAgICBgYnV0IEkgZG9uJ3QgY2FyZSBhYm91dCBpdC5gO1xuICAgIHJldHVybiBzdGF0dXM7XG4gIH1cblxuICBzdGF0dXMuZmllbGRzWydDSSBQcm92aWRlcnMgQ29uZmlndXJlZCddID1cbiAgICBjaVByb3ZpZGVyc0NvbmZpZ3VyZWQubGVuZ3RoID4gMCA/XG4gICAgICBjaVByb3ZpZGVyc0NvbmZpZ3VyZWQubWFwKCh7IG5hbWUgfSkgPT4gbmFtZSkuam9pbignLCAnKVxuICAgICAgOlxuICAgICAgJ19Ob25lLiBJIHJlY29tbWVuZCBhdCBsZWFzdCBvbmUuXyc7XG5cbiAgaWYgKCFsYXRlc3RHb29kVGFnKSB7XG4gICAgc3RhdHVzLnRpdGxlID0gJ0ppbmtpZXMhJztcbiAgICBzdGF0dXMuZ29vZCA9IGZhbHNlO1xuICAgIHN0YXR1cy50ZXh0ID0gYEkgY291bGRuJ3QgZmluZCBhbnkgdGFnZ2VkIHZlcnNpb25zIGluIHRoZSBgICtcbiAgICAgIGBcXGAke3BhY2thZ2VOYW1lfVxcYCByZXBvc2l0b3J5IHRoYXQgaGFkIHN1Y2Nlc3NmdWxseSBidWlsdC5gO1xuICAgIHJldHVybiBzdGF0dXM7XG4gIH1cblxuICBzdGF0dXMuZmllbGRzWydMYXRlc3QgdmFsaWQgdGFnIGluIHJlcG8nXSA9IGxhdGVzdEdvb2RUYWcubmFtZTtcbiAgbG9nZ2VyLm5vdGljZSgnbGF0ZXN0IGdvb2QgdGFnJywgbGF0ZXN0R29vZFRhZyk7XG4gIC8vIHN0YXR1cy5maWVsZHNbJ0xhdGVzdCB0YWcgY3JlYXRlZCddID1cbiAgLy8gICBtb21lbnQoKVxuICBoZWFkSXNQdWJsaXNoYWJsZSA9IGxhdGVzdEdvb2RUYWcgJiZcbiAgICBsYXRlc3RHb29kVGFnLmNvbW1pdC5zaGEgPT09IGNvbW1pdHNbMF0uc2hhO1xuXG4gIGlmICghaGVhZElzUHVibGlzaGFibGUpIHtcbiAgICBzdGF0dXMuZmllbGRzWydEb25cXCd0IHB1Ymxpc2ggSEVBRCEnXSA9IGBUaGUgdGlwIG9mIHRoZSBcXGAke2JyYW5jaH1cXGAgYCArXG4gICAgICBgYnJhbmNoIG9mIHRoZSBcXGAke3BhY2thZ2VOYW1lfVxcYCByZXBvc2l0b3J5IGhhcyBtb3ZlZCBhaGVhZCBvZiB0aGUgYCArXG4gICAgICBgbGF0ZXN0IGtub3duLWdvb2QgdGFnLCBzbyBkb24ndCBydW4gXFxgbnBtIHB1Ymxpc2hcXGAgd2lsbHktbmlsbHk7IGAgK1xuICAgICAgYHVzZSBcXGBnaXQgY2hlY2tvdXRcXGAgdG8gZ2V0IHlvdXIgd29ya2luZyB0cmVlIGludG8gYSBrbm93bi1nb29kIGAgK1xuICAgICAgYHN0YXRlIGZpcnN0LmA7XG4gIH1cblxuICBpZiAoIW5wbUluZm8gfHwgIW5wbUluZm8udmVyc2lvbnMpIHtcbiAgICBzdGF0dXMuZmllbGRzWydDdXJyZW50IHZlcnNpb24gb24gTlBNJ10gPSAnX05ldmVyIHB1Ymxpc2hlZCFfJztcbiAgICBpZiAoY2lQcm92aWRlcnNDb25maWd1cmVkLmxlbmd0aCA+IDApIHtcbiAgICAgIHN0YXR1cy50ZXh0ID0gYEkgY291bGRuJ3QgZmluZCB0aGUgXFxgJHtwYWNrYWdlTmFtZX1cXGAgcGFja2FnZSBvbiBOUE0sIGAgK1xuICAgICAgICBgYnV0IHRoZSAke2xhdGVzdEdvb2RUYWcubmFtZX0gdGFnIGluIHRoZSByZXBvc2l0b3J5IGhhcyBwYXNzZWQgQ0ksIGAgK1xuICAgICAgICBgc28gd2UncmUgcmVhZHkgZm9yIGFuIGluaXRpYWwgcHVibGlzaCB0byBOUE0hYFxuICAgICAgcmVhZHlGb3JQdWJsaXNoID0gdHJ1ZTtcbiAgICAgIHN0YXR1cy5nb29kID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RhdHVzLnRleHQgPSBgSSBjb3VsZG4ndCBmaW5kIHRoZSBcXGAke3BhY2thZ2VOYW1lfVxcYCBwYWNrYWdlIG9uIE5QTSwgYCArXG4gICAgICAgIGBhbmQgdGhlIHJlcG8gaGFzIG5vIENJIGNvbmZpZ3VyZWQsIHNvIEkgZG9uJ3Qga25vdyBmb3Igc3VyZSBgICtcbiAgICAgICAgYHdoZXRoZXIgdGhlIGxhdGVzdCB0YWcsICR7bGF0ZXN0R29vZFRhZy5uYW1lfSwgaXMgcmVhZHkuICpQdWJsaXNoIGAgK1xuICAgICAgICBgdG8gTlBNIGF0IHlvdXIgb3duIHJpc2suKmA7XG4gICAgICBzdGF0dXMuZ29vZCA9IGZhbHNlO1xuICAgICAgc3RhdHVzLmZpZWxkc1snUmVhZHkgZm9yIHB1Ymxpc2g/J10gPSAnOnF1ZXN0aW9uOic7XG4gICAgICByZXR1cm4gc3RhdHVzO1xuICAgIH1cbiAgfVxuXG4gIGxldCBucG1WZXJzaW9ucyA9IE9iamVjdC5rZXlzKG5wbUluZm8udmVyc2lvbnMpXG4gICAgLnNvcnQoc2VtdmVyLnJjb21wYXJlKVxuICAgIC5tYXAoKHYpID0+IG5wbUluZm8udmVyc2lvbnNbdl0pO1xuICBsZXQgY3VycmVudE5wbSA9IG5wbVZlcnNpb25zWzBdO1xuXG4gIHN0YXR1cy5maWVsZHNbJ0N1cnJlbnQgdmVyc2lvbiBvbiBOUE0nXSA9XG4gICAgYDxodHRwOi8vbnBtanMub3JnL3BhY2thZ2UvJHtwYWNrYWdlTmFtZX18JHtjdXJyZW50TnBtLnZlcnNpb259PmA7XG4gIHN0YXR1cy5maWVsZHNbJ0xhc3QgcHVibGlzaGVkIHRvIE5QTSddID1cbiAgICBtb21lbnQobnBtSW5mby50aW1lW2N1cnJlbnROcG0udmVyc2lvbl0pLmZyb21Ob3coKTtcblxuICBzd2l0Y2goc2VtdmVyLmNvbXBhcmUoY3VycmVudE5wbS52ZXJzaW9uLCBsYXRlc3RHb29kVGFnLm5hbWUpKSB7XG4gICAgY2FzZSAwOlxuICAgICAgc3RhdHVzLmdvb2QgPSB0cnVlO1xuICAgICAgcmVhZHlGb3JQdWJsaXNoID0gZmFsc2U7XG4gICAgICAvLyBUT0RPOiBjb21wYXJlIHRoZSBjdXJyZW50TnBtLmdpdEhlYWQgYW5kIGxhdGVzdEdvb2RUYWcuY29tbWl0LnNoYVxuICAgICAgLy8gYW5kIHNheSBzb21ldGhpbmcgdGVycmlmaWVkIGlmIHRoZXkgYXJlbid0IHRoZSBzYW1lXG4gICAgICAvLyBhbHNvIFRPRE8gY2hlY2sgcGFja2FnZS5qc29uIHRvIG1ha2Ugc3VyZSBpdCdzIHdoYXQgaXQgc2hvdWxkIGJlXG4gICAgICBzdGF0dXMudGV4dCA9IGBOUE0gaXMgYWxyZWFkeSB1cCB0byBkYXRlIHdpdGggdGhlIGxhdGVzdCBnb29kIHZlcnNpb24gYCArXG4gICAgICAgIGBvZiBcXGAke3BhY2thZ2VOYW1lfVxcYCwgKiR7Y3VycmVudE5wbS52ZXJzaW9ufSpgXG4gICAgICBicmVhaztcbiAgICBjYXNlIC0xOlxuICAgICAgc3RhdHVzLmdvb2QgPSB0cnVlO1xuICAgICAgcmVhZHlGb3JQdWJsaXNoID0gdHJ1ZTtcbiAgICAgIHN0YXR1cy50ZXh0ID0gYFRoZSBjdXJyZW50IHZlcnNpb24gb2YgXFxgJHtwYWNrYWdlTmFtZX1cXGAgcHVibGlzaGVkIHRvIGAgK1xuICAgICAgICBgTlBNIGlzICoke2N1cnJlbnROcG0udmVyc2lvbn0qLCBhbmQgdGhlIHJlcG9zaXRvcnkgaXMgYWhlYWQgYnkgYXQgYCArXG4gICAgICAgIGBsZWFzdCBvbmUgJHtzZW12ZXIuZGlmZihjdXJyZW50TnBtLnZlcnNpb24sIGxhdGVzdEdvb2RUYWcubmFtZSl9IGAgK1xuICAgICAgICBgdmVyc2lvbjogaXQncyBhdCAqJHtsYXRlc3RHb29kVGFnLm5hbWV9Ki4gKlJlYWR5IHRvIHB1Ymxpc2ghKmA7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDE6XG4gICAgICBzdGF0dXMuZ29vZCA9IGZhbHNlO1xuICAgICAgcmVhZHlGb3JQdWJsaXNoID0gZmFsc2U7XG4gICAgICBzdGF0dXMudGV4dCA9IGAqTm90IGdvb2QuKiBUaGUgY3VycmVudCB2ZXJzaW9uIG9mIFxcYCR7cGFja2FnZU5hbWV9XFxgIGAgK1xuICAgICAgICBgcHVibGlzaGVkIHRvIE5QTSBpcyAqJHtjdXJyZW50TnBtLnZlcnNpb259KiwgYnV0IHRoZSByZXBvc2l0b3J5J3MgYCArXG4gICAgICAgIGBsYXRlc3QgZ29vZCB2ZXJzaW9uIGlzICoke2xhdGVzdEdvb2RUYWcubmFtZX0qLCB3aGljaCBpcyBhdCBsZWFzdCBgICtcbiAgICAgICAgYG9uZSAke3NlbXZlci5kaWZmKGN1cnJlbnROcG0udmVyc2lvbiwgbGF0ZXN0R29vZFRhZy5uYW1lKX0gdmVyc2lvbiBgICtcbiAgICAgICAgYGJlaGluZC4gV2FzIGEgdmVyc2lvbiBwdWJsaXNoZWQgYmVmb3JlIGl0IGhhZCBidWlsdCBzdWNjZXNzZnVsbHk/IGAgK1xuICAgICAgICBgV2FzIGEgdmVyc2lvbiBwdWJsaXNoZWQgZnJvbSBhIGRpZmZlcmVudCBicmFuY2ggdGhhbiBcXGAke2JyYW5jaH1cXGBgICtcbiAgICAgICAgYD8gKlBsZWFzZSBpbnZlc3RpZ2F0ZS4qYFxuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHN0YXR1cy5nb29kID0gZmFsc2U7XG4gICAgICBzdGF0dXMudGV4dCA9IGBUaGUgZW50aXJlIHdvcmxkIGlzIG9uIGZpcmUuYDtcbiAgICAgIGJyZWFrO1xuICB9XG5cbiAgaWYgKHJlYWR5Rm9yUHVibGlzaCkge1xuICAgIHN0YXR1cy5maWVsZHNbJ1JlYWR5IGZvciBwdWJsaXNoPyddID0gJzp3aGl0ZV9jaGVja19tYXJrOic7XG4gICAgc3RhdHVzLmZpZWxkc1snUnVuIGNvbW1hbmQ6J10gPSBoZWFkSXNQdWJsaXNoYWJsZSA/XG4gICAgICAnYG5wbSBwdWJsaXNoYCcgOlxuICAgICAgYFxcYGdpdCBjaGVja291dCAke2xhdGVzdEdvb2RUYWcubmFtZX07IG5wbSBwdWJsaXNoXFxgYDtcbiAgfSBlbHNlIHtcbiAgICBzdGF0dXMuZmllbGRzWydSZWFkeSBmb3IgcHVibGlzaD8nXSA9ICc6eDonXG4gIH1cblxuICByZXR1cm4gc3RhdHVzO1xufVxuXG5kb2Jicy5oZWFycyhcbiAgWydzdGF0dXMgKFtBLVphLXowLTlcXC1cXC5cXF9dKykoPzogKFtBLVphLXowLTlcXC1cXC9cXF9dKykpPyddLFxuICBbJ2RpcmVjdF9tZW50aW9uJ10sXG4gIChkb2JicywgbXNnKSA9PiB7XG4gICAgbGV0IHBhY2thZ2VOYW1lID0gbXNnLm1hdGNoWzFdO1xuICAgIGxldCBicmFuY2ggPSBtc2cubWF0Y2hbMl0gfHwgJ21hc3Rlcic7XG4gICAgbG9nZ2VyLmluZm8oJ3BhY2thZ2Ugc3RhdHVzIHJlcXVlc3RlZCcsIHBhY2thZ2VOYW1lLCBtc2cpO1xuXG4gICAgbGV0IHBhY2thZ2VTdGF0dXMkID0gZ2V0UGFja2FnZVN0YXR1cyhwYWNrYWdlTmFtZSwgYnJhbmNoKTtcblxuICAgIHBhY2thZ2VTdGF0dXMkLnN1YnNjcmliZSgoZGF0YSkgPT4ge1xuICAgICAgbGV0IHN0YXR1cyA9IGZvcm1hdFBhY2thZ2VTdGF0dXMoeyBwYWNrYWdlTmFtZSwgYnJhbmNoLCAuLi5kYXRhfSk7XG4gICAgICBkb2Jicy5yZXBseShtc2csIHtcbiAgICAgICAgdGV4dDogYFN0YXR1cyBmb3IgXFxgJHtwYWNrYWdlTmFtZX1cXGBgLFxuICAgICAgICBhdHRhY2htZW50czogW3tcbiAgICAgICAgICBjb2xvcjogc3RhdHVzLmdvb2QgPyBzdWNjZXNzQ29sb3IgOiBlcnJvckNvbG9yLFxuICAgICAgICAgIHRpdGxlOiBzdGF0dXMudGl0bGUgfHwgKHN0YXR1cy5nb29kID8gJ0dvb2QgTmV3cyEnIDogJ0tlZXAgQ2FsbSEnKSxcbiAgICAgICAgICB0ZXh0OiBzdGF0dXMudGV4dCxcbiAgICAgICAgICBmaWVsZHM6IE9iamVjdC5rZXlzKHN0YXR1cy5maWVsZHMpLm1hcCgoaykgPT4gKHtcbiAgICAgICAgICAgIHRpdGxlOiBrLFxuICAgICAgICAgICAgdmFsdWU6IHN0YXR1cy5maWVsZHNba10sXG4gICAgICAgICAgICBzaG9ydDogc3RhdHVzLmZpZWxkc1trXS5sZW5ndGggPCAyMFxuICAgICAgICAgIH0pKSxcbiAgICAgICAgICBtcmtkd25faW46IFsndGV4dCcsICdmaWVsZHMnXVxuICAgICAgICB9XSxcbiAgICAgICAgbXJrZHduX2luOiBbJ3RleHQnLCAnZmllbGRzJ10sXG4gICAgICAgIC4uLnN0YW5kYXJkTWVzc2FnZUZvcm1hdFxuICAgICAgfSk7XG4gICAgfSxcbiAgICAoZSkgPT4ge1xuICAgICAgbG9nZ2VyLmVycm9yKCdzdGF0dXMgY2hlY2sgZmFpbGVkJywgZSk7XG4gICAgICBsZXQgcmVwbHkgPSB7Li4uZXJyb3JNZXNzYWdlRm9ybWF0fTtcbiAgICAgIGlmIChlLnN0YXR1c0NvZGUgPT09IDQwNCAmJlxuICAgICAgICAgIGUuaGVhZGVycyAmJlxuICAgICAgICAgIGUuaGVhZGVycy5zZXJ2ZXIgPT09ICdHaXRIdWIuY29tJykge1xuICAgICAgICByZXBseS50ZXh0ID0gYENvdWxkIG5vdCBmaW5kIFxcYCR7cGFja2FnZU5hbWV9XFxgIGluIHRoZSBgICtcbiAgICAgICAgICBgXFxgJHtjb25mLmdpdGh1Yk9yZ31cXGAgR2l0SHViIG9yZ2FuaXphdGlvbi4gSXMgaXQgcHJpdmF0ZT8gX0RvZXMgYCArXG4gICAgICAgICAgYGl0IGV2ZW4gZXhpc3Q/X2A7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXBseS50ZXh0ID0gYEJveSwgSSBoYWQgYSBkb296eSBvZiBhIHRpbWUgdHJ5aW5nIHRvIGRvIHRoYXQuIEhlcmUgYCArXG4gICAgICAgICAgYGlzIHRoZSBlcnJvci5gO1xuICAgICAgICByZXBseS5hdHRhY2htZW50cyA9IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBjb2xvcjogZXJyb3JDb2xvcixcbiAgICAgICAgICAgIHRpdGxlOiBlLm1lc3NhZ2UsXG4gICAgICAgICAgICB0ZXh0OiAnYGBgXFxuJyArIGluc3BlY3QoZSkgKyAnXFxuYGBgJ1xuICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICAgIH1cbiAgICAgIGRvYmJzLnJlcGx5KG1zZywgcmVwbHkpO1xuICAgIH0pO1xuICB9XG4pO1xuIl19
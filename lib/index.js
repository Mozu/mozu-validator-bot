'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

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

successfulBuilds$.subscribeOnNext(_ref16 => {
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
});

successfulBuilds$.subscribeOnError(logger.error);

function getPackageStatus(packageName, branch) {
  let getRepoData = github.forRepo(packageName);
  return getRepoData('tags').map(tags => Observable.just(tags).forkJoin(getRepoData('contents', '/', branch), getRepoData('commits'), (tags, contents, commits) => ({ tags, contents, commits }))).concatAll().map(data => _extends({
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

  status.fields['CI Providers Configured'] = ciProvidersConfigured.length > 0 ? ciProvidersConfigured.map(_ref20 => {
    let name = _ref20.name;
    return name;
  }).join(', ') : '_None. I recommend at least one._';

  if (!latestGoodTag) {
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

  if (!npmInfo) {
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

  packageStatus$.subscribeOnNext(data => {
    let status = formatPackageStatus(_extends({ packageName, branch }, data));
    dobbs.reply(msg, _extends({
      text: `Status for \`${ packageName }\``,
      attachments: [{
        color: status.good ? successColor : errorColor,
        title: status.good ? 'Good News!' : 'Keep Calm!',
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
  });

  packageStatus$.subscribeOnError(e => {
    logger.error('error getting package status', e);
  });
});
//# sourceMappingURL=data:application/json;base64,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LFlBQUksRUFBRSxNQUFNLENBQUMsSUFBSTtBQUNqQixjQUFNLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLEFBQUMsQ0FBQyxLQUFNO0FBQzdDLGVBQUssRUFBRSxDQUFDO0FBQ1IsZUFBSyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQ3ZCLGVBQUssRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxFQUFFO1NBQ3BDLENBQUMsQ0FBQztBQUNILGlCQUFTLEVBQUUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDO09BQzlCLENBQUM7QUFDRixlQUFTLEVBQUUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDO09BQzFCLHFCQUFxQixFQUN4QixDQUFDO0dBQ0osQ0FBQyxDQUFDOztBQUVILGdCQUFjLENBQUMsZ0JBQWdCLENBQUMsQUFBQyxDQUFDLElBQUs7QUFDckMsVUFBTSxDQUFDLEtBQUssQ0FBQyw4QkFBOEIsRUFBRSxDQUFDLENBQUMsQ0FBQztHQUNqRCxDQUFDLENBQUM7Q0FDSixDQUNGLENBQUMiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUnggZnJvbSAncngnO1xuaW1wb3J0IHsgc2xhY2tib3QgfSBmcm9tICdib3RraXQnO1xuaW1wb3J0IGZldGNoIGZyb20gJ25vZGUtZmV0Y2gnO1xuaW1wb3J0IHNlbXZlciBmcm9tICdzZW12ZXInO1xuaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnO1xuaW1wb3J0IGNvbmYgZnJvbSAnLi9jb25mJztcbmltcG9ydCBMb2dnZXIgZnJvbSAnLi9sb2dnZXInO1xuaW1wb3J0IEdpdGh1YkNsaWVudCBmcm9tICcuL2dpdGh1Yi1jbGllbnQnO1xuaW1wb3J0IGZyaXZvbGl0eSBmcm9tICcuL2ZyaXZvbGl0eSc7XG5pbXBvcnQgR2l0aHViSG9vayBmcm9tICcuL2dpdGh1Yi1ob29rLWxpc3RlbmVyJztcblxuaWYgKGNvbmYubG9nTGV2ZWwgPiA1KSBSeC5jb25maWcubG9uZ1N0YWNrU3VwcG9ydCA9IHRydWU7XG5jb25zdCB7IE9ic2VydmFibGUgfSA9IFJ4O1xuXG5jb25zdCBsb2dnZXIgPSBMb2dnZXIoY29uZik7XG5jb25zdCBnaXRodWIgPSBHaXRodWJDbGllbnQoeyBsb2dnZXIsIC4uLmNvbmYgfSk7XG5jb25zdCBib3RDb250cm9sbGVyID0gc2xhY2tib3QoeyBsb2dnZXIgfSk7XG5jb25zdCBnaXRodWJIb29rID0gR2l0aHViSG9vayh7IGxvZ2dlciwgLi4uY29uZiB9KTtcblxuY29uc3QgYm90ID0gYm90Q29udHJvbGxlci5zcGF3bih7IFxuICB0b2tlbjogY29uZi5zbGFja1Rva2VuLFxuICBpbmNvbWluZ193ZWJob29rOiB7XG4gICAgdXJsOiBjb25mLnNsYWNrV2ViaG9va1VybFxuICB9XG59KS5zdGFydFJUTSgpO1xuXG5jb25zdCBkb2JicyA9IGZyaXZvbGl0eShjb25mLCBib3RDb250cm9sbGVyKTtcblxuY29uc3Qgc3VjY2Vzc0NvbG9yID0gJyMxREVEMDUnO1xuY29uc3QgZXJyb3JDb2xvciA9ICcjRDAwRDAwJztcblxuY29uc3Qgc3RhbmRhcmRNZXNzYWdlRm9ybWF0ID0ge1xuICBpY29uX3VybDogY29uZi5ib3RJY29uLFxuICB1c2VybmFtZTogY29uZi5ib3ROYW1lXG59O1xuXG5jb25zdCBzdWNjZXNzTWVzc2FnZUZvcm1hdCA9IHtcbiAgaWNvbl91cmw6IGNvbmYuc3VjY2Vzc0ljb24sXG4gIHVzZXJuYW1lOiBjb25mLmJvdE5hbWVcbn07XG5cbmNvbnN0IGVycm9yTWVzc2FnZUZvcm1hdCA9IHtcbiAgaWNvbl91cmw6IGNvbmYuZXJyb3JJY29uLFxuICB1c2VybmFtZTogY29uZi5ib3ROYW1lXG59O1xuXG5mdW5jdGlvbiBhbGxDaVN1Y2NlZWRlZCh7IHJlcG9zaXRvcnksIHNoYSwgc3RhdHVzZXMsIGNvbnRlbnRzIH0pIHtcbiAgbGV0IHN1Y2Nlc3NlcyA9IHN0YXR1c2VzLmZpbHRlcigoeyBzdGF0ZSB9KSA9PiBzdGF0ZSA9PT0gJ3N1Y2Nlc3MnKTtcbiAgcmV0dXJuIGNvbmYuY2lQcm92aWRlcnMuZXZlcnkoXG4gICAgKHsgbmFtZSwgY29uZmlnRmlsZSwgc3RhdHVzQ29udGV4dCB9KSA9PiB7XG4gICAgICBsZXQgaXNDb25maWd1cmVkID0gY29udGVudHMuc29tZSgoeyBwYXRoIH0pID0+IHBhdGggPT09IGNvbmZpZ0ZpbGUpO1xuICAgICAgbGV0IHN1Y2Nlc3NGb3VuZCA9ICFpc0NvbmZpZ3VyZWQgfHxcbiAgICAgICAgc3VjY2Vzc2VzLmZpbmQoKHsgY29udGV4dCB9KSA9PiBjb250ZXh0ID09PSBzdGF0dXNDb250ZXh0KTtcbiAgICAgIGlmIChpc0NvbmZpZ3VyZWQgJiYgc3VjY2Vzc0ZvdW5kKSB7XG4gICAgICAgIGxvZ2dlci5ub3RpY2UoXG4gICAgICAgICAgYCR7bmFtZX0gYnVpbGQgc3VjY2VzcyBmb3IgJHtyZXBvc2l0b3J5Lm5hbWV9IyR7c2hhfSwgdHJpZ2dlcmVkIGJ5YCxcbiAgICAgICAgICBzdWNjZXNzRm91bmRcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAhIXN1Y2Nlc3NGb3VuZDtcbiAgICB9XG4gIClcbn1cblxuZnVuY3Rpb24gZ2V0TnBtU3RhdHVzKHBhY2thZ2VOYW1lKSB7XG4gIHJldHVybiBPYnNlcnZhYmxlLmZyb21Qcm9taXNlKFxuICAgIGZldGNoKGNvbmYubnBtUmVnaXN0cnkgKyBwYWNrYWdlTmFtZSlcbiAgICAgIC50aGVuKChyZXMpID0+IHJlcy5qc29uKCkpXG4gICAgICAuY2F0Y2goKCkgPT4gZmFsc2UpXG4gICk7XG59XG5cbmxldCBzdWNjZXNzZnVsQnVpbGRzJCA9IGdpdGh1Ykhvb2suaW5jb21pbmcuZmlsdGVyKFxuICAoeyBldmVudCwgZGF0YSB9KSA9PiBldmVudCA9PT0gJ3N0YXR1cycgJiYgZGF0YS5zdGF0ZSA9PT0gJ3N1Y2Nlc3MnXG4pLmRvKFxuICAoeyBkYXRhIH0pID0+IGxvZ2dlci5pbmZvKCdSZWNlaXZlZCBzdWNjZXNzIG5vdGlmaWNhdGlvbicsIGRhdGEpXG4pLm1hcChcbiAgKHsgZGF0YSB9KSA9PiB7XG4gICAgbGV0IGdldFJlcG9EYXRhID0gZ2l0aHViLmZvclJlcG8oZGF0YS5yZXBvc2l0b3J5Lm5hbWUpO1xuICAgIHJldHVybiBPYnNlcnZhYmxlLmZvcmtKb2luKFxuICAgICAgT2JzZXJ2YWJsZS5qdXN0KGRhdGEpLFxuICAgICAgZ2V0UmVwb0RhdGEoJ3N0YXR1c2VzJywgZGF0YS5zaGEpLFxuICAgICAgZ2V0UmVwb0RhdGEoJ2NvbnRlbnRzJywgJy8nLCBkYXRhLnNoYSksXG4gICAgICAoeyByZXBvc2l0b3J5LCBzaGEgfSwgc3RhdHVzZXMsIGNvbnRlbnRzICkgPT5cbiAgICAgICAgKHsgcmVwb3NpdG9yeSwgc2hhLCBzdGF0dXNlcywgY29udGVudHMgfSlcbiAgICApO1xuICB9XG4pLmNvbmNhdEFsbCgpLmZpbHRlcihcbiAgKHsgcmVwb3NpdG9yeSwgc2hhLCBzdGF0dXNlcywgY29udGVudHMgfSkgPT4ge1xuICAgIGxvZ2dlci5pbmZvKCdSZWNlaXZlZCBmdWxsIHN0YXR1cyBmb3InLCByZXBvc2l0b3J5Lm5hbWUsICBzaGEpO1xuICAgIGxldCBoYXNQa2cgPSBjb250ZW50cy5zb21lKCh7IHBhdGggfSkgPT4gcGF0aCA9PT0gJ3BhY2thZ2UuanNvbicpO1xuICAgIHJldHVybiBoYXNQa2cgJiYgYWxsQ2lTdWNjZWVkZWQoeyByZXBvc2l0b3J5LCBzaGEsIHN0YXR1c2VzLCBjb250ZW50cyB9KTtcbiAgfVxuKS5tYXAoXG4gICh7IHJlcG9zaXRvcnksIHNoYSB9KSA9PiBPYnNlcnZhYmxlLmZvcmtKb2luKFxuICAgIE9ic2VydmFibGUub2YoeyByZXBvc2l0b3J5LCBzaGEgfSksXG4gICAgZ2l0aHViLmZvclJlcG8ocmVwb3NpdG9yeS5uYW1lKSgndGFncycpLFxuICAgICh7IHJlcG9zaXRvcnksIHNoYSB9LCB0YWdzKSA9PlxuICAgICAgKHtcbiAgICAgICAgcmVwb3NpdG9yeSxcbiAgICAgICAgc2hhLFxuICAgICAgICB0YWc6IHRhZ3MuZmluZCgoeyBjb21taXQgfSkgPT4gY29tbWl0ICYmIGNvbW1pdC5zaGEgPT09IHNoYSlcbiAgICAgIH0pXG4gIClcbikuY29uY2F0QWxsKCkuZmlsdGVyKCh7IHRhZyB9KSA9PiB0YWcgJiYgc2VtdmVyLmNsZWFuKHRhZy5uYW1lKSk7XG5cbnN1Y2Nlc3NmdWxCdWlsZHMkLnN1YnNjcmliZU9uTmV4dCgoeyByZXBvc2l0b3J5LCBzaGEsIHRhZyB9KSA9PiB7XG4gIGxldCBuYW1lID0gcmVwb3NpdG9yeS5uYW1lO1xuICBsb2dnZXIubm90aWNlKFxuICAgICdnb25uYSBub3RpZnkgQ0kgc3VjY2VzcyBvbiB0YWcnLCBuYW1lLCBzaGFcbiAgKTtcbiAgYm90LnNlbmRXZWJob29rKHtcbiAgICBjaGFubmVsOiBjb25mLnN0YXR1c0NoYW5uZWwsXG4gICAgYXR0YWNobWVudHM6IFtcbiAgICAgIHtcbiAgICAgICAgY29sb3I6IHN1Y2Nlc3NDb2xvcixcbiAgICAgICAgZmFsbGJhY2s6IGAke25hbWV9ICR7dGFnLm5hbWV9IHJlYWR5IGZvciBwdWJsaXNoLmAsXG4gICAgICAgIHByZXRleHQ6IGBucG0gcGFja2FnZSBidWlsZCBzdWNjZXNzIGZvciBcXGAke25hbWV9XFxgIWAsXG4gICAgICAgIHRpdGxlOiBgJHt0YWcubmFtZX0gb2YgdGhlICR7bmFtZX0gcGFja2FnZSBpcyByZWFkeSB0byBiZSBgICtcbiAgICAgICAgICBgcHVibGlzaGVkIHRvIE5QTS5gLFxuICAgICAgICB0ZXh0OiBgV2hlbiBwdWJsaXNoaW5nLCBiZSBzdXJlIHlvdXIgbG9jYWwgcmVwb3NpdG9yeSBpcyBhdCBgICtcbiAgICAgICAgICBgdGhhdCBleGFjdCB2ZXJzaW9uOiBcXGBnaXQgY2hlY2tvdXQgJHt0YWcubmFtZX0gJiYgbnBtIGAgK1xuICAgICAgICAgIGBwdWJsaXNoXFxgLmAsXG4gICAgICAgIGZpZWxkczogT2JqZWN0LmtleXModGFnKS5tYXAoKGspID0+IHtcbiAgICAgICAgICBsZXQgc3RyaW5nVmFsdWUgPVxuICAgICAgICAgICAgdHlwZW9mIHRhZ1trXSA9PT0gJ3N0cmluZycgPyB0YWdba10gOlxuICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh0YWdba10pO1xuICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHRpdGxlOiBrLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBzdHJpbmdWYWx1ZSxcbiAgICAgICAgICAgICAgICBzaG9ydDogc3RyaW5nVmFsdWUubGVuZ3RoIDwgMjBcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgfSksXG4gICAgICAgIG1ya2R3bl9pbjogWydwcmV0ZXh0JywgJ3RleHQnXVxuICAgICAgfVxuICAgIF0sXG4gICAgLi4uc3VjY2Vzc01lc3NhZ2VGb3JtYXRcbiAgfSk7XG59KTtcblxuc3VjY2Vzc2Z1bEJ1aWxkcyQuc3Vic2NyaWJlT25FcnJvcihsb2dnZXIuZXJyb3IpO1xuXG5mdW5jdGlvbiBnZXRQYWNrYWdlU3RhdHVzKHBhY2thZ2VOYW1lLCBicmFuY2gpIHtcbiAgbGV0IGdldFJlcG9EYXRhID0gZ2l0aHViLmZvclJlcG8ocGFja2FnZU5hbWUpO1xuICByZXR1cm4gZ2V0UmVwb0RhdGEoJ3RhZ3MnKVxuICAubWFwKFxuICAgICh0YWdzKSA9PiBPYnNlcnZhYmxlLmp1c3QodGFncykuZm9ya0pvaW4oXG4gICAgICBnZXRSZXBvRGF0YSgnY29udGVudHMnLCAnLycsIGJyYW5jaCksXG4gICAgICBnZXRSZXBvRGF0YSgnY29tbWl0cycpLFxuICAgICAgKHRhZ3MsIGNvbnRlbnRzLCBjb21taXRzKSA9PiAoeyB0YWdzLCBjb250ZW50cywgY29tbWl0cyB9KVxuICAgIClcbiAgKS5jb25jYXRBbGwoKS5tYXAoXG4gICAgKGRhdGEpID0+ICh7XG4gICAgICBsYXRlc3RHb29kVGFnOiBkYXRhLnRhZ3MuZmluZChcbiAgICAgICAgKHRhZykgPT4gYWxsQ2lTdWNjZWVkZWQoe1xuICAgICAgICAgIHJlcG9zaXRvcnk6IHsgbmFtZTogcGFja2FnZU5hbWUgfSxcbiAgICAgICAgICBzaGE6IHRhZy5jb21taXQuc2hhLFxuICAgICAgICAgIHN0YXR1c2VzOiBkYXRhLnN0YXR1c2VzLmZpbHRlcihcbiAgICAgICAgICAgICh7IHVybCB9KSA9PiB+dXJsLmluZGV4T2YodGFnLmNvbW1pdC5zaGEpXG4gICAgICAgICAgKSxcbiAgICAgICAgICBjb250ZW50czogZGF0YS5jb250ZW50c1xuICAgICAgICB9KVxuICAgICAgKSxcbiAgICAgIGNpUHJvdmlkZXJzQ29uZmlndXJlZDogY29uZi5jaVByb3ZpZGVycy5maWx0ZXIoXG4gICAgICAgICh7IGNvbmZpZ0ZpbGUgfSkgPT5cbiAgICAgICAgICBkYXRhLmNvbnRlbnRzLnNvbWUoKHsgcGF0aCB9KSA9PiBwYXRoID09PSBjb25maWdGaWxlKVxuICAgICAgKSxcbiAgICAgIC4uLmRhdGFcbiAgICB9KVxuICApXG59XG5cbmZ1bmN0aW9uIGZvcm1hdFBhY2thZ2VTdGF0dXMoZCkge1xuICBsZXQge1xuICAgIHBhY2thZ2VOYW1lLFxuICAgIGJyYW5jaCxcbiAgICBucG1JbmZvLFxuICAgIGNvbnRlbnRzLFxuICAgIGxhdGVzdEdvb2RUYWcsXG4gICAgY29tbWl0cyxcbiAgICBjaVByb3ZpZGVyc0NvbmZpZ3VyZWRcbiAgfSA9IGQ7XG4gIGxvZ2dlci5pbmZvKCdhYm91dCB0byBmb3JtYXQgYSBzdGF0dXMgbWVzc2FnZScsIHBhY2thZ2VOYW1lLCBicmFuY2gpO1xuICBsZXQgc3RhdHVzID0ge1xuICAgIGZpZWxkczoge31cbiAgfTtcbiAgbGV0IHJlYWR5Rm9yUHVibGlzaCA9IGZhbHNlO1xuICBsZXQgaGVhZElzUHVibGlzaGFibGUgPSBmYWxzZTtcblxuICBzdGF0dXMuZmllbGRzWydDSSBQcm92aWRlcnMgQ29uZmlndXJlZCddID1cbiAgICBjaVByb3ZpZGVyc0NvbmZpZ3VyZWQubGVuZ3RoID4gMCA/XG4gICAgICBjaVByb3ZpZGVyc0NvbmZpZ3VyZWQubWFwKCh7IG5hbWUgfSkgPT4gbmFtZSkuam9pbignLCAnKVxuICAgICAgOlxuICAgICAgJ19Ob25lLiBJIHJlY29tbWVuZCBhdCBsZWFzdCBvbmUuXyc7XG5cbiAgaWYgKCFsYXRlc3RHb29kVGFnKSB7XG4gICAgc3RhdHVzLmdvb2QgPSBmYWxzZTtcbiAgICBzdGF0dXMudGV4dCA9IGBJIGNvdWxkbid0IGZpbmQgYW55IHRhZ2dlZCB2ZXJzaW9ucyBpbiB0aGUgYCArXG4gICAgICBgXFxgJHtwYWNrYWdlTmFtZX1cXGAgcmVwb3NpdG9yeSB0aGF0IGhhZCBzdWNjZXNzZnVsbHkgYnVpbHQuYDtcbiAgICByZXR1cm4gc3RhdHVzO1xuICB9XG5cbiAgc3RhdHVzLmZpZWxkc1snTGF0ZXN0IHZhbGlkIHRhZyBpbiByZXBvJ10gPSBsYXRlc3RHb29kVGFnLm5hbWU7XG4gIGxvZ2dlci5ub3RpY2UoJ2xhdGVzdCBnb29kIHRhZycsIGxhdGVzdEdvb2RUYWcpO1xuICAvLyBzdGF0dXMuZmllbGRzWydMYXRlc3QgdGFnIGNyZWF0ZWQnXSA9XG4gIC8vICAgbW9tZW50KClcbiAgaGVhZElzUHVibGlzaGFibGUgPSBsYXRlc3RHb29kVGFnICYmXG4gICAgbGF0ZXN0R29vZFRhZy5jb21taXQuc2hhID09PSBjb21taXRzWzBdLnNoYTtcblxuICBpZiAoIWhlYWRJc1B1Ymxpc2hhYmxlKSB7XG4gICAgc3RhdHVzLmZpZWxkc1snRG9uXFwndCBwdWJsaXNoIEhFQUQhJ10gPSBgVGhlIHRpcCBvZiB0aGUgXFxgJHticmFuY2h9XFxgIGAgK1xuICAgICAgYGJyYW5jaCBvZiB0aGUgXFxgJHtwYWNrYWdlTmFtZX1cXGAgcmVwb3NpdG9yeSBoYXMgbW92ZWQgYWhlYWQgb2YgdGhlIGAgK1xuICAgICAgYGxhdGVzdCBrbm93bi1nb29kIHRhZywgc28gZG9uJ3QgcnVuIFxcYG5wbSBwdWJsaXNoXFxgIHdpbGx5LW5pbGx5OyBgICtcbiAgICAgIGB1c2UgXFxgZ2l0IGNoZWNrb3V0XFxgIHRvIGdldCB5b3VyIHdvcmtpbmcgdHJlZSBpbnRvIGEga25vd24tZ29vZCBgICtcbiAgICAgIGBzdGF0ZSBmaXJzdC5gO1xuICB9XG5cbiAgaWYgKCFucG1JbmZvKSB7XG4gICAgc3RhdHVzLmZpZWxkc1snQ3VycmVudCB2ZXJzaW9uIG9uIE5QTSddID0gJ19OZXZlciBwdWJsaXNoZWQhXyc7XG4gICAgaWYgKGNpUHJvdmlkZXJzQ29uZmlndXJlZC5sZW5ndGggPiAwKSB7XG4gICAgICBzdGF0dXMudGV4dCA9IGBJIGNvdWxkbid0IGZpbmQgdGhlIFxcYCR7cGFja2FnZU5hbWV9XFxgIHBhY2thZ2Ugb24gTlBNLCBgICtcbiAgICAgICAgYGJ1dCB0aGUgJHtsYXRlc3RHb29kVGFnLm5hbWV9IHRhZyBpbiB0aGUgcmVwb3NpdG9yeSBoYXMgcGFzc2VkIENJLCBgICtcbiAgICAgICAgYHNvIHdlJ3JlIHJlYWR5IGZvciBhbiBpbml0aWFsIHB1Ymxpc2ggdG8gTlBNIWBcbiAgICAgIHJlYWR5Rm9yUHVibGlzaCA9IHRydWU7XG4gICAgICBzdGF0dXMuZ29vZCA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXR1cy50ZXh0ID0gYEkgY291bGRuJ3QgZmluZCB0aGUgXFxgJHtwYWNrYWdlTmFtZX1cXGAgcGFja2FnZSBvbiBOUE0sIGAgK1xuICAgICAgICBgYW5kIHRoZSByZXBvIGhhcyBubyBDSSBjb25maWd1cmVkLCBzbyBJIGRvbid0IGtub3cgZm9yIHN1cmUgYCArXG4gICAgICAgIGB3aGV0aGVyIHRoZSBsYXRlc3QgdGFnLCAke2xhdGVzdEdvb2RUYWcubmFtZX0sIGlzIHJlYWR5LiAqUHVibGlzaCBgICtcbiAgICAgICAgYHRvIE5QTSBhdCB5b3VyIG93biByaXNrLipgO1xuICAgICAgc3RhdHVzLmdvb2QgPSBmYWxzZTtcbiAgICAgIHN0YXR1cy5maWVsZHNbJ1JlYWR5IGZvciBwdWJsaXNoPyddID0gJzpxdWVzdGlvbjonO1xuICAgICAgcmV0dXJuIHN0YXR1cztcbiAgICB9XG4gIH1cblxuICBsZXQgbnBtVmVyc2lvbnMgPSBPYmplY3Qua2V5cyhucG1JbmZvLnZlcnNpb25zKVxuICAgIC5zb3J0KHNlbXZlci5yY29tcGFyZSlcbiAgICAubWFwKCh2KSA9PiBucG1JbmZvLnZlcnNpb25zW3ZdKTtcbiAgbGV0IGN1cnJlbnROcG0gPSBucG1WZXJzaW9uc1swXTtcblxuICBzdGF0dXMuZmllbGRzWydDdXJyZW50IHZlcnNpb24gb24gTlBNJ10gPVxuICAgIGA8aHR0cDovL25wbWpzLm9yZy9wYWNrYWdlLyR7cGFja2FnZU5hbWV9fCR7Y3VycmVudE5wbS52ZXJzaW9ufT5gO1xuICBzdGF0dXMuZmllbGRzWydMYXN0IHB1Ymxpc2hlZCB0byBOUE0nXSA9XG4gICAgbW9tZW50KG5wbUluZm8udGltZVtjdXJyZW50TnBtLnZlcnNpb25dKS5mcm9tTm93KCk7XG5cbiAgc3dpdGNoKHNlbXZlci5jb21wYXJlKGN1cnJlbnROcG0udmVyc2lvbiwgbGF0ZXN0R29vZFRhZy5uYW1lKSkge1xuICAgIGNhc2UgMDpcbiAgICAgIHN0YXR1cy5nb29kID0gdHJ1ZTtcbiAgICAgIHJlYWR5Rm9yUHVibGlzaCA9IGZhbHNlO1xuICAgICAgLy8gVE9ETzogY29tcGFyZSB0aGUgY3VycmVudE5wbS5naXRIZWFkIGFuZCBsYXRlc3RHb29kVGFnLmNvbW1pdC5zaGFcbiAgICAgIC8vIGFuZCBzYXkgc29tZXRoaW5nIHRlcnJpZmllZCBpZiB0aGV5IGFyZW4ndCB0aGUgc2FtZVxuICAgICAgLy8gYWxzbyBUT0RPIGNoZWNrIHBhY2thZ2UuanNvbiB0byBtYWtlIHN1cmUgaXQncyB3aGF0IGl0IHNob3VsZCBiZVxuICAgICAgc3RhdHVzLnRleHQgPSBgTlBNIGlzIGFscmVhZHkgdXAgdG8gZGF0ZSB3aXRoIHRoZSBsYXRlc3QgZ29vZCB2ZXJzaW9uIGAgK1xuICAgICAgICBgb2YgXFxgJHtwYWNrYWdlTmFtZX1cXGAsICoke2N1cnJlbnROcG0udmVyc2lvbn0qYFxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAtMTpcbiAgICAgIHN0YXR1cy5nb29kID0gdHJ1ZTtcbiAgICAgIHJlYWR5Rm9yUHVibGlzaCA9IHRydWU7XG4gICAgICBzdGF0dXMudGV4dCA9IGBUaGUgY3VycmVudCB2ZXJzaW9uIG9mIFxcYCR7cGFja2FnZU5hbWV9XFxgIHB1Ymxpc2hlZCB0byBgICtcbiAgICAgICAgYE5QTSBpcyAqJHtjdXJyZW50TnBtLnZlcnNpb259KiwgYW5kIHRoZSByZXBvc2l0b3J5IGlzIGFoZWFkIGJ5IGF0IGAgK1xuICAgICAgICBgbGVhc3Qgb25lICR7c2VtdmVyLmRpZmYoY3VycmVudE5wbS52ZXJzaW9uLCBsYXRlc3RHb29kVGFnLm5hbWUpfSBgICtcbiAgICAgICAgYHZlcnNpb246IGl0J3MgYXQgKiR7bGF0ZXN0R29vZFRhZy5uYW1lfSouICpSZWFkeSB0byBwdWJsaXNoISpgO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAxOlxuICAgICAgc3RhdHVzLmdvb2QgPSBmYWxzZTtcbiAgICAgIHJlYWR5Rm9yUHVibGlzaCA9IGZhbHNlO1xuICAgICAgc3RhdHVzLnRleHQgPSBgKk5vdCBnb29kLiogVGhlIGN1cnJlbnQgdmVyc2lvbiBvZiBcXGAke3BhY2thZ2VOYW1lfVxcYCBgICtcbiAgICAgICAgYHB1Ymxpc2hlZCB0byBOUE0gaXMgKiR7Y3VycmVudE5wbS52ZXJzaW9ufSosIGJ1dCB0aGUgcmVwb3NpdG9yeSdzIGAgK1xuICAgICAgICBgbGF0ZXN0IGdvb2QgdmVyc2lvbiBpcyAqJHtsYXRlc3RHb29kVGFnLm5hbWV9Kiwgd2hpY2ggaXMgYXQgbGVhc3QgYCArXG4gICAgICAgIGBvbmUgJHtzZW12ZXIuZGlmZihjdXJyZW50TnBtLnZlcnNpb24sIGxhdGVzdEdvb2RUYWcubmFtZSl9IHZlcnNpb24gYCArXG4gICAgICAgIGBiZWhpbmQuIFdhcyBhIHZlcnNpb24gcHVibGlzaGVkIGJlZm9yZSBpdCBoYWQgYnVpbHQgc3VjY2Vzc2Z1bGx5PyBgICtcbiAgICAgICAgYFdhcyBhIHZlcnNpb24gcHVibGlzaGVkIGZyb20gYSBkaWZmZXJlbnQgYnJhbmNoIHRoYW4gXFxgJHticmFuY2h9XFxgYCArXG4gICAgICAgIGA/ICpQbGVhc2UgaW52ZXN0aWdhdGUuKmBcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBzdGF0dXMuZ29vZCA9IGZhbHNlO1xuICAgICAgc3RhdHVzLnRleHQgPSBgVGhlIGVudGlyZSB3b3JsZCBpcyBvbiBmaXJlLmA7XG4gICAgICBicmVhaztcbiAgfVxuXG4gIGlmIChyZWFkeUZvclB1Ymxpc2gpIHtcbiAgICBzdGF0dXMuZmllbGRzWydSZWFkeSBmb3IgcHVibGlzaD8nXSA9ICc6d2hpdGVfY2hlY2tfbWFyazonO1xuICAgIHN0YXR1cy5maWVsZHNbJ1J1biBjb21tYW5kOiddID0gaGVhZElzUHVibGlzaGFibGUgP1xuICAgICAgJ2BucG0gcHVibGlzaGAnIDpcbiAgICAgIGBcXGBnaXQgY2hlY2tvdXQgJHtsYXRlc3RHb29kVGFnLm5hbWV9OyBucG0gcHVibGlzaFxcYGA7XG4gIH0gZWxzZSB7XG4gICAgc3RhdHVzLmZpZWxkc1snUmVhZHkgZm9yIHB1Ymxpc2g/J10gPSAnOng6J1xuICB9XG5cbiAgcmV0dXJuIHN0YXR1cztcbn1cblxuZG9iYnMuaGVhcnMoXG4gIFsnc3RhdHVzIChbQS1aYS16MC05XFwtXFwuXFxfXSspKD86IChbQS1aYS16MC05XFwtXFwvXFxfXSspKT8nXSxcbiAgWydkaXJlY3RfbWVudGlvbiddLFxuICAoZG9iYnMsIG1zZykgPT4ge1xuICAgIGxldCBwYWNrYWdlTmFtZSA9IG1zZy5tYXRjaFsxXTtcbiAgICBsZXQgYnJhbmNoID0gbXNnLm1hdGNoWzJdIHx8ICdtYXN0ZXInO1xuICAgIGxvZ2dlci5pbmZvKCdwYWNrYWdlIHN0YXR1cyByZXF1ZXN0ZWQnLCBwYWNrYWdlTmFtZSwgbXNnKTtcblxuICAgIGxldCBwYWNrYWdlU3RhdHVzJCA9IGdldFBhY2thZ2VTdGF0dXMocGFja2FnZU5hbWUsIGJyYW5jaCk7XG5cbiAgICBwYWNrYWdlU3RhdHVzJC5zdWJzY3JpYmVPbk5leHQoKGRhdGEpID0+IHtcbiAgICAgIGxldCBzdGF0dXMgPSBmb3JtYXRQYWNrYWdlU3RhdHVzKHsgcGFja2FnZU5hbWUsIGJyYW5jaCwgLi4uZGF0YX0pO1xuICAgICAgZG9iYnMucmVwbHkobXNnLCB7XG4gICAgICAgIHRleHQ6IGBTdGF0dXMgZm9yIFxcYCR7cGFja2FnZU5hbWV9XFxgYCxcbiAgICAgICAgYXR0YWNobWVudHM6IFt7XG4gICAgICAgICAgY29sb3I6IHN0YXR1cy5nb29kID8gc3VjY2Vzc0NvbG9yIDogZXJyb3JDb2xvcixcbiAgICAgICAgICB0aXRsZTogc3RhdHVzLmdvb2QgPyAnR29vZCBOZXdzIScgOiAnS2VlcCBDYWxtIScsXG4gICAgICAgICAgdGV4dDogc3RhdHVzLnRleHQsXG4gICAgICAgICAgZmllbGRzOiBPYmplY3Qua2V5cyhzdGF0dXMuZmllbGRzKS5tYXAoKGspID0+ICh7XG4gICAgICAgICAgICB0aXRsZTogayxcbiAgICAgICAgICAgIHZhbHVlOiBzdGF0dXMuZmllbGRzW2tdLFxuICAgICAgICAgICAgc2hvcnQ6IHN0YXR1cy5maWVsZHNba10ubGVuZ3RoIDwgMjBcbiAgICAgICAgICB9KSksXG4gICAgICAgICAgbXJrZHduX2luOiBbJ3RleHQnLCAnZmllbGRzJ11cbiAgICAgICAgfV0sXG4gICAgICAgIG1ya2R3bl9pbjogWyd0ZXh0JywgJ2ZpZWxkcyddLFxuICAgICAgICAuLi5zdGFuZGFyZE1lc3NhZ2VGb3JtYXRcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcGFja2FnZVN0YXR1cyQuc3Vic2NyaWJlT25FcnJvcigoZSkgPT4ge1xuICAgICAgbG9nZ2VyLmVycm9yKCdlcnJvciBnZXR0aW5nIHBhY2thZ2Ugc3RhdHVzJywgZSk7XG4gICAgfSk7XG4gIH1cbik7XG4iXX0=
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _rx = require('rx');

var _botkit = require('botkit');

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

githubHook.incoming.filter(_ref6 => {
  let event = _ref6.event;
  let data = _ref6.data;
  return event === 'status' && data.state === 'success';
}).do(_ref7 => {
  let data = _ref7.data;
  return logger.info('Received success notification', data);
}).map(_ref8 => {
  let data = _ref8.data;
  return _rx.Observable.forkJoin(_rx.Observable.of(data), github.fullCommitStatus(data.repository.name, data.sha), (_ref9, _ref10) => {
    let repository = _ref9.repository;
    let sha = _ref9.sha;
    let statuses = _ref10.statuses;
    let contents = _ref10.contents;
    return { repository, sha, statuses, contents };
  });
}).concatAll().filter(_ref11 => {
  let repository = _ref11.repository;
  let sha = _ref11.sha;
  let statuses = _ref11.statuses;
  let contents = _ref11.contents;

  logger.info('Received full status for', repository.name, sha);
  let hasPkg = contents.some(_ref12 => {
    let path = _ref12.path;
    return path === 'package.json';
  });
  return hasPkg && allCiSucceeded({ repository, sha, statuses, contents });
}).map(_ref13 => {
  let repository = _ref13.repository;
  let sha = _ref13.sha;
  return _rx.Observable.forkJoin(_rx.Observable.of({ repository, sha }), github.tags(repository.name), (_ref14, tags) => {
    let repository = _ref14.repository;
    let sha = _ref14.sha;
    return {
      repository,
      sha,
      tag: tags.find(_ref15 => {
        let commit = _ref15.commit;
        return commit && commit.sha === sha;
      })
    };
  });
}).concatAll().filter(_ref16 => {
  let tag = _ref16.tag;
  return tag && _semver2.default.clean(tag.name);
}).subscribe(_ref17 => {
  let repository = _ref17.repository;
  let sha = _ref17.sha;
  let tag = _ref17.tag;

  let name = repository.name;
  logger.notice('gonna notify CI success on tag', name, sha);
  bot.sendWebhook(_extends({
    channel: _conf2.default.statusChannel,
    attachments: [{
      color: '#1DED05',
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

// githubHook.incoming.subscribe(
//   (r) => {
//     let payload = r.data;
//     let event = r.event;
//     bot.sendWebhook({
//       channel: 'dobbstest',
//       text: 'Damn, son, I got a ' + event,
//       attachments: [
//         {
//           fallback: JSON.stringify(payload).slice(0, 100),
//           color: '#1DED05',
//           title: 'GitHub sez:',
//           fields: Object.keys(payload).map((k) => {
//             let stringValue =
//               typeof payload[k] === 'string' ? payload[k] :
//                 JSON.stringify(payload[k]);
//             return {
//               title: k,
//               value: stringValue,
//               short: stringValue.length < 20
//             };
//           })
//         }
//       ],
//       ...standardMessageFormat
//     });
//   }
// );

function addPackage(dobbs, msg, packageName, _ref18) {
  let head = _ref18.head;
  let tags = _ref18.tags;
  let contents = _ref18.contents;

  dobbs.startConversation(msg, (err, convo) => {
    if (err) logger.error(err);
    let has = {
      pkg: contents.some(_ref19 => {
        let path = _ref19.path;
        return path === 'package.json';
      }),
      travis: contents.some(_ref20 => {
        let path = _ref20.path;
        return path === '.travis.yml';
      }),
      appveyor: contents.some(_ref21 => {
        let path = _ref21.path;
        return path === 'appveyor.yml';
      })
    };
    let latestTag = tags[0];
    let repoUrl = `https://github.com/${ _conf2.default.githubOrg }/${ packageName }`;
    logger.info(`${ packageName } latest tag:`, latestTag);
    logger.info(`${ packageName } head:`, head);
    let author = head.commit.author;
    let statusReply = `
I found a repository for the \`${ packageName }\` package on GitHub.
Its latest tag is *${ latestTag.name }*.
Its most recent commit is *${ head.sha.slice(0, 8) }*, created by ` + `${ author.name } ${ (0, _moment2.default)(author.date).fromNow() }, with this message:


> ${ head.commit.message }

`;
    if (!has.pkg) {
      convo.say(_extends({
        text: `I found a repository for \`${ packageName }\`, but it has no ` + `\`package.json\` file, so I don't think it's an NPM package.`
      }, errorMessageFormat));
      return convo.next();
    } else if (has.travis && has.appveyor) {
      statusReply += `I found both a \`.travis.yml\` and an \`appveyor.yml\` at the root ` + `of the \`${ _conf2.default.githubOrg }/${ packageName }\` repository, so I'll ` + `wait for both Travis and Appveyor to tell me that it has ` + `successfully built before I validate a tag for deployment. Make ` + `sure to setup the hooks for both!`;
    } else if (has.travis) {
      statusReply += `I found a \`.travis.yml\` file at the root of the ` + `\`${ _conf2.default.githubOrg }/${ packageName }\` repository, so I'll wait for ` + `Travis to tell me that it has successfully built on Linux and/or ` + `OSX before I validate a tag for deployment. Make sure to setup the ` + `hook!`;
    } else if (has.appveyor) {
      statusReply += `I found an \`appveyor.yml\` file at the root of the ` + `\`${ _conf2.default.githubOrg }/${ packageName }\` repository,  so I'll wait for ` + `Appveyor to tell me that it has successfully built on Windows ` + `before I validate a tag for deployment. Make sure to setup the hook!`;
    } else {
      statusReply += `*I didn't find any cloud CI configuration files I recognized in ` + `the root of this repository.* I can recognize both \`.travis.yml\` ` + `and \`appveyor.yml\`. I really would rather you did one or both ` + `of those, but if you continue without doing so, I'll just validate ` + `every tag as ready for deployment. :ghost: Scary!`;
    }
    convo.say(_extends({
      text: statusReply
    }, successMessageFormat));
    convo.ask('Is all that correct?', [{
      pattern: bot.utterances.yes,
      callback: (response, convo) => {
        convo.say(`I thought so. I'll be monitoring ${ packageName } from now on.`);
        convo.say(`Obviously, if anything changes, just say \`add package\` to ` + `me again and I will update everything.`);
        finishAddPackage();
        convo.next();
      }
    }, {
      pattern: bot.utterances.no,
      callback: (response, convo) => {
        convo.say(`OK. Make any necessary changes to the repository, or to me I ` + `suppose, and try again later.`);
        convo.next();
      }
    }, {
      default: true,
      callback: (response, convo) => {
        // just repeat the question
        convo.repeat();
        convo.next();
      }
    }]);
  });
}

dobbs.hears(['status ([A-Za-z0-9\-\.\_]+)'], ['direct_mention'], (dobbs, msg) => {
  let packageName = msg.match[1];
  logger.info('package status requested', packageName, msg);
  github.repoStatus(packageName).subscribe(data => {
    logger.info('got package status', packageName, data);
  });
});

dobbs.hears(['add package ([A-Za-z0-9\-\.\_]+)'], ['direct_mention'], (dobbs, msg) => {
  let packageName = msg.match[1];
  logger.info('add package requested', packageName, msg);
  github.repoInfo(packageName).subscribe(data => {
    logger.info(`successfully got github info for ${ packageName }`, data);
    addPackage(dobbs, msg, packageName, data);
  }, err => {
    if (err.statusCode === 404) {
      logger.warning(`${ msg.user } asked about unknown package ${ packageName }`);
      dobbs.reply(msg, _extends({
        text: `I couldn't find a repo named \`${ packageName }\` in the ` + `\`/${ _conf2.default.githubOrg }\` GitHub organization. Is it public?`
      }, errorMessageFormat));
    } else {
      logger.error(`unknown error requesting package ${ packageName }`, err);
      dobbs.reply(msg, _extends({
        text: `Unexpected error trying to talk to GitHub. Fix me!`
      }, errorMessageFormat));
    }
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQVVBLE1BQU0sTUFBTSxHQUFHLHFDQUFZLENBQUM7QUFDNUIsTUFBTSxNQUFNLEdBQUcsdUNBQWUsTUFBTSxvQkFBWSxDQUFDO0FBQ2pELE1BQU0sYUFBYSxHQUFHLFlBWGIsUUFBUSxFQVdjLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztBQUMzQyxNQUFNLFVBQVUsR0FBRyw2Q0FBYSxNQUFNLG9CQUFZLENBQUM7O0FBRW5ELE1BQU0sR0FBRyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUM7QUFDOUIsT0FBSyxFQUFFLGVBQUssVUFBVTtBQUN0QixrQkFBZ0IsRUFBRTtBQUNoQixPQUFHLEVBQUUsZUFBSyxlQUFlO0dBQzFCO0NBQ0YsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDOztBQUVkLE1BQU0sS0FBSyxHQUFHLHlDQUFnQixhQUFhLENBQUMsQ0FBQzs7QUFFN0MsTUFBTSxxQkFBcUIsR0FBRztBQUM1QixVQUFRLEVBQUUsZUFBSyxPQUFPO0FBQ3RCLFVBQVEsRUFBRSxlQUFLLE9BQU87Q0FDdkIsQ0FBQzs7QUFFRixNQUFNLG9CQUFvQixHQUFHO0FBQzNCLFVBQVEsRUFBRSxlQUFLLFdBQVc7QUFDMUIsVUFBUSxFQUFFLGVBQUssT0FBTztDQUN2QixDQUFDOztBQUVGLE1BQU0sa0JBQWtCLEdBQUc7QUFDekIsVUFBUSxFQUFFLGVBQUssU0FBUztBQUN4QixVQUFRLEVBQUUsZUFBSyxPQUFPO0NBQ3ZCLENBQUM7O0FBRUYsU0FBUyxjQUFjLE9BQTBDO01BQXZDLFVBQVUsUUFBVixVQUFVO01BQUUsR0FBRyxRQUFILEdBQUc7TUFBRSxRQUFRLFFBQVIsUUFBUTtNQUFFLFFBQVEsUUFBUixRQUFROztBQUMzRCxNQUFJLFNBQVMsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO1FBQUcsS0FBSyxTQUFMLEtBQUs7V0FBTyxLQUFLLEtBQUssU0FBUztHQUFBLENBQUMsQ0FBQztBQUNwRSxTQUFPLGVBQUssV0FBVyxDQUFDLEtBQUssQ0FDM0IsU0FBeUM7UUFBdEMsSUFBSSxTQUFKLElBQUk7UUFBRSxVQUFVLFNBQVYsVUFBVTtRQUFFLGFBQWEsU0FBYixhQUFhOztBQUNoQyxRQUFJLFlBQVksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDO1VBQUcsSUFBSSxTQUFKLElBQUk7YUFBTyxJQUFJLEtBQUssVUFBVTtLQUFBLENBQUMsQ0FBQztBQUNwRSxRQUFJLFlBQVksR0FBRyxDQUFDLFlBQVksSUFDOUIsU0FBUyxDQUFDLElBQUksQ0FBQztVQUFHLE9BQU8sU0FBUCxPQUFPO2FBQU8sT0FBTyxLQUFLLGFBQWE7S0FBQSxDQUFDLENBQUM7QUFDN0QsUUFBSSxZQUFZLElBQUksWUFBWSxFQUFFO0FBQ2hDLFlBQU0sQ0FBQyxNQUFNLENBQ1gsQ0FBQyxHQUFFLElBQUksRUFBQyxtQkFBbUIsR0FBRSxVQUFVLENBQUMsSUFBSSxFQUFDLENBQUMsR0FBRSxHQUFHLEVBQUMsY0FBYyxDQUFDLEVBQ25FLFlBQVksQ0FDYixDQUFDO0tBQ0g7QUFDRCxXQUFPLENBQUMsQ0FBQyxZQUFZLENBQUM7R0FDdkIsQ0FDRixDQUFBO0NBQ0Y7O0FBRUQsVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQ3hCO01BQUcsS0FBSyxTQUFMLEtBQUs7TUFBRSxJQUFJLFNBQUosSUFBSTtTQUFPLEtBQUssS0FBSyxRQUFRLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxTQUFTO0NBQUEsQ0FDcEUsQ0FBQyxFQUFFLENBQ0Y7TUFBRyxJQUFJLFNBQUosSUFBSTtTQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsK0JBQStCLEVBQUUsSUFBSSxDQUFDO0NBQUEsQ0FDakUsQ0FBQyxHQUFHLENBQ0g7TUFBRyxJQUFJLFNBQUosSUFBSTtTQUFPLElBOURQLFVBQVUsQ0E4RFEsUUFBUSxDQUMvQixJQS9ESyxVQUFVLENBK0RKLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDbkIsTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsRUFDdkQ7UUFBRyxVQUFVLFNBQVYsVUFBVTtRQUFFLEdBQUcsU0FBSCxHQUFHO1FBQU0sUUFBUSxVQUFSLFFBQVE7UUFBRSxRQUFRLFVBQVIsUUFBUTtXQUN2QyxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRTtHQUFDLENBQzVDO0NBQUEsQ0FDRixDQUFDLFNBQVMsRUFBRSxDQUFDLE1BQU0sQ0FDbEIsVUFBNkM7TUFBMUMsVUFBVSxVQUFWLFVBQVU7TUFBRSxHQUFHLFVBQUgsR0FBRztNQUFFLFFBQVEsVUFBUixRQUFRO01BQUUsUUFBUSxVQUFSLFFBQVE7O0FBQ3BDLFFBQU0sQ0FBQyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsVUFBVSxDQUFDLElBQUksRUFBRyxHQUFHLENBQUMsQ0FBQztBQUMvRCxNQUFJLE1BQU0sR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDO1FBQUcsSUFBSSxVQUFKLElBQUk7V0FBTyxJQUFJLEtBQUssY0FBYztHQUFBLENBQUMsQ0FBQztBQUNsRSxTQUFPLE1BQU0sSUFBSSxjQUFjLENBQUMsRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO0NBQzFFLENBQ0YsQ0FBQyxHQUFHLENBQ0g7TUFBRyxVQUFVLFVBQVYsVUFBVTtNQUFFLEdBQUcsVUFBSCxHQUFHO1NBQU8sSUEzRWxCLFVBQVUsQ0EyRW1CLFFBQVEsQ0FDMUMsSUE1RUssVUFBVSxDQTRFSixFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFDbEMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQzVCLFNBQXNCLElBQUk7UUFBdkIsVUFBVSxVQUFWLFVBQVU7UUFBRSxHQUFHLFVBQUgsR0FBRztXQUNmO0FBQ0MsZ0JBQVU7QUFDVixTQUFHO0FBQ0gsU0FBRyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUM7WUFBRyxNQUFNLFVBQU4sTUFBTTtlQUFPLE1BQU0sSUFBSSxNQUFNLENBQUMsR0FBRyxLQUFLLEdBQUc7T0FBQSxDQUFDO0tBQzdEO0dBQUMsQ0FDTDtDQUFBLENBQ0YsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxNQUFNLENBQUM7TUFBRyxHQUFHLFVBQUgsR0FBRztTQUFPLEdBQUcsSUFBSSxpQkFBTyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQztDQUFBLENBQUMsQ0FDL0QsU0FBUyxDQUNSLFVBQThCO01BQTNCLFVBQVUsVUFBVixVQUFVO01BQUUsR0FBRyxVQUFILEdBQUc7TUFBRSxHQUFHLFVBQUgsR0FBRzs7QUFDckIsTUFBSSxJQUFJLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQztBQUMzQixRQUFNLENBQUMsTUFBTSxDQUNYLGdDQUFnQyxFQUFFLElBQUksRUFBRSxHQUFHLENBQzVDLENBQUM7QUFDRixLQUFHLENBQUMsV0FBVztBQUNiLFdBQU8sRUFBRSxlQUFLLGFBQWE7QUFDM0IsZUFBVyxFQUFFLENBQ1g7QUFDRSxXQUFLLEVBQUUsU0FBUztBQUNoQixjQUFRLEVBQUUsQ0FBQyxHQUFFLElBQUksRUFBQyxDQUFDLEdBQUUsR0FBRyxDQUFDLElBQUksRUFBQyxtQkFBbUIsQ0FBQztBQUNsRCxhQUFPLEVBQUUsQ0FBQyxnQ0FBZ0MsR0FBRSxJQUFJLEVBQUMsR0FBRyxDQUFDO0FBQ3JELFdBQUssRUFBRSxDQUFDLEdBQUUsR0FBRyxDQUFDLElBQUksRUFBQyxRQUFRLEdBQUUsSUFBSSxFQUFDLHdCQUF3QixDQUFDLEdBQ3BELENBQUMsaUJBQWlCLENBQUM7QUFDMUIsVUFBSSxFQUFFLENBQUMscURBQXFELENBQUMsR0FDdkQsQ0FBQyxtQ0FBbUMsR0FBRSxHQUFHLENBQUMsSUFBSSxFQUFDLFFBQVEsQ0FBQyxHQUN4RCxDQUFDLFVBQVUsQ0FBQztBQUNsQixZQUFNLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQUFBQyxDQUFDLElBQUs7QUFDbEMsWUFBSSxXQUFXLEdBQ2IsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FDakMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzQixlQUFPO0FBQ0wsZUFBSyxFQUFFLENBQUM7QUFDUixlQUFLLEVBQUUsV0FBVztBQUNsQixlQUFLLEVBQUUsV0FBVyxDQUFDLE1BQU0sR0FBRyxFQUFFO1NBQy9CLENBQUM7T0FDSCxDQUFDO0FBQ0YsZUFBUyxFQUFFLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQztLQUMvQixDQUNGO0tBQ0Usb0JBQW9CLEVBQ3ZCLENBQUE7Q0FDSCxFQUNELE1BQU0sQ0FBQyxLQUFLLENBQ2I7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQyxBQStCRixTQUFTLFVBQVUsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLFdBQVcsVUFBNEI7TUFBeEIsSUFBSSxVQUFKLElBQUk7TUFBRSxJQUFJLFVBQUosSUFBSTtNQUFFLFFBQVEsVUFBUixRQUFROztBQUNqRSxPQUFLLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFLEtBQUssS0FBSztBQUMzQyxRQUFJLEdBQUcsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzNCLFFBQUksR0FBRyxHQUFHO0FBQ1IsU0FBRyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUM7WUFBRyxJQUFJLFVBQUosSUFBSTtlQUFPLElBQUksS0FBSyxjQUFjO09BQUEsQ0FBQztBQUN6RCxZQUFNLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQztZQUFHLElBQUksVUFBSixJQUFJO2VBQU8sSUFBSSxLQUFLLGFBQWE7T0FBQSxDQUFDO0FBQzNELGNBQVEsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDO1lBQUcsSUFBSSxVQUFKLElBQUk7ZUFBTyxJQUFJLEtBQUssY0FBYztPQUFBLENBQUM7S0FDL0QsQ0FBQztBQUNGLFFBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4QixRQUFJLE9BQU8sR0FBRyxDQUFDLG1CQUFtQixHQUFFLGVBQUssU0FBUyxFQUFDLENBQUMsR0FBRSxXQUFXLEVBQUMsQ0FBQyxDQUFDO0FBQ3BFLFVBQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFFLFdBQVcsRUFBQyxZQUFZLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztBQUNyRCxVQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRSxXQUFXLEVBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDMUMsUUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7QUFDaEMsUUFBSSxXQUFXLEdBQUcsQ0FBQzsrQkFDUSxHQUFFLFdBQVcsRUFBQzttQkFDMUIsR0FBRSxTQUFTLENBQUMsSUFBSSxFQUFDOzJCQUNULEdBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLGNBQWMsQ0FBQyxHQUMxRCxDQUFDLEdBQUUsTUFBTSxDQUFDLElBQUksRUFBQyxDQUFDLEdBQUUsc0JBQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFDOzs7RUFHcEQsR0FBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBQzs7QUFFeEIsQ0FBQyxDQUFDO0FBQ0UsUUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUU7QUFDWixXQUFLLENBQUMsR0FBRztBQUNQLFlBQUksRUFBRSxDQUFDLDJCQUEyQixHQUFFLFdBQVcsRUFBQyxrQkFBa0IsQ0FBQyxHQUNuRSxDQUFDLDREQUE0RCxDQUFDO1NBQzNELGtCQUFrQixFQUNyQixDQUFDO0FBQ0gsYUFBTyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7S0FDckIsTUFBTSxJQUFJLEdBQUcsQ0FBQyxNQUFNLElBQUksR0FBRyxDQUFDLFFBQVEsRUFBRTtBQUNyQyxpQkFBVyxJQUNULENBQUMsbUVBQW1FLENBQUMsR0FDckUsQ0FBQyxTQUFTLEdBQUUsZUFBSyxTQUFTLEVBQUMsQ0FBQyxHQUFFLFdBQVcsRUFBQyx1QkFBdUIsQ0FBQyxHQUNsRSxDQUFDLHlEQUF5RCxDQUFDLEdBQzNELENBQUMsZ0VBQWdFLENBQUMsR0FDbEUsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFBO0tBQ3RDLE1BQU0sSUFBSSxHQUFHLENBQUMsTUFBTSxFQUFFO0FBQ3JCLGlCQUFXLElBQ1QsQ0FBQyxrREFBa0QsQ0FBQyxHQUNwRCxDQUFDLEVBQUUsR0FBRSxlQUFLLFNBQVMsRUFBQyxDQUFDLEdBQUUsV0FBVyxFQUFDLGdDQUFnQyxDQUFDLEdBQ3BFLENBQUMsaUVBQWlFLENBQUMsR0FDbkUsQ0FBQyxtRUFBbUUsQ0FBQyxHQUNyRSxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQ1gsTUFBTSxJQUFJLEdBQUcsQ0FBQyxRQUFRLEVBQUU7QUFDdkIsaUJBQVcsSUFDVCxDQUFDLG9EQUFvRCxDQUFDLEdBQ3RELENBQUMsRUFBRSxHQUFFLGVBQUssU0FBUyxFQUFDLENBQUMsR0FBRSxXQUFXLEVBQUMsaUNBQWlDLENBQUMsR0FDckUsQ0FBQyw4REFBOEQsQ0FBQyxHQUNoRSxDQUFDLG9FQUFvRSxDQUFDLENBQUM7S0FDMUUsTUFBTTtBQUNMLGlCQUFXLElBQ1QsQ0FBQyxnRUFBZ0UsQ0FBQyxHQUNsRSxDQUFDLG1FQUFtRSxDQUFDLEdBQ3JFLENBQUMsZ0VBQWdFLENBQUMsR0FDbEUsQ0FBQyxtRUFBbUUsQ0FBQyxHQUNyRSxDQUFDLGlEQUFpRCxDQUFDLENBQUE7S0FDdEQ7QUFDRCxTQUFLLENBQUMsR0FBRztBQUNQLFVBQUksRUFBRSxXQUFXO09BQ2Qsb0JBQW9CLEVBQ3ZCLENBQUM7QUFDSCxTQUFLLENBQUMsR0FBRyxDQUFDLHNCQUFzQixFQUFFLENBQ2hDO0FBQ0UsYUFBTyxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRztBQUMzQixjQUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUUsS0FBSyxLQUFLO0FBQzdCLGFBQUssQ0FBQyxHQUFHLENBQ1AsQ0FBQyxpQ0FBaUMsR0FBRSxXQUFXLEVBQUMsYUFBYSxDQUFDLENBQy9ELENBQUM7QUFDRixhQUFLLENBQUMsR0FBRyxDQUNQLENBQUMsNERBQTRELENBQUMsR0FDNUQsQ0FBQyxzQ0FBc0MsQ0FBQyxDQUMzQyxDQUFDO0FBQ0Ysd0JBQWdCLEVBQUUsQ0FBQTtBQUNsQixhQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7T0FDZDtLQUNGLEVBQ0Q7QUFDRSxhQUFPLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFO0FBQzFCLGNBQVEsRUFBRSxDQUFDLFFBQVEsRUFBRSxLQUFLLEtBQUs7QUFDN0IsYUFBSyxDQUFDLEdBQUcsQ0FDUCxDQUFDLDZEQUE2RCxDQUFDLEdBQzdELENBQUMsNkJBQTZCLENBQUMsQ0FDbEMsQ0FBQztBQUNGLGFBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztPQUNkO0tBQ0YsRUFDRDtBQUNFLGFBQU8sRUFBRSxJQUFJO0FBQ2IsY0FBUSxFQUFFLENBQUMsUUFBUSxFQUFFLEtBQUssS0FBSzs7QUFFN0IsYUFBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQ2YsYUFBSyxDQUFDLElBQUksRUFBRSxDQUFDO09BQ2Q7S0FDRixDQUNGLENBQUMsQ0FBQztHQUVKLENBQUMsQ0FBQztDQUNKOztBQUVELEtBQUssQ0FBQyxLQUFLLENBQ1QsQ0FBQyw2QkFBNkIsQ0FBQyxFQUMvQixDQUFDLGdCQUFnQixDQUFDLEVBQ2xCLENBQUMsS0FBSyxFQUFFLEdBQUcsS0FBSztBQUNkLE1BQUksV0FBVyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0IsUUFBTSxDQUFDLElBQUksQ0FBQywwQkFBMEIsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDMUQsUUFBTSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FDN0IsU0FBUyxDQUNSLEFBQUMsSUFBSSxJQUFLO0FBQ1IsVUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUM7R0FDdEQsQ0FDRixDQUFDO0NBQ0gsQ0FDRixDQUFBOztBQUVELEtBQUssQ0FBQyxLQUFLLENBQ1QsQ0FBQyxrQ0FBa0MsQ0FBQyxFQUNwQyxDQUFDLGdCQUFnQixDQUFDLEVBQ2xCLENBQUMsS0FBSyxFQUFFLEdBQUcsS0FBSztBQUNkLE1BQUksV0FBVyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0IsUUFBTSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDdkQsUUFBTSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FDM0IsU0FBUyxDQUNSLEFBQUMsSUFBSSxJQUFLO0FBQ1IsVUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLGlDQUFpQyxHQUFFLFdBQVcsRUFBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDckUsY0FBVSxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO0dBQzNDLEVBQ0QsQUFBQyxHQUFHLElBQUs7QUFDUCxRQUFJLEdBQUcsQ0FBQyxVQUFVLEtBQUssR0FBRyxFQUFFO0FBQzFCLFlBQU0sQ0FBQyxPQUFPLENBQ1osQ0FBQyxHQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUMsNkJBQTZCLEdBQUUsV0FBVyxFQUFDLENBQUMsQ0FDekQsQ0FBQztBQUNGLFdBQUssQ0FBQyxLQUFLLENBQUMsR0FBRztBQUNiLFlBQUksRUFBRSxDQUFDLCtCQUErQixHQUFFLFdBQVcsRUFBQyxVQUFVLENBQUMsR0FDN0QsQ0FBQyxHQUFHLEdBQUUsZUFBSyxTQUFTLEVBQUMscUNBQXFDLENBQUM7U0FDMUQsa0JBQWtCLEVBQ3JCLENBQUM7S0FDSixNQUFNO0FBQ0wsWUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLGlDQUFpQyxHQUFFLFdBQVcsRUFBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDckUsV0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHO0FBQ2IsWUFBSSxFQUFFLENBQUMsa0RBQWtELENBQUM7U0FDdkQsa0JBQWtCLEVBQ3JCLENBQUM7S0FDSjtHQUNGLENBQ0YsQ0FBQztDQUNILENBQ0YsQ0FBQyIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE9ic2VydmFibGUgfSBmcm9tICdyeCc7XG5pbXBvcnQgeyBzbGFja2JvdCB9IGZyb20gJ2JvdGtpdCc7XG5pbXBvcnQgc2VtdmVyIGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgbW9tZW50IGZyb20gJ21vbWVudCc7XG5pbXBvcnQgY29uZiBmcm9tICcuL2NvbmYnO1xuaW1wb3J0IExvZ2dlciBmcm9tICcuL2xvZ2dlcic7XG5pbXBvcnQgR2l0aHViQ2xpZW50IGZyb20gJy4vZ2l0aHViLWNsaWVudCc7XG5pbXBvcnQgZnJpdm9saXR5IGZyb20gJy4vZnJpdm9saXR5JztcbmltcG9ydCBHaXRodWJIb29rIGZyb20gJy4vZ2l0aHViLWhvb2stbGlzdGVuZXInO1xuXG5jb25zdCBsb2dnZXIgPSBMb2dnZXIoY29uZik7XG5jb25zdCBnaXRodWIgPSBHaXRodWJDbGllbnQoeyBsb2dnZXIsIC4uLmNvbmYgfSk7XG5jb25zdCBib3RDb250cm9sbGVyID0gc2xhY2tib3QoeyBsb2dnZXIgfSk7XG5jb25zdCBnaXRodWJIb29rID0gR2l0aHViSG9vayh7IGxvZ2dlciwgLi4uY29uZiB9KTtcblxuY29uc3QgYm90ID0gYm90Q29udHJvbGxlci5zcGF3bih7IFxuICB0b2tlbjogY29uZi5zbGFja1Rva2VuLFxuICBpbmNvbWluZ193ZWJob29rOiB7XG4gICAgdXJsOiBjb25mLnNsYWNrV2ViaG9va1VybFxuICB9XG59KS5zdGFydFJUTSgpO1xuXG5jb25zdCBkb2JicyA9IGZyaXZvbGl0eShjb25mLCBib3RDb250cm9sbGVyKTtcblxuY29uc3Qgc3RhbmRhcmRNZXNzYWdlRm9ybWF0ID0ge1xuICBpY29uX3VybDogY29uZi5ib3RJY29uLFxuICB1c2VybmFtZTogY29uZi5ib3ROYW1lXG59O1xuXG5jb25zdCBzdWNjZXNzTWVzc2FnZUZvcm1hdCA9IHtcbiAgaWNvbl91cmw6IGNvbmYuc3VjY2Vzc0ljb24sXG4gIHVzZXJuYW1lOiBjb25mLmJvdE5hbWVcbn07XG5cbmNvbnN0IGVycm9yTWVzc2FnZUZvcm1hdCA9IHtcbiAgaWNvbl91cmw6IGNvbmYuZXJyb3JJY29uLFxuICB1c2VybmFtZTogY29uZi5ib3ROYW1lXG59O1xuXG5mdW5jdGlvbiBhbGxDaVN1Y2NlZWRlZCh7IHJlcG9zaXRvcnksIHNoYSwgc3RhdHVzZXMsIGNvbnRlbnRzIH0pIHtcbiAgbGV0IHN1Y2Nlc3NlcyA9IHN0YXR1c2VzLmZpbHRlcigoeyBzdGF0ZSB9KSA9PiBzdGF0ZSA9PT0gJ3N1Y2Nlc3MnKTtcbiAgcmV0dXJuIGNvbmYuY2lQcm92aWRlcnMuZXZlcnkoXG4gICAgKHsgbmFtZSwgY29uZmlnRmlsZSwgc3RhdHVzQ29udGV4dCB9KSA9PiB7XG4gICAgICBsZXQgaXNDb25maWd1cmVkID0gY29udGVudHMuc29tZSgoeyBwYXRoIH0pID0+IHBhdGggPT09IGNvbmZpZ0ZpbGUpO1xuICAgICAgbGV0IHN1Y2Nlc3NGb3VuZCA9ICFpc0NvbmZpZ3VyZWQgfHxcbiAgICAgICAgc3VjY2Vzc2VzLmZpbmQoKHsgY29udGV4dCB9KSA9PiBjb250ZXh0ID09PSBzdGF0dXNDb250ZXh0KTtcbiAgICAgIGlmIChpc0NvbmZpZ3VyZWQgJiYgc3VjY2Vzc0ZvdW5kKSB7XG4gICAgICAgIGxvZ2dlci5ub3RpY2UoXG4gICAgICAgICAgYCR7bmFtZX0gYnVpbGQgc3VjY2VzcyBmb3IgJHtyZXBvc2l0b3J5Lm5hbWV9IyR7c2hhfSwgdHJpZ2dlcmVkIGJ5YCxcbiAgICAgICAgICBzdWNjZXNzRm91bmRcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAhIXN1Y2Nlc3NGb3VuZDtcbiAgICB9XG4gIClcbn1cblxuZ2l0aHViSG9vay5pbmNvbWluZy5maWx0ZXIoXG4gICh7IGV2ZW50LCBkYXRhIH0pID0+IGV2ZW50ID09PSAnc3RhdHVzJyAmJiBkYXRhLnN0YXRlID09PSAnc3VjY2VzcydcbikuZG8oXG4gICh7IGRhdGEgfSkgPT4gbG9nZ2VyLmluZm8oJ1JlY2VpdmVkIHN1Y2Nlc3Mgbm90aWZpY2F0aW9uJywgZGF0YSlcbikubWFwKFxuICAoeyBkYXRhIH0pID0+IE9ic2VydmFibGUuZm9ya0pvaW4oXG4gICAgT2JzZXJ2YWJsZS5vZihkYXRhKSxcbiAgICBnaXRodWIuZnVsbENvbW1pdFN0YXR1cyhkYXRhLnJlcG9zaXRvcnkubmFtZSwgZGF0YS5zaGEpLFxuICAgICh7IHJlcG9zaXRvcnksIHNoYSB9LCB7IHN0YXR1c2VzLCBjb250ZW50cyB9KSA9PlxuICAgICAgKHsgcmVwb3NpdG9yeSwgc2hhLCBzdGF0dXNlcywgY29udGVudHMgfSlcbiAgKVxuKS5jb25jYXRBbGwoKS5maWx0ZXIoXG4gICh7IHJlcG9zaXRvcnksIHNoYSwgc3RhdHVzZXMsIGNvbnRlbnRzIH0pID0+IHtcbiAgICBsb2dnZXIuaW5mbygnUmVjZWl2ZWQgZnVsbCBzdGF0dXMgZm9yJywgcmVwb3NpdG9yeS5uYW1lLCAgc2hhKTtcbiAgICBsZXQgaGFzUGtnID0gY29udGVudHMuc29tZSgoeyBwYXRoIH0pID0+IHBhdGggPT09ICdwYWNrYWdlLmpzb24nKTtcbiAgICByZXR1cm4gaGFzUGtnICYmIGFsbENpU3VjY2VlZGVkKHsgcmVwb3NpdG9yeSwgc2hhLCBzdGF0dXNlcywgY29udGVudHMgfSk7XG4gIH1cbikubWFwKFxuICAoeyByZXBvc2l0b3J5LCBzaGEgfSkgPT4gT2JzZXJ2YWJsZS5mb3JrSm9pbihcbiAgICBPYnNlcnZhYmxlLm9mKHsgcmVwb3NpdG9yeSwgc2hhIH0pLFxuICAgIGdpdGh1Yi50YWdzKHJlcG9zaXRvcnkubmFtZSksXG4gICAgKHsgcmVwb3NpdG9yeSwgc2hhIH0sIHRhZ3MpID0+XG4gICAgICAoe1xuICAgICAgICByZXBvc2l0b3J5LFxuICAgICAgICBzaGEsXG4gICAgICAgIHRhZzogdGFncy5maW5kKCh7IGNvbW1pdCB9KSA9PiBjb21taXQgJiYgY29tbWl0LnNoYSA9PT0gc2hhKVxuICAgICAgfSlcbiAgKVxuKS5jb25jYXRBbGwoKS5maWx0ZXIoKHsgdGFnIH0pID0+IHRhZyAmJiBzZW12ZXIuY2xlYW4odGFnLm5hbWUpKVxuLnN1YnNjcmliZShcbiAgKHsgcmVwb3NpdG9yeSwgc2hhLCB0YWcgfSkgPT4ge1xuICAgIGxldCBuYW1lID0gcmVwb3NpdG9yeS5uYW1lO1xuICAgIGxvZ2dlci5ub3RpY2UoXG4gICAgICAnZ29ubmEgbm90aWZ5IENJIHN1Y2Nlc3Mgb24gdGFnJywgbmFtZSwgc2hhXG4gICAgKTtcbiAgICBib3Quc2VuZFdlYmhvb2soe1xuICAgICAgY2hhbm5lbDogY29uZi5zdGF0dXNDaGFubmVsLFxuICAgICAgYXR0YWNobWVudHM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGNvbG9yOiAnIzFERUQwNScsXG4gICAgICAgICAgZmFsbGJhY2s6IGAke25hbWV9ICR7dGFnLm5hbWV9IHJlYWR5IGZvciBwdWJsaXNoLmAsXG4gICAgICAgICAgcHJldGV4dDogYG5wbSBwYWNrYWdlIGJ1aWxkIHN1Y2Nlc3MgZm9yIFxcYCR7bmFtZX1cXGAhYCxcbiAgICAgICAgICB0aXRsZTogYCR7dGFnLm5hbWV9IG9mIHRoZSAke25hbWV9IHBhY2thZ2UgaXMgcmVhZHkgdG8gYmUgYCArXG4gICAgICAgICAgICAgICAgIGBwdWJsaXNoZWQgdG8gTlBNLmAsXG4gICAgICAgICAgdGV4dDogYFdoZW4gcHVibGlzaGluZywgYmUgc3VyZSB5b3VyIGxvY2FsIHJlcG9zaXRvcnkgaXMgYXQgYCArXG4gICAgICAgICAgICAgICAgYHRoYXQgZXhhY3QgdmVyc2lvbjogXFxgZ2l0IGNoZWNrb3V0ICR7dGFnLm5hbWV9ICYmIG5wbSBgICtcbiAgICAgICAgICAgICAgICBgcHVibGlzaFxcYC5gLFxuICAgICAgICAgIGZpZWxkczogT2JqZWN0LmtleXModGFnKS5tYXAoKGspID0+IHtcbiAgICAgICAgICAgIGxldCBzdHJpbmdWYWx1ZSA9XG4gICAgICAgICAgICAgIHR5cGVvZiB0YWdba10gPT09ICdzdHJpbmcnID8gdGFnW2tdIDpcbiAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh0YWdba10pO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgdGl0bGU6IGssXG4gICAgICAgICAgICAgIHZhbHVlOiBzdHJpbmdWYWx1ZSxcbiAgICAgICAgICAgICAgc2hvcnQ6IHN0cmluZ1ZhbHVlLmxlbmd0aCA8IDIwXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH0pLFxuICAgICAgICAgIG1ya2R3bl9pbjogWydwcmV0ZXh0JywgJ3RleHQnXVxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgLi4uc3VjY2Vzc01lc3NhZ2VGb3JtYXRcbiAgICB9KVxuICB9LFxuICBsb2dnZXIuZXJyb3Jcbik7XG5cbi8vIGdpdGh1Ykhvb2suaW5jb21pbmcuc3Vic2NyaWJlKFxuLy8gICAocikgPT4ge1xuLy8gICAgIGxldCBwYXlsb2FkID0gci5kYXRhO1xuLy8gICAgIGxldCBldmVudCA9IHIuZXZlbnQ7XG4vLyAgICAgYm90LnNlbmRXZWJob29rKHtcbi8vICAgICAgIGNoYW5uZWw6ICdkb2Jic3Rlc3QnLFxuLy8gICAgICAgdGV4dDogJ0RhbW4sIHNvbiwgSSBnb3QgYSAnICsgZXZlbnQsXG4vLyAgICAgICBhdHRhY2htZW50czogW1xuLy8gICAgICAgICB7XG4vLyAgICAgICAgICAgZmFsbGJhY2s6IEpTT04uc3RyaW5naWZ5KHBheWxvYWQpLnNsaWNlKDAsIDEwMCksXG4vLyAgICAgICAgICAgY29sb3I6ICcjMURFRDA1Jyxcbi8vICAgICAgICAgICB0aXRsZTogJ0dpdEh1YiBzZXo6Jyxcbi8vICAgICAgICAgICBmaWVsZHM6IE9iamVjdC5rZXlzKHBheWxvYWQpLm1hcCgoaykgPT4ge1xuLy8gICAgICAgICAgICAgbGV0IHN0cmluZ1ZhbHVlID1cbi8vICAgICAgICAgICAgICAgdHlwZW9mIHBheWxvYWRba10gPT09ICdzdHJpbmcnID8gcGF5bG9hZFtrXSA6XG4vLyAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkocGF5bG9hZFtrXSk7XG4vLyAgICAgICAgICAgICByZXR1cm4ge1xuLy8gICAgICAgICAgICAgICB0aXRsZTogayxcbi8vICAgICAgICAgICAgICAgdmFsdWU6IHN0cmluZ1ZhbHVlLFxuLy8gICAgICAgICAgICAgICBzaG9ydDogc3RyaW5nVmFsdWUubGVuZ3RoIDwgMjBcbi8vICAgICAgICAgICAgIH07XG4vLyAgICAgICAgICAgfSlcbi8vICAgICAgICAgfVxuLy8gICAgICAgXSxcbi8vICAgICAgIC4uLnN0YW5kYXJkTWVzc2FnZUZvcm1hdFxuLy8gICAgIH0pO1xuLy8gICB9XG4vLyApO1xuXG5mdW5jdGlvbiBhZGRQYWNrYWdlKGRvYmJzLCBtc2csIHBhY2thZ2VOYW1lLCB7IGhlYWQsIHRhZ3MsIGNvbnRlbnRzIH0pIHtcbiAgZG9iYnMuc3RhcnRDb252ZXJzYXRpb24obXNnLCAoZXJyLCBjb252bykgPT4ge1xuICAgIGlmIChlcnIpIGxvZ2dlci5lcnJvcihlcnIpO1xuICAgIGxldCBoYXMgPSB7XG4gICAgICBwa2c6IGNvbnRlbnRzLnNvbWUoKHsgcGF0aCB9KSA9PiBwYXRoID09PSAncGFja2FnZS5qc29uJyksXG4gICAgICB0cmF2aXM6IGNvbnRlbnRzLnNvbWUoKHsgcGF0aCB9KSA9PiBwYXRoID09PSAnLnRyYXZpcy55bWwnKSxcbiAgICAgIGFwcHZleW9yOiBjb250ZW50cy5zb21lKCh7IHBhdGggfSkgPT4gcGF0aCA9PT0gJ2FwcHZleW9yLnltbCcpLFxuICAgIH07XG4gICAgbGV0IGxhdGVzdFRhZyA9IHRhZ3NbMF07XG4gICAgbGV0IHJlcG9VcmwgPSBgaHR0cHM6Ly9naXRodWIuY29tLyR7Y29uZi5naXRodWJPcmd9LyR7cGFja2FnZU5hbWV9YDtcbiAgICBsb2dnZXIuaW5mbyhgJHtwYWNrYWdlTmFtZX0gbGF0ZXN0IHRhZzpgLCBsYXRlc3RUYWcpO1xuICAgIGxvZ2dlci5pbmZvKGAke3BhY2thZ2VOYW1lfSBoZWFkOmAsIGhlYWQpO1xuICAgIGxldCBhdXRob3IgPSBoZWFkLmNvbW1pdC5hdXRob3I7XG4gICAgbGV0IHN0YXR1c1JlcGx5ID0gYFxuSSBmb3VuZCBhIHJlcG9zaXRvcnkgZm9yIHRoZSBcXGAke3BhY2thZ2VOYW1lfVxcYCBwYWNrYWdlIG9uIEdpdEh1Yi5cbkl0cyBsYXRlc3QgdGFnIGlzICoke2xhdGVzdFRhZy5uYW1lfSouXG5JdHMgbW9zdCByZWNlbnQgY29tbWl0IGlzICoke2hlYWQuc2hhLnNsaWNlKDAsOCl9KiwgY3JlYXRlZCBieSBgICtcbiAgICAgIGAke2F1dGhvci5uYW1lfSAke21vbWVudChhdXRob3IuZGF0ZSkuZnJvbU5vdygpfSwgd2l0aCB0aGlzIG1lc3NhZ2U6XG5cblxuPiAke2hlYWQuY29tbWl0Lm1lc3NhZ2V9XG5cbmA7XG4gICAgaWYgKCFoYXMucGtnKSB7XG4gICAgICBjb252by5zYXkoe1xuICAgICAgICB0ZXh0OiBgSSBmb3VuZCBhIHJlcG9zaXRvcnkgZm9yIFxcYCR7cGFja2FnZU5hbWV9XFxgLCBidXQgaXQgaGFzIG5vIGAgK1xuICAgICAgICBgXFxgcGFja2FnZS5qc29uXFxgIGZpbGUsIHNvIEkgZG9uJ3QgdGhpbmsgaXQncyBhbiBOUE0gcGFja2FnZS5gLFxuICAgICAgICAuLi5lcnJvck1lc3NhZ2VGb3JtYXRcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGNvbnZvLm5leHQoKTtcbiAgICB9IGVsc2UgaWYgKGhhcy50cmF2aXMgJiYgaGFzLmFwcHZleW9yKSB7XG4gICAgICBzdGF0dXNSZXBseSArPVxuICAgICAgICBgSSBmb3VuZCBib3RoIGEgXFxgLnRyYXZpcy55bWxcXGAgYW5kIGFuIFxcYGFwcHZleW9yLnltbFxcYCBhdCB0aGUgcm9vdCBgICtcbiAgICAgICAgYG9mIHRoZSBcXGAke2NvbmYuZ2l0aHViT3JnfS8ke3BhY2thZ2VOYW1lfVxcYCByZXBvc2l0b3J5LCBzbyBJJ2xsIGAgK1xuICAgICAgICBgd2FpdCBmb3IgYm90aCBUcmF2aXMgYW5kIEFwcHZleW9yIHRvIHRlbGwgbWUgdGhhdCBpdCBoYXMgYCArXG4gICAgICAgIGBzdWNjZXNzZnVsbHkgYnVpbHQgYmVmb3JlIEkgdmFsaWRhdGUgYSB0YWcgZm9yIGRlcGxveW1lbnQuIE1ha2UgYCArXG4gICAgICAgIGBzdXJlIHRvIHNldHVwIHRoZSBob29rcyBmb3IgYm90aCFgXG4gICAgfSBlbHNlIGlmIChoYXMudHJhdmlzKSB7XG4gICAgICBzdGF0dXNSZXBseSArPVxuICAgICAgICBgSSBmb3VuZCBhIFxcYC50cmF2aXMueW1sXFxgIGZpbGUgYXQgdGhlIHJvb3Qgb2YgdGhlIGAgK1xuICAgICAgICBgXFxgJHtjb25mLmdpdGh1Yk9yZ30vJHtwYWNrYWdlTmFtZX1cXGAgcmVwb3NpdG9yeSwgc28gSSdsbCB3YWl0IGZvciBgICtcbiAgICAgICAgYFRyYXZpcyB0byB0ZWxsIG1lIHRoYXQgaXQgaGFzIHN1Y2Nlc3NmdWxseSBidWlsdCBvbiBMaW51eCBhbmQvb3IgYCArXG4gICAgICAgIGBPU1ggYmVmb3JlIEkgdmFsaWRhdGUgYSB0YWcgZm9yIGRlcGxveW1lbnQuIE1ha2Ugc3VyZSB0byBzZXR1cCB0aGUgYCArXG4gICAgICAgIGBob29rIWA7XG4gICAgfSBlbHNlIGlmIChoYXMuYXBwdmV5b3IpIHtcbiAgICAgIHN0YXR1c1JlcGx5ICs9XG4gICAgICAgIGBJIGZvdW5kIGFuIFxcYGFwcHZleW9yLnltbFxcYCBmaWxlIGF0IHRoZSByb290IG9mIHRoZSBgICtcbiAgICAgICAgYFxcYCR7Y29uZi5naXRodWJPcmd9LyR7cGFja2FnZU5hbWV9XFxgIHJlcG9zaXRvcnksICBzbyBJJ2xsIHdhaXQgZm9yIGAgK1xuICAgICAgICBgQXBwdmV5b3IgdG8gdGVsbCBtZSB0aGF0IGl0IGhhcyBzdWNjZXNzZnVsbHkgYnVpbHQgb24gV2luZG93cyBgICtcbiAgICAgICAgYGJlZm9yZSBJIHZhbGlkYXRlIGEgdGFnIGZvciBkZXBsb3ltZW50LiBNYWtlIHN1cmUgdG8gc2V0dXAgdGhlIGhvb2shYDtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RhdHVzUmVwbHkgKz1cbiAgICAgICAgYCpJIGRpZG4ndCBmaW5kIGFueSBjbG91ZCBDSSBjb25maWd1cmF0aW9uIGZpbGVzIEkgcmVjb2duaXplZCBpbiBgICtcbiAgICAgICAgYHRoZSByb290IG9mIHRoaXMgcmVwb3NpdG9yeS4qIEkgY2FuIHJlY29nbml6ZSBib3RoIFxcYC50cmF2aXMueW1sXFxgIGAgK1xuICAgICAgICBgYW5kIFxcYGFwcHZleW9yLnltbFxcYC4gSSByZWFsbHkgd291bGQgcmF0aGVyIHlvdSBkaWQgb25lIG9yIGJvdGggYCArXG4gICAgICAgIGBvZiB0aG9zZSwgYnV0IGlmIHlvdSBjb250aW51ZSB3aXRob3V0IGRvaW5nIHNvLCBJJ2xsIGp1c3QgdmFsaWRhdGUgYCArXG4gICAgICAgIGBldmVyeSB0YWcgYXMgcmVhZHkgZm9yIGRlcGxveW1lbnQuIDpnaG9zdDogU2NhcnkhYFxuICAgIH1cbiAgICBjb252by5zYXkoe1xuICAgICAgdGV4dDogc3RhdHVzUmVwbHksXG4gICAgICAuLi5zdWNjZXNzTWVzc2FnZUZvcm1hdFxuICAgIH0pO1xuICAgIGNvbnZvLmFzaygnSXMgYWxsIHRoYXQgY29ycmVjdD8nLCBbXG4gICAgICB7XG4gICAgICAgIHBhdHRlcm46IGJvdC51dHRlcmFuY2VzLnllcyxcbiAgICAgICAgY2FsbGJhY2s6IChyZXNwb25zZSwgY29udm8pID0+IHtcbiAgICAgICAgICBjb252by5zYXkoXG4gICAgICAgICAgICBgSSB0aG91Z2h0IHNvLiBJJ2xsIGJlIG1vbml0b3JpbmcgJHtwYWNrYWdlTmFtZX0gZnJvbSBub3cgb24uYFxuICAgICAgICAgICk7XG4gICAgICAgICAgY29udm8uc2F5KFxuICAgICAgICAgICAgYE9idmlvdXNseSwgaWYgYW55dGhpbmcgY2hhbmdlcywganVzdCBzYXkgXFxgYWRkIHBhY2thZ2VcXGAgdG8gYCArXG4gICAgICAgICAgICAgIGBtZSBhZ2FpbiBhbmQgSSB3aWxsIHVwZGF0ZSBldmVyeXRoaW5nLmBcbiAgICAgICAgICApO1xuICAgICAgICAgIGZpbmlzaEFkZFBhY2thZ2UoKVxuICAgICAgICAgIGNvbnZvLm5leHQoKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgcGF0dGVybjogYm90LnV0dGVyYW5jZXMubm8sXG4gICAgICAgIGNhbGxiYWNrOiAocmVzcG9uc2UsIGNvbnZvKSA9PiB7XG4gICAgICAgICAgY29udm8uc2F5KFxuICAgICAgICAgICAgYE9LLiBNYWtlIGFueSBuZWNlc3NhcnkgY2hhbmdlcyB0byB0aGUgcmVwb3NpdG9yeSwgb3IgdG8gbWUgSSBgICtcbiAgICAgICAgICAgICAgYHN1cHBvc2UsIGFuZCB0cnkgYWdhaW4gbGF0ZXIuYFxuICAgICAgICAgICk7XG4gICAgICAgICAgY29udm8ubmV4dCgpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgICBjYWxsYmFjazogKHJlc3BvbnNlLCBjb252bykgPT4ge1xuICAgICAgICAgIC8vIGp1c3QgcmVwZWF0IHRoZSBxdWVzdGlvblxuICAgICAgICAgIGNvbnZvLnJlcGVhdCgpO1xuICAgICAgICAgIGNvbnZvLm5leHQoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIF0pO1xuXG4gIH0pO1xufVxuXG5kb2Jicy5oZWFycyhcbiAgWydzdGF0dXMgKFtBLVphLXowLTlcXC1cXC5cXF9dKyknXSxcbiAgWydkaXJlY3RfbWVudGlvbiddLFxuICAoZG9iYnMsIG1zZykgPT4ge1xuICAgIGxldCBwYWNrYWdlTmFtZSA9IG1zZy5tYXRjaFsxXTtcbiAgICBsb2dnZXIuaW5mbygncGFja2FnZSBzdGF0dXMgcmVxdWVzdGVkJywgcGFja2FnZU5hbWUsIG1zZyk7XG4gICAgZ2l0aHViLnJlcG9TdGF0dXMocGFja2FnZU5hbWUpXG4gICAgLnN1YnNjcmliZShcbiAgICAgIChkYXRhKSA9PiB7XG4gICAgICAgIGxvZ2dlci5pbmZvKCdnb3QgcGFja2FnZSBzdGF0dXMnLCBwYWNrYWdlTmFtZSwgZGF0YSk7XG4gICAgICB9XG4gICAgKTtcbiAgfVxuKVxuXG5kb2Jicy5oZWFycyhcbiAgWydhZGQgcGFja2FnZSAoW0EtWmEtejAtOVxcLVxcLlxcX10rKSddLFxuICBbJ2RpcmVjdF9tZW50aW9uJ10sXG4gIChkb2JicywgbXNnKSA9PiB7XG4gICAgbGV0IHBhY2thZ2VOYW1lID0gbXNnLm1hdGNoWzFdO1xuICAgIGxvZ2dlci5pbmZvKCdhZGQgcGFja2FnZSByZXF1ZXN0ZWQnLCBwYWNrYWdlTmFtZSwgbXNnKTtcbiAgICBnaXRodWIucmVwb0luZm8ocGFja2FnZU5hbWUpXG4gICAgLnN1YnNjcmliZShcbiAgICAgIChkYXRhKSA9PiB7XG4gICAgICAgIGxvZ2dlci5pbmZvKGBzdWNjZXNzZnVsbHkgZ290IGdpdGh1YiBpbmZvIGZvciAke3BhY2thZ2VOYW1lfWAsIGRhdGEpO1xuICAgICAgICBhZGRQYWNrYWdlKGRvYmJzLCBtc2csIHBhY2thZ2VOYW1lLCBkYXRhKTtcbiAgICAgIH0sXG4gICAgICAoZXJyKSA9PiB7XG4gICAgICAgIGlmIChlcnIuc3RhdHVzQ29kZSA9PT0gNDA0KSB7XG4gICAgICAgICAgbG9nZ2VyLndhcm5pbmcoXG4gICAgICAgICAgICBgJHttc2cudXNlcn0gYXNrZWQgYWJvdXQgdW5rbm93biBwYWNrYWdlICR7cGFja2FnZU5hbWV9YFxuICAgICAgICAgICk7XG4gICAgICAgICAgZG9iYnMucmVwbHkobXNnLCB7XG4gICAgICAgICAgICB0ZXh0OiBgSSBjb3VsZG4ndCBmaW5kIGEgcmVwbyBuYW1lZCBcXGAke3BhY2thZ2VOYW1lfVxcYCBpbiB0aGUgYCArXG4gICAgICAgICAgICAgIGBcXGAvJHtjb25mLmdpdGh1Yk9yZ31cXGAgR2l0SHViIG9yZ2FuaXphdGlvbi4gSXMgaXQgcHVibGljP2AsXG4gICAgICAgICAgICAuLi5lcnJvck1lc3NhZ2VGb3JtYXRcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsb2dnZXIuZXJyb3IoYHVua25vd24gZXJyb3IgcmVxdWVzdGluZyBwYWNrYWdlICR7cGFja2FnZU5hbWV9YCwgZXJyKTtcbiAgICAgICAgICBkb2Jicy5yZXBseShtc2csIHtcbiAgICAgICAgICAgIHRleHQ6IGBVbmV4cGVjdGVkIGVycm9yIHRyeWluZyB0byB0YWxrIHRvIEdpdEh1Yi4gRml4IG1lIWAsXG4gICAgICAgICAgICAuLi5lcnJvck1lc3NhZ2VGb3JtYXRcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICk7XG4gIH1cbik7XG4iXX0=
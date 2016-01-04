'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _botkit = require('botkit');

var _conf = require('./conf');

var _conf2 = _interopRequireDefault(_conf);

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _githubClient = require('./github-client');

var _githubClient2 = _interopRequireDefault(_githubClient);

var _frivolity = require('./frivolity');

var _frivolity2 = _interopRequireDefault(_frivolity);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

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

githubHook.incoming.subscribe(r => {
  let payload = r.data;
  let event = r.event;
  bot.sendWebhook(_extends({
    channel: 'dobbstest',
    text: 'Damn, son, I got a ' + event,
    attachments: [{
      fallback: JSON.stringify(payload).slice(0, 100),
      color: '#1DED05',
      title: 'GitHub sez:',
      fields: Object.keys(payload).map(k => {
        let stringValue = typeof payload[k] === 'string' ? payload[k] : JSON.stringify(payload[k]);
        return {
          title: k,
          value: stringValue,
          short: stringValue.length < 20
        };
      })
    }]
  }, standardMessageFormat));
});

function addPackage(dobbs, msg, packageName, _ref) {
  let head = _ref.head;
  let tags = _ref.tags;
  let contents = _ref.contents;

  dobbs.startConversation(msg, (err, convo) => {
    if (err) logger.error(err);
    let has = {
      pkg: contents.some(_ref2 => {
        let path = _ref2.path;
        return path === 'package.json';
      }),
      travis: contents.some(_ref3 => {
        let path = _ref3.path;
        return path === '.travis.yml';
      }),
      appveyor: contents.some(_ref4 => {
        let path = _ref4.path;
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
import { slackbot } from 'botkit';
import conf from './conf'
import Logger from './logger';
import GithubClient from './github-client';
import frivolity from './frivolity';
import moment from 'moment';
import GithubHook from './github-hook-listener';

const logger = Logger(conf);
const github = GithubClient({ logger, ...conf });
const botController = slackbot({ logger });
const githubHook = GithubHook({ logger, ...conf });

const bot = botController.spawn({ 
  token: conf.slackToken,
  incoming_webhook: {
    url: conf.slackWebhookUrl
  }
}).startRTM();

const dobbs = frivolity(conf, botController);

const standardMessageFormat = {
  icon_url: conf.botIcon,
  username: conf.botName
};

const successMessageFormat = {
  icon_url: conf.successIcon,
  username: conf.botName
};

const errorMessageFormat = {
  icon_url: conf.errorIcon,
  username: conf.botName
};

githubHook.incoming.subscribe(
  (r) => {
    let payload = r.data;
    let event = r.event;
    bot.sendWebhook({
      channel: 'dobbstest',
      text: 'Damn, son, I got a ' + event,
      attachments: [
        {
          fallback: JSON.stringify(payload).slice(0, 100),
          color: '#1DED05',
          title: 'GitHub sez:',
          fields: Object.keys(payload).map((k) => {
            let stringValue =
              typeof payload[k] === 'string' ? payload[k] :
                JSON.stringify(payload[k]);
            return {
              title: k,
              value: stringValue,
              short: stringValue.length < 20
            };
          })
        }
      ],
      ...standardMessageFormat
    });
  }
);

function addPackage(dobbs, msg, packageName, { head, tags, contents }) {
  dobbs.startConversation(msg, (err, convo) => {
    if (err) logger.error(err);
    let has = {
      pkg: contents.some(({ path }) => path === 'package.json'),
      travis: contents.some(({ path }) => path === '.travis.yml'),
      appveyor: contents.some(({ path }) => path === 'appveyor.yml'),
    };
    let latestTag = tags[0];
    let repoUrl = `https://github.com/${conf.githubOrg}/${packageName}`;
    logger.info(`${packageName} latest tag:`, latestTag);
    logger.info(`${packageName} head:`, head);
    let author = head.commit.author;
    let statusReply = `
I found a repository for the \`${packageName}\` package on GitHub.
Its latest tag is *${latestTag.name}*.
Its most recent commit is *${head.sha.slice(0,8)}*, created by ` +
      `${author.name} ${moment(author.date).fromNow()}, with this message:


> ${head.commit.message}

`;
    if (!has.pkg) {
      convo.say({
        text: `I found a repository for \`${packageName}\`, but it has no ` +
        `\`package.json\` file, so I don't think it's an NPM package.`,
        ...errorMessageFormat
      });
      return convo.next();
    } else if (has.travis && has.appveyor) {
      statusReply +=
        `I found both a \`.travis.yml\` and an \`appveyor.yml\` at the root ` +
        `of the \`${conf.githubOrg}/${packageName}\` repository, so I'll ` +
        `wait for both Travis and Appveyor to tell me that it has ` +
        `successfully built before I validate a tag for deployment. Make ` +
        `sure to setup the hooks for both!`
    } else if (has.travis) {
      statusReply +=
        `I found a \`.travis.yml\` file at the root of the ` +
        `\`${conf.githubOrg}/${packageName}\` repository, so I'll wait for ` +
        `Travis to tell me that it has successfully built on Linux and/or ` +
        `OSX before I validate a tag for deployment. Make sure to setup the ` +
        `hook!`;
    } else if (has.appveyor) {
      statusReply +=
        `I found an \`appveyor.yml\` file at the root of the ` +
        `\`${conf.githubOrg}/${packageName}\` repository,  so I'll wait for ` +
        `Appveyor to tell me that it has successfully built on Windows ` +
        `before I validate a tag for deployment. Make sure to setup the hook!`;
    } else {
      statusReply +=
        `*I didn't find any cloud CI configuration files I recognized in ` +
        `the root of this repository.* I can recognize both \`.travis.yml\` ` +
        `and \`appveyor.yml\`. I really would rather you did one or both ` +
        `of those, but if you continue without doing so, I'll just validate ` +
        `every tag as ready for deployment. :ghost: Scary!`
    }
    convo.say({
      text: statusReply,
      ...successMessageFormat
    });
    convo.ask('Is all that correct?', [
      {
        pattern: bot.utterances.yes,
        callback: (response, convo) => {
          convo.say(
            `I thought so. I'll be monitoring ${packageName} from now on.`
          );
          convo.say(
            `Obviously, if anything changes, just say \`add package\` to ` +
              `me again and I will update everything.`
          );
          finishAddPackage()
          convo.next();
        }
      },
      {
        pattern: bot.utterances.no,
        callback: (response, convo) => {
          convo.say(
            `OK. Make any necessary changes to the repository, or to me I ` +
              `suppose, and try again later.`
          );
          convo.next();
        }
      },
      {
        default: true,
        callback: (response, convo) => {
          // just repeat the question
          convo.repeat();
          convo.next();
        }
      }
    ]);

  });
}

dobbs.hears(
  ['status ([A-Za-z0-9\-\.\_]+)'],
  ['direct_mention'],
  (dobbs, msg) => {
    let packageName = msg.match[1];
    logger.info('package status requested', packageName, msg);
    github.repoStatus(packageName)
    .subscribe(
      (data) => {
        logger.info('got package status', packageName, data);
      }
    );
  }
)

dobbs.hears(
  ['add package ([A-Za-z0-9\-\.\_]+)'],
  ['direct_mention'],
  (dobbs, msg) => {
    let packageName = msg.match[1];
    logger.info('add package requested', packageName, msg);
    github.repoInfo(packageName)
    .subscribe(
      (data) => {
        logger.info(`successfully got github info for ${packageName}`, data);
        addPackage(dobbs, msg, packageName, data);
      },
      (err) => {
        if (err.statusCode === 404) {
          logger.warning(
            `${msg.user} asked about unknown package ${packageName}`
          );
          dobbs.reply(msg, {
            text: `I couldn't find a repo named \`${packageName}\` in the ` +
              `\`/${conf.githubOrg}\` GitHub organization. Is it public?`,
            ...errorMessageFormat
          });
        } else {
          logger.error(`unknown error requesting package ${packageName}`, err);
          dobbs.reply(msg, {
            text: `Unexpected error trying to talk to GitHub. Fix me!`,
            ...errorMessageFormat
          });
        }
      }
    );
  }
);

import { Observable } from 'rx';
import { slackbot } from 'botkit';
import semver from 'semver';
import moment from 'moment';
import NpmClient from 'npm-registry-client';
import conf from './conf';
import Logger from './logger';
import GithubClient from './github-client';
import frivolity from './frivolity';
import GithubHook from './github-hook-listener';

const logger = Logger(conf);
const github = GithubClient({ logger, ...conf });
const botController = slackbot({ logger });
const githubHook = GithubHook({ logger, ...conf });
const npmClient = new NpmClient({ log: logger });

const bot = botController.spawn({ 
  token: conf.slackToken,
  incoming_webhook: {
    url: conf.slackWebhookUrl
  }
}).startRTM();

const dobbs = frivolity(conf, botController);

const successColor = '#1DED05';
const errorColor = '#D00D00';

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

function allCiSucceeded({ repository, sha, statuses, contents }) {
  let successes = statuses.filter(({ state }) => state === 'success');
  return conf.ciProviders.every(
    ({ name, configFile, statusContext }) => {
      let isConfigured = contents.some(({ path }) => path === configFile);
      let successFound = !isConfigured ||
        successes.find(({ context }) => context === statusContext);
      if (isConfigured && successFound) {
        logger.notice(
          `${name} build success for ${repository.name}#${sha}, triggered by`,
          successFound
        );
      }
      return !!successFound;
    }
  )
}
const getNpmStatus = Observable.fromNodeCallback(
  npmClient.get,
  npmClient,
  (data) => data
);

githubHook.incoming.filter(
  ({ event, data }) => event === 'status' && data.state === 'success'
).do(
  ({ data }) => logger.info('Received success notification', data)
).map(
  ({ data }) => Observable.forkJoin(
    Observable.of(data),
    github.fullCommitStatus(data.repository.name, data.sha),
    ({ repository, sha }, { statuses, contents }) =>
      ({ repository, sha, statuses, contents })
  )
).concatAll().filter(
  ({ repository, sha, statuses, contents }) => {
    logger.info('Received full status for', repository.name,  sha);
    let hasPkg = contents.some(({ path }) => path === 'package.json');
    return hasPkg && allCiSucceeded({ repository, sha, statuses, contents });
  }
).map(
  ({ repository, sha }) => Observable.forkJoin(
    Observable.of({ repository, sha }),
    github.tags(repository.name),
    ({ repository, sha }, tags) =>
      ({
        repository,
        sha,
        tag: tags.find(({ commit }) => commit && commit.sha === sha)
      })
  )
).concatAll().filter(({ tag }) => tag && semver.clean(tag.name))
.subscribe(
  ({ repository, sha, tag }) => {
    let name = repository.name;
    logger.notice(
      'gonna notify CI success on tag', name, sha
    );
    bot.sendWebhook({
      channel: conf.statusChannel,
      attachments: [
        {
          color: successColor,
          fallback: `${name} ${tag.name} ready for publish.`,
          pretext: `npm package build success for \`${name}\`!`,
          title: `${tag.name} of the ${name} package is ready to be ` +
                 `published to NPM.`,
          text: `When publishing, be sure your local repository is at ` +
                `that exact version: \`git checkout ${tag.name} && npm ` +
                `publish\`.`,
          fields: Object.keys(tag).map((k) => {
            let stringValue =
              typeof tag[k] === 'string' ? tag[k] :
                JSON.stringify(tag[k]);
            return {
              title: k,
              value: stringValue,
              short: stringValue.length < 20
            };
          }),
          mrkdwn_in: ['pretext', 'text']
        }
      ],
      ...successMessageFormat
    })
  },
  logger.error
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

function getPackageStatus(dobbs, msg, packageName, branch) {
  return Observable.forkJoin
    github.latestCommitStatus(packageName, branch),
    getNpmStatus(packageName),
    (githubInfo, npmInfo) => ({ npmInfo, ...githubInfo })
  ).map(
    (data) => ({
      latestGoodTag: data.tags.find(
        (tag) => allCiSucceeded({
          repository: { name: packageName },
          sha: tag.commit.sha,
          statuses: data.statuses.filter(
            ({ url }) => ~url.indexOf(tag.commit.sha),
          ),
          contents: data.contents
        })
      ),
      ...data
    })
  )
}


dobbs.hears(
  ['status ([A-Za-z0-9\-\.\_]+)(?: ([A-Za-z0-9\-\/\_]+))?'],
  ['direct_mention'],
  (dobbs, msg) => {
    let packageName = msg.match[1];
    let branch = msg.match[2] || 'master';
    logger.info('package status requested', packageName, msg);
    getPackageStatus(dobbs, msg, packageName, branch)
    .subscribe(
      ({ npmInfo, contents, latestGoodTag, commits }) => {
        let headClear = latestGoodTag &&
          latestGoodTag.commit.sha === commits[0].sha;
        let payload = {
          fields: [],
          mkrdwn_in: ['text']
        };
        if (headClear) {
          payload.color = successColor;
          payload.text = `The \`${branch}\` branch of \`${packageName}\` is ` +
            `currently at exactly *${tag.name$}*. That version is confirmed ` +
            `valid and ready to be published.`;
          payload.fields.push({
            title: 'Ready for publish?',
            value: ':white_check_mark:',
            short: true
          });
          payload.fields.push({
            title: 'Run command',
            value: '`npm publish`',
            short: true
          });
        } else {
          payload.text = `The \`${branch}\` branch of \`${packageName}\` is ` +
            `not ready for publish.`
          let commitsBehind = latestGoodTag && commits.findIndex(
            ({ sha }) => sha === latestGoodTag.commit.sha
          );
          payload.color = errorColor;
        }
        conf.ciProviders.forEach(({ name, configFile }) => {
          payload.fields.push({
            title: name + ' CI Enabled',
            short: true,
            value: contents.some(({ path }) => path === configFile) ?
              `*Yes* _(\`${configFile}\` present)_`
              :
              `*No* _(\`${configFile}\` absent)_`
          });
        })
        dobbs.reply(msg, {
          text: `Status for \`${packageName}\``,
          attachments: [
            {
              color: headClear ? successColor : errorColor,

            }
          ]
          mrkdwn_in: ['text']
          ...standardMessageFormat
        })
      },
      (err) => {
        logger.error(err);
      }
    )
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

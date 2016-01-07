import Rx from 'rx';
import { slackbot } from 'botkit';
import fetch from 'node-fetch';
import semver from 'semver';
import moment from 'moment';
import conf from './conf';
import Logger from './logger';
import GithubClient from './github-client';
import frivolity from './frivolity';
import GithubHook from './github-hook-listener';

if (conf.logLevel > 5) Rx.config.longStackSupport = true;
const { Observable } = Rx;

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

function getNpmStatus(packageName) {
  return Observable.fromPromise(
    fetch(conf.npmRegistry + packageName)
      .then((res) => res.json())
      .catch(() => false)
  );
}

let successfulBuilds$ = githubHook.incoming.filter(
  ({ event, data }) => event === 'status' && data.state === 'success'
).do(
  ({ data }) => logger.info('Received success notification', data)
).map(
  ({ data }) => {
    let getRepoData = github.forRepo(data.repository.name);
    return Observable.forkJoin(
      Observable.just(data),
      getRepoData('statuses', data.sha),
      getRepoData('contents', '/', data.sha),
      ({ repository, sha }, statuses, contents ) =>
        ({ repository, sha, statuses, contents })
    );
  }
).concatAll().filter(
  ({ repository, sha, statuses, contents }) => {
    logger.info('Received full status for', repository.name,  sha);
    let hasPkg = contents.some(({ path }) => path === 'package.json');
    return hasPkg && allCiSucceeded({ repository, sha, statuses, contents });
  }
).map(
  ({ repository, sha }) => Observable.forkJoin(
    Observable.of({ repository, sha }),
    github.forRepo(repository.name)('tags'),
    ({ repository, sha }, tags) =>
      ({
        repository,
        sha,
        tag: tags.find(({ commit }) => commit && commit.sha === sha)
      })
  )
).concatAll().filter(({ tag }) => tag && semver.clean(tag.name));

successfulBuilds$.subscribeOnNext(({ repository, sha, tag }) => {
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
  });
});

successfulBuilds$.subscribeOnError(logger.error);

function getPackageStatus(packageName, branch) {
  let getRepoData = github.forRepo(packageName);
  return getRepoData('tags')
  .map(
    (tags) => Observable.just(tags).forkJoin(
      getRepoData('contents', '/', branch),
      getRepoData('commits'),
      (tags, contents, commits) => ({ tags, contents, commits })
    )
  ).concatAll().map(
    (data) => ({
      latestGoodTag: data.tags.find(
        (tag) => allCiSucceeded({
          repository: { name: packageName },
          sha: tag.commit.sha,
          statuses: data.statuses.filter(
            ({ url }) => ~url.indexOf(tag.commit.sha)
          ),
          contents: data.contents
        })
      ),
      ciProvidersConfigured: conf.ciProviders.filter(
        ({ configFile }) =>
          data.contents.some(({ path }) => path === configFile)
      ),
      ...data
    })
  )
}

function formatPackageStatus(d) {
  let {
    packageName,
    branch,
    npmInfo,
    contents,
    latestGoodTag,
    commits,
    ciProvidersConfigured
  } = d;
  logger.info('about to format a status message', packageName, branch);
  let status = {
    fields: {}
  };
  let readyForPublish = false;
  let headIsPublishable = false;

  status.fields['CI Providers Configured'] =
    ciProvidersConfigured.length > 0 ?
      ciProvidersConfigured.map(({ name }) => name).join(', ')
      :
      '_None. I recommend at least one._';

  if (!latestGoodTag) {
    status.good = false;
    status.text = `I couldn't find any tagged versions in the ` +
      `\`${packageName}\` repository that had successfully built.`;
    return status;
  }

  status.fields['Latest valid tag in repo'] = latestGoodTag.name;
  logger.notice('latest good tag', latestGoodTag);
  // status.fields['Latest tag created'] =
  //   moment()
  headIsPublishable = latestGoodTag &&
    latestGoodTag.commit.sha === commits[0].sha;

  if (!headIsPublishable) {
    status.fields['Don\'t publish HEAD!'] = `The tip of the \`${branch}\` ` +
      `branch of the \`${packageName}\` repository has moved ahead of the ` +
      `latest known-good tag, so don't run \`npm publish\` willy-nilly; ` +
      `use \`git checkout\` to get your working tree into a known-good ` +
      `state first.`;
  }

  if (!npmInfo) {
    status.fields['Current version on NPM'] = '_Never published!_';
    if (ciProvidersConfigured.length > 0) {
      status.text = `I couldn't find the \`${packageName}\` package on NPM, ` +
        `but the ${latestGoodTag.name} tag in the repository has passed CI, ` +
        `so we're ready for an initial publish to NPM!`
      readyForPublish = true;
      status.good = true;
    } else {
      status.text = `I couldn't find the \`${packageName}\` package on NPM, ` +
        `and the repo has no CI configured, so I don't know for sure ` +
        `whether the latest tag, ${latestGoodTag.name}, is ready. *Publish ` +
        `to NPM at your own risk.*`;
      status.good = false;
      status.fields['Ready for publish?'] = ':question:';
      return status;
    }
  }

  let npmVersions = Object.keys(npmInfo.versions)
    .sort(semver.rcompare)
    .map((v) => npmInfo.versions[v]);
  let currentNpm = npmVersions[0];

  status.fields['Current version on NPM'] =
    `<http://npmjs.org/package/${packageName}|${currentNpm.version}>`;
  status.fields['Last published to NPM'] =
    moment(npmInfo.time[currentNpm.version]).fromNow();

  switch(semver.compare(currentNpm.version, latestGoodTag.name)) {
    case 0:
      status.good = true;
      readyForPublish = false;
      // TODO: compare the currentNpm.gitHead and latestGoodTag.commit.sha
      // and say something terrified if they aren't the same
      // also TODO check package.json to make sure it's what it should be
      status.text = `NPM is already up to date with the latest good version ` +
        `of \`${packageName}\`, *${currentNpm.version}*`
      break;
    case -1:
      status.good = true;
      readyForPublish = true;
      status.text = `The current version of \`${packageName}\` published to ` +
        `NPM is *${currentNpm.version}*, and the repository is ahead by at ` +
        `least one ${semver.diff(currentNpm.version, latestGoodTag.name)} ` +
        `version: it's at *${latestGoodTag.name}*. *Ready to publish!*`;
      break;
    case 1:
      status.good = false;
      readyForPublish = false;
      status.text = `*Not good.* The current version of \`${packageName}\` ` +
        `published to NPM is *${currentNpm.version}*, but the repository's ` +
        `latest good version is *${latestGoodTag.name}*, which is at least ` +
        `one ${semver.diff(currentNpm.version, latestGoodTag.name)} version ` +
        `behind. Was a version published before it had built successfully? ` +
        `Was a version published from a different branch than \`${branch}\`` +
        `? *Please investigate.*`
      break;
    default:
      status.good = false;
      status.text = `The entire world is on fire.`;
      break;
  }

  if (readyForPublish) {
    status.fields['Ready for publish?'] = ':white_check_mark:';
    status.fields['Run command:'] = headIsPublishable ?
      '`npm publish`' :
      `\`git checkout ${latestGoodTag.name}; npm publish\``;
  } else {
    status.fields['Ready for publish?'] = ':x:'
  }

  return status;
}

dobbs.hears(
  ['status ([A-Za-z0-9\-\.\_]+)(?: ([A-Za-z0-9\-\/\_]+))?'],
  ['direct_mention'],
  (dobbs, msg) => {
    let packageName = msg.match[1];
    let branch = msg.match[2] || 'master';
    logger.info('package status requested', packageName, msg);

    let packageStatus$ = getPackageStatus(packageName, branch);

    packageStatus$.subscribeOnNext((data) => {
      let status = formatPackageStatus({ packageName, branch, ...data});
      dobbs.reply(msg, {
        text: `Status for \`${packageName}\``,
        attachments: [{
          color: status.good ? successColor : errorColor,
          title: status.good ? 'Good News!' : 'Keep Calm!',
          text: status.text,
          fields: Object.keys(status.fields).map((k) => ({
            title: k,
            value: status.fields[k],
            short: status.fields[k].length < 20
          })),
          mrkdwn_in: ['text', 'fields']
        }],
        mrkdwn_in: ['text', 'fields'],
        ...standardMessageFormat
      });
    });

    packageStatus$.subscribeOnError((e) => {
      logger.error('error getting package status', e);
    });
  }
);

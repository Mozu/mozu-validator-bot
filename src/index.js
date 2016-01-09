import { inspect } from 'util';
import Rx from 'rx';
import { slackbot } from 'botkit';
import fetch from 'node-fetch';
import semver from 'semver';
import conf from './conf';
import Logger from './logger';
import GithubClient from './github-client';
import frivolity from './frivolity';
import GithubHook from './github-hook-listener';
import { colors, formats, formatPackageStatus } from './formatting';

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

successfulBuilds$.subscribe(
  ({ repository, sha, tag }) => {
    let name = repository.name;
    logger.notice(
      'gonna notify CI success on tag', name, sha
    );
    bot.sendWebhook({
      channel: conf.statusChannel,
      attachments: [
        {
          color: colors.success,
          fallback: `${name} ${tag.name} ready for publish.`,
          pretext: `npm package build success for \`${name}\`!`,
          title: `${tag.name} of the ${name} package is ready to be ` +
            `published to NPM.`,
            text: `When publishing, be sure your local repository is at ` +
            `that exact version: \`git checkout ${tag.name} && npm ` +
            `publish\`.`,
          fields: Object.keys(tag).map((k) => {
            let stringValue = typeof tag[k] === 'string' ? tag[k] :
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
      ...formats.success
    });
  },
  logger.error
);

function getPackageStatus(packageName, branch) {
  let getRepoData = github.forRepo(packageName);
  return getRepoData('tags')
  .map(
    (tags) => Observable.forkJoin(
      Observable.just(tags),
      getRepoData('contents', '/', branch),
      getRepoData('statuses', branch),
      getRepoData('commits'),
      getNpmStatus(packageName),
      (tags, contents, statuses, commits, npmInfo) =>
        ({ tags, contents, statuses, commits, npmInfo })
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


dobbs.hears(
  ['status ([A-Za-z0-9\-\.\_]+)(?: ([A-Za-z0-9\-\/\_]+))?'],
  ['direct_mention'],
  (dobbs, msg) => {
    let packageName = msg.match[1];
    let branch = msg.match[2] || 'master';
    logger.info('package status requested', packageName, msg);

    let packageStatus$ = getPackageStatus(packageName, branch);

    packageStatus$.subscribe((data) => {
      let status = formatPackageStatus(
        { packageName, branch, ...data}
      );
      dobbs.reply(msg, {
        text: `Status for \`${packageName}\``,
        attachments: [{
          color: status.good ? colors.success : colors.error,
          title: status.title || (status.good ? 'Good News!' : 'Keep Calm!'),
          text: status.text,
          fields: Object.keys(status.fields).map((k) => ({
            title: k,
            value: status.fields[k],
            short: status.fields[k].length < 20
          })),
          mrkdwn_in: ['text', 'fields']
        }],
        mrkdwn_in: ['text', 'fields'],
        ...formats.standard
      });
    },
    (e) => {
      logger.error('status check failed', e);
      let reply = {...formats.error};
      if (e.statusCode === 404 &&
          e.headers &&
          e.headers.server === 'GitHub.com') {
        reply.text = `Could not find \`${packageName}\` in the ` +
          `\`${conf.githubOrg}\` GitHub organization. Is it private? _Does ` +
          `it even exist?_`;
      } else {
        reply.text = `Boy, I had a doozy of a time trying to do that. Here ` +
          `is the error.`;
        reply.attachments = [
          {
            color: colors.error,
            title: e.message,
            text: '```\n' + inspect(e) + '\n```'
          }
        ];
      }
      dobbs.reply(msg, reply);
    });
  }
);

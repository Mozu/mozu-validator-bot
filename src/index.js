import { inspect } from 'util';
import Rx from 'rx';
import { slackbot } from 'botkit';
import conf from './conf';
import Logger from './logger';
import GithubClient from './github-client';
import NpmClient from './npm-client';
import frivolity from './frivolity';
import IncomingRequests from './incoming-requests';
import { colors, formats, formatPackageStatus } from './formatting';
import { allCiSucceeded } from './ci-check';
import { filterForBuildSuccess, getPackageStatus } from './status-monitors';

const { logLevel, ciProviders, github, slack, statusChannel } = conf;

if (logLevel > 5) Rx.config.longStackSupport = true;

const logger = Logger(conf);
const githubClient = GithubClient({ logger, ...conf });
const npmClient = NpmClient({ logger, ...conf });
const botController = slackbot({ logger });
const incoming = IncomingRequests({ logger, githubClient, ...conf});
const bot = botController.spawn(slack).startRTM();
const dobbs = frivolity(conf, botController);

let successfulBuilds$ = filterForBuildSuccess({
  events$: incoming.githubHooks,
  logger,
  githubClient,
  github
});

successfulBuilds$.subscribe(
  ({ repository, sha, tag }) => {
    let name = repository.name;
    logger.notice(
      'gonna notify CI success on tag', name, sha
    );
    bot.sendWebhook({
      channel: statusChannel,
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

dobbs.hears(
  ['status ([A-Za-z0-9\-\.\_]+)(?: ([A-Za-z0-9\-\/\_]+))?'],
  ['direct_mention'],
  (dobbs, msg) => {
    let packageName = msg.match[1];
    let branch = msg.match[2] || 'master';
    logger.info('package status requested', packageName, msg);

    let packageStatus$ = getPackageStatus({
      packageName,
      branch,
      githubClient,
      github,
      npmClient,
      ciProviders
    });

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
            short: status.fields[k].length < 40
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
          `\`${github.org}\` GitHub organization. Is it private? _Does ` +
          `it even exist?_`;
      } else {
        reply.text = `Boy, I had a doozy of a time trying to do that. Here ` +
          `is the error.`;
        reply.attachments = [
          {
            color: colors.error,
            title: e.message,
            text: '```\n' + inspect(e) + '\n```',
            fields: [
              {
                title: 'Stack trace',
                value: '```\n' + e.stack + '\n```',
                short: false
              }
            ],
            mrkdwn_in: ['text', 'fields']
          }
        ];
        console.log(e.stack);
      }
      dobbs.reply(msg, reply);
    });
  }
);

incoming.checkRequests.subscribe(
  ({ reply, name, branch = 'master' }) =>
    getPackageStatus(name, branch).subscribe(
      (d) => reply(200, d),
      (e) => reply(400, e)
    )
);

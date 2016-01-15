import { inspect } from 'util';
import Rx from 'rx';
import { slackbot } from 'botkit';
import conf from './conf';
import Logger from './logger';
import GithubClient from './github-client';
import NpmClient from './npm-client';
import frivolity from './frivolity';
import IncomingRequests from './incoming-requests';
import Formatter from './formatting';
import { allCiSucceeded } from './ci-check';
import { filterForBuildSuccess, getPackageStatus } from './status-monitors';

const { logLevel, ciProviders, github, slack, statusChannel } = conf;

if (logLevel > 5) Rx.config.longStackSupport = true;

const { colors, formats, formatPackageStatus } = Formatter(conf);
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
  ({ originalStatus, tag }) => {
    let { sha, name, commit } = originalStatus;
    let { author } = commit;
    logger.notice(
      'gonna notify CI success on tag', originalStatus, tag
    );
    bot.sendWebhook({
      channel: statusChannel,
      attachments: [
        {
          fallback: `${name} ${tag.name} ready for publish.`,
          pretext: `Build success for \`${name}\`!`,
          color: colors.success,
          author_name: author.login,
          author_icon: author.avatar_url,
          author_link: author.html_url,
          thumb_url: originalStatus.organization.avatar_url,
          title: `${tag.name} of the ${name} package is ready to be ` +
            `published to NPM.`,
          title_link: originalStatus.repository.html_url,
          text: `When publishing, be sure your local repository is at ` +
          `that exact version: \`git checkout ${tag.name} && npm ` +
          `publish\`.`,
          mrkdwn_in: ['pretext', 'text']
        }
      ],
      ...formats.success
    });
  },
  logger.error
);

dobbs.hears(
  ['^help\\b'],
  ['direct_mention'],
  (dobbs, msg) => {
    dobbs.reply(msg, {
      text: `*I'm a validation monitor for Mozu NPM packages.*.

I'm configured to monitor all NPM packages (that is, repositories with a \`package.json\`) in the \`https://github.com/${github.org}\` GitHub organization and notify this channel when one of them successfully builds using a configured continuous integration vendor.

You don't need to configure me when you add a new package. I'm always listening to the whole \`${github.org}\` organization, so just create the NPM package and configure CI vendors (using a \`.travis.yml\` and/or an \`appveyor.yml\` file, for example) and I'll report about it.

If you need to check on a package, you can ask me directly. Just ask me something like "@dobbs: status <package name>" and I'll give you the deets.

You can also just say hi to me.`,
      mrkdwn_in: ['text'],
      ...formats.standard
    });
  }
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
    getPackageStatus({
      packageName: name,
      branch,
      githubClient,
      github,
      npmClient,
      ciProviders
    }).subscribe(
      (d) => reply(200, d),
      (e) => reply(400, e)
    )
);

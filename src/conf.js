'use strict';
import rc from 'rc';
const {
  PORT,
  SLACK_TOKEN,
  SLACK_WEBHOOK_URL,
  GITHUB_TOKEN,
  LOG_LEVEL
} = process.env;
export default rc('mozu-validator-bot', {
  web: {
    port: PORT || 8009,
    protocol: 'http:',
    hookPath: '/github-hook',
    checkPath: '/check-package'
  },
  slack: {
    token: SLACK_TOKEN,
    incoming_webhook: {
      url: SLACK_WEBHOOK_URL,
    }
  },
  npm: {
    registry: 'https://registry.npmjs.org/'
  },
  logLevel: LOG_LEVEL || 5,
  botIcon: 'http://i.imgur.com/QFFAmYT.png',
  successIcon: 'http://i.imgur.com/9yzNfsl.png',
  errorIcon: 'http://i.imgur.com/xLUWhF6.png',
  botName: 'J.R. "Bob" Dobbs',
  // Likely as not, you'll want to create a "Personal Access Token" here.
  // This isn't a web application, so users will not be authing and
  // deauthing it. And it shouldn't be logged in as a specific user; but
  // unfortunately GitHub can only grant access tokens for users, rather
  // than organizations. So this token must belong to someone who belongs
  // to the organization. Obviously a blank token won't work; put a user
  // token in `.mozu-validator-botrc`.
  github: {
    token: GITHUB_TOKEN,
    org: 'mozu'
  },
  // Each CI provider in this list will make the bot check, for each repo,
  // whether it has a file in its root that matches the `configFile` name for
  // the provider. If the repo has such a file, then for every "success" event
  // for that repo, the bot will check all recent GitHub statuses for success
  // messages whose `context` property matches the `statusContext` for the
  // provider.
  // The effect of this is that if a repo has a `.travis.yml` at root, then
  // the bot won't validate the new version until it sees a "success" status
  // whose `context` value is "continuous-integration/travis-ci/push". Thus,
  // the bot always waits for all configured providers to succeed.
  ciProviders: [
    {
      name: 'Appveyor',
      configFile: 'appveyor.yml',
      statusContext: 'continuous-integration/appveyor/branch'
    },
    {
      name: 'Travis',
      configFile: '.travis.yml',
      statusContext: 'continuous-integration/travis-ci/push'
    }
  ]
});

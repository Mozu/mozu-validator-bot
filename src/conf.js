'use strict';
import rc from 'rc';
import path from 'path';
const { PORT, SLACK_TOKEN, GITHUB_TOKEN, LOG_PATH, LOG_LEVEL } = process.env;
export default rc('mozu-validator-bot', {
  port: PORT || 8009,
  hookPath: '/github-hook',
  slackToken: SLACK_TOKEN,
  logPath: LOG_PATH || path.join(process.cwd(), 'mozu-validator-bot.log'),
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
  githubToken: GITHUB_TOKEN,
  githubOrg: 'mozu'
});

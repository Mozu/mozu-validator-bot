import semver from 'semver';
import moment from 'moment';
import { botIcon, botName, successIcon, errorIcon } from './conf';

export const colors = {
  success: '#1DED05',
  error: '#D00D00'
};

const standardMessageFormat = {
  icon_url: botIcon,
  username: botName
};

export const formats = {
  standard: standardMessageFormat,
  success: {...standardMessageFormat, icon_url: successIcon },
  error: {...standardMessageFormat, icon_url: errorIcon }
};

export function formatPackageStatus(d) {
  let {
    packageName,
    branch,
    npmInfo,
    contents,
    latestGoodTag,
    commits,
    ciProvidersConfigured
  } = d;
  let status = {
    fields: {}
  };
  let readyForPublish = false;
  let headIsPublishable = false;

  if (!contents.some(({ path }) => path === 'package.json')) {
    status.good = false;
    status.title = 'Nuts!';
    status.text = `The \`${packageName}\` repository does not appear to ` +
      `have a \`package.json\` file, so, not to put too fine a point on it, ` +
      `but I don't care about it.`;
    return status;
  }

  status.fields['CI Providers Configured'] =
    ciProvidersConfigured.length > 0 ?
      ciProvidersConfigured.map(({ name }) => name).join(', ')
      :
      '_None. I recommend at least one._';

  if (!latestGoodTag) {
    status.title = 'Jinkies!';
    status.good = false;
    status.text = `I couldn't find any tagged versions in the ` +
      `\`${packageName}\` repository that had successfully built.`;
    return status;
  }

  // get full commit object
  latestGoodTag.commit = commits.find(
    ({ sha }) => sha === latestGoodTag.commit.sha
  );

  let latestAuthor = latestGoodTag.commit.author;

  status.fields['Latest valid tag in repo'] = 
    `<${latestGoodTag.commit.html_url}|${latestGoodTag.name}>, created by ` +
    `<${latestAuthor.html_url}|${latestAuthor.login}> ` +
    moment(latestGoodTag.commit.commit.author.date).fromNow();

  headIsPublishable = latestGoodTag &&
    latestGoodTag.commit.sha === commits[0].sha;

  if (!npmInfo || !npmInfo.versions) {
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
    `<http://npmjs.org/package/${packageName}|${currentNpm.version}>, ` +
    `created by ${currentNpm._npmUser.name} ` +
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
        if (!headIsPublishable) {
          status.fields['Don\'t publish HEAD!'] = 
            `The tip of the \`${branch}\` branch of the \`${packageName}\` ` +
            `repository has moved ahead of ${latestGoodTag.name}, so don't ` +
            `run \`npm publish\` willy-nilly; run ` +
            `\`git checkout ${latestGoodTag.name}\` to get your working ` +
            `tree into a known-good state first.`;
        }
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

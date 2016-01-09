'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.formats = exports.colors = undefined;
exports.formatPackageStatus = formatPackageStatus;

var _semver = require('semver');

var _semver2 = _interopRequireDefault(_semver);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _conf = require('./conf');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const colors = exports.colors = {
  success: '#1DED05',
  error: '#D00D00'
};

const standardMessageFormat = {
  icon_url: _conf.botIcon,
  username: _conf.botName
};

const formats = exports.formats = {
  standard: standardMessageFormat,
  success: _extends({}, standardMessageFormat, { icon_url: _conf.successIcon }),
  error: _extends({}, standardMessageFormat, { icon_url: _conf.errorIcon })
};

function formatPackageStatus(d) {
  let packageName = d.packageName;
  let branch = d.branch;
  let npmInfo = d.npmInfo;
  let contents = d.contents;
  let latestGoodTag = d.latestGoodTag;
  let commits = d.commits;
  let ciProvidersConfigured = d.ciProvidersConfigured;

  let status = {
    fields: {}
  };
  let readyForPublish = false;
  let headIsPublishable = false;

  if (!contents.some(_ref => {
    let path = _ref.path;
    return path === 'package.json';
  })) {
    status.good = false;
    status.title = 'Nuts!';
    status.text = `The \`${ packageName }\` repository does not appear to ` + `have a \`package.json\` file, so, not to put too fine a point on it, ` + `but I don't care about it.`;
    return status;
  }

  status.fields['CI Providers Configured'] = ciProvidersConfigured.length > 0 ? ciProvidersConfigured.map(_ref2 => {
    let name = _ref2.name;
    return name;
  }).join(', ') : '_None. I recommend at least one._';

  if (!latestGoodTag) {
    status.title = 'Jinkies!';
    status.good = false;
    status.text = `I couldn't find any tagged versions in the ` + `\`${ packageName }\` repository that had successfully built.`;
    return status;
  }

  status.fields['Latest valid tag in repo'] = latestGoodTag.name;
  // status.fields['Latest tag created'] =
  //   moment()
  headIsPublishable = latestGoodTag && latestGoodTag.commit.sha === commits[0].sha;

  if (!headIsPublishable) {
    status.fields['Don\'t publish HEAD!'] = `The tip of the \`${ branch }\` ` + `branch of the \`${ packageName }\` repository has moved ahead of the ` + `latest known-good tag, so don't run \`npm publish\` willy-nilly; ` + `use \`git checkout\` to get your working tree into a known-good ` + `state first.`;
  }

  if (!npmInfo || !npmInfo.versions) {
    status.fields['Current version on NPM'] = '_Never published!_';
    if (ciProvidersConfigured.length > 0) {
      status.text = `I couldn't find the \`${ packageName }\` package on NPM, ` + `but the ${ latestGoodTag.name } tag in the repository has passed CI, ` + `so we're ready for an initial publish to NPM!`;
      readyForPublish = true;
      status.good = true;
    } else {
      status.text = `I couldn't find the \`${ packageName }\` package on NPM, ` + `and the repo has no CI configured, so I don't know for sure ` + `whether the latest tag, ${ latestGoodTag.name }, is ready. *Publish ` + `to NPM at your own risk.*`;
      status.good = false;
      status.fields['Ready for publish?'] = ':question:';
      return status;
    }
  }

  let npmVersions = Object.keys(npmInfo.versions).sort(_semver2.default.rcompare).map(v => npmInfo.versions[v]);
  let currentNpm = npmVersions[0];

  status.fields['Current version on NPM'] = `<http://npmjs.org/package/${ packageName }|${ currentNpm.version }>`;
  status.fields['Last published to NPM'] = (0, _moment2.default)(npmInfo.time[currentNpm.version]).fromNow();

  switch (_semver2.default.compare(currentNpm.version, latestGoodTag.name)) {
    case 0:
      status.good = true;
      readyForPublish = false;
      // TODO: compare the currentNpm.gitHead and latestGoodTag.commit.sha
      // and say something terrified if they aren't the same
      // also TODO check package.json to make sure it's what it should be
      status.text = `NPM is already up to date with the latest good version ` + `of \`${ packageName }\`, *${ currentNpm.version }*`;
      break;
    case -1:
      status.good = true;
      readyForPublish = true;
      status.text = `The current version of \`${ packageName }\` published to ` + `NPM is *${ currentNpm.version }*, and the repository is ahead by at ` + `least one ${ _semver2.default.diff(currentNpm.version, latestGoodTag.name) } ` + `version: it's at *${ latestGoodTag.name }*. *Ready to publish!*`;
      break;
    case 1:
      status.good = false;
      readyForPublish = false;
      status.text = `*Not good.* The current version of \`${ packageName }\` ` + `published to NPM is *${ currentNpm.version }*, but the repository's ` + `latest good version is *${ latestGoodTag.name }*, which is at least ` + `one ${ _semver2.default.diff(currentNpm.version, latestGoodTag.name) } version ` + `behind. Was a version published before it had built successfully? ` + `Was a version published from a different branch than \`${ branch }\`` + `? *Please investigate.*`;
      break;
    default:
      status.good = false;
      status.text = `The entire world is on fire.`;
      break;
  }

  if (readyForPublish) {
    status.fields['Ready for publish?'] = ':white_check_mark:';
    status.fields['Run command:'] = headIsPublishable ? '`npm publish`' : `\`git checkout ${ latestGoodTag.name }; npm publish\``;
  } else {
    status.fields['Ready for publish?'] = ':x:';
  }

  return status;
}
//# sourceMappingURL=data:application/json;base64,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QUFPLE1BQU0sQ0FBQztDQUNmIiwiZmlsZSI6ImZvcm1hdHRpbmcuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgc2VtdmVyIGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgbW9tZW50IGZyb20gJ21vbWVudCc7XG5pbXBvcnQgeyBib3RJY29uLCBib3ROYW1lLCBzdWNjZXNzSWNvbiwgZXJyb3JJY29uIH0gZnJvbSAnLi9jb25mJztcblxuZXhwb3J0IGNvbnN0IGNvbG9ycyA9IHtcbiAgc3VjY2VzczogJyMxREVEMDUnLFxuICBlcnJvcjogJyNEMDBEMDAnXG59O1xuXG5jb25zdCBzdGFuZGFyZE1lc3NhZ2VGb3JtYXQgPSB7XG4gIGljb25fdXJsOiBib3RJY29uLFxuICB1c2VybmFtZTogYm90TmFtZVxufTtcblxuZXhwb3J0IGNvbnN0IGZvcm1hdHMgPSB7XG4gIHN0YW5kYXJkOiBzdGFuZGFyZE1lc3NhZ2VGb3JtYXQsXG4gIHN1Y2Nlc3M6IHsuLi5zdGFuZGFyZE1lc3NhZ2VGb3JtYXQsIGljb25fdXJsOiBzdWNjZXNzSWNvbiB9LFxuICBlcnJvcjogey4uLnN0YW5kYXJkTWVzc2FnZUZvcm1hdCwgaWNvbl91cmw6IGVycm9ySWNvbiB9XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0UGFja2FnZVN0YXR1cyhkKSB7XG4gIGxldCB7XG4gICAgcGFja2FnZU5hbWUsXG4gICAgYnJhbmNoLFxuICAgIG5wbUluZm8sXG4gICAgY29udGVudHMsXG4gICAgbGF0ZXN0R29vZFRhZyxcbiAgICBjb21taXRzLFxuICAgIGNpUHJvdmlkZXJzQ29uZmlndXJlZFxuICB9ID0gZDtcbiAgbGV0IHN0YXR1cyA9IHtcbiAgICBmaWVsZHM6IHt9XG4gIH07XG4gIGxldCByZWFkeUZvclB1Ymxpc2ggPSBmYWxzZTtcbiAgbGV0IGhlYWRJc1B1Ymxpc2hhYmxlID0gZmFsc2U7XG5cbiAgaWYgKCFjb250ZW50cy5zb21lKCh7IHBhdGggfSkgPT4gcGF0aCA9PT0gJ3BhY2thZ2UuanNvbicpKSB7XG4gICAgc3RhdHVzLmdvb2QgPSBmYWxzZTtcbiAgICBzdGF0dXMudGl0bGUgPSAnTnV0cyEnO1xuICAgIHN0YXR1cy50ZXh0ID0gYFRoZSBcXGAke3BhY2thZ2VOYW1lfVxcYCByZXBvc2l0b3J5IGRvZXMgbm90IGFwcGVhciB0byBgICtcbiAgICAgIGBoYXZlIGEgXFxgcGFja2FnZS5qc29uXFxgIGZpbGUsIHNvLCBub3QgdG8gcHV0IHRvbyBmaW5lIGEgcG9pbnQgb24gaXQsIGAgK1xuICAgICAgYGJ1dCBJIGRvbid0IGNhcmUgYWJvdXQgaXQuYDtcbiAgICByZXR1cm4gc3RhdHVzO1xuICB9XG5cbiAgc3RhdHVzLmZpZWxkc1snQ0kgUHJvdmlkZXJzIENvbmZpZ3VyZWQnXSA9XG4gICAgY2lQcm92aWRlcnNDb25maWd1cmVkLmxlbmd0aCA+IDAgP1xuICAgICAgY2lQcm92aWRlcnNDb25maWd1cmVkLm1hcCgoeyBuYW1lIH0pID0+IG5hbWUpLmpvaW4oJywgJylcbiAgICAgIDpcbiAgICAgICdfTm9uZS4gSSByZWNvbW1lbmQgYXQgbGVhc3Qgb25lLl8nO1xuXG4gIGlmICghbGF0ZXN0R29vZFRhZykge1xuICAgIHN0YXR1cy50aXRsZSA9ICdKaW5raWVzISc7XG4gICAgc3RhdHVzLmdvb2QgPSBmYWxzZTtcbiAgICBzdGF0dXMudGV4dCA9IGBJIGNvdWxkbid0IGZpbmQgYW55IHRhZ2dlZCB2ZXJzaW9ucyBpbiB0aGUgYCArXG4gICAgICBgXFxgJHtwYWNrYWdlTmFtZX1cXGAgcmVwb3NpdG9yeSB0aGF0IGhhZCBzdWNjZXNzZnVsbHkgYnVpbHQuYDtcbiAgICByZXR1cm4gc3RhdHVzO1xuICB9XG5cbiAgc3RhdHVzLmZpZWxkc1snTGF0ZXN0IHZhbGlkIHRhZyBpbiByZXBvJ10gPSBsYXRlc3RHb29kVGFnLm5hbWU7XG4gIC8vIHN0YXR1cy5maWVsZHNbJ0xhdGVzdCB0YWcgY3JlYXRlZCddID1cbiAgLy8gICBtb21lbnQoKVxuICBoZWFkSXNQdWJsaXNoYWJsZSA9IGxhdGVzdEdvb2RUYWcgJiZcbiAgICBsYXRlc3RHb29kVGFnLmNvbW1pdC5zaGEgPT09IGNvbW1pdHNbMF0uc2hhO1xuXG4gIGlmICghaGVhZElzUHVibGlzaGFibGUpIHtcbiAgICBzdGF0dXMuZmllbGRzWydEb25cXCd0IHB1Ymxpc2ggSEVBRCEnXSA9IGBUaGUgdGlwIG9mIHRoZSBcXGAke2JyYW5jaH1cXGAgYCArXG4gICAgICBgYnJhbmNoIG9mIHRoZSBcXGAke3BhY2thZ2VOYW1lfVxcYCByZXBvc2l0b3J5IGhhcyBtb3ZlZCBhaGVhZCBvZiB0aGUgYCArXG4gICAgICBgbGF0ZXN0IGtub3duLWdvb2QgdGFnLCBzbyBkb24ndCBydW4gXFxgbnBtIHB1Ymxpc2hcXGAgd2lsbHktbmlsbHk7IGAgK1xuICAgICAgYHVzZSBcXGBnaXQgY2hlY2tvdXRcXGAgdG8gZ2V0IHlvdXIgd29ya2luZyB0cmVlIGludG8gYSBrbm93bi1nb29kIGAgK1xuICAgICAgYHN0YXRlIGZpcnN0LmA7XG4gIH1cblxuICBpZiAoIW5wbUluZm8gfHwgIW5wbUluZm8udmVyc2lvbnMpIHtcbiAgICBzdGF0dXMuZmllbGRzWydDdXJyZW50IHZlcnNpb24gb24gTlBNJ10gPSAnX05ldmVyIHB1Ymxpc2hlZCFfJztcbiAgICBpZiAoY2lQcm92aWRlcnNDb25maWd1cmVkLmxlbmd0aCA+IDApIHtcbiAgICAgIHN0YXR1cy50ZXh0ID0gYEkgY291bGRuJ3QgZmluZCB0aGUgXFxgJHtwYWNrYWdlTmFtZX1cXGAgcGFja2FnZSBvbiBOUE0sIGAgK1xuICAgICAgICBgYnV0IHRoZSAke2xhdGVzdEdvb2RUYWcubmFtZX0gdGFnIGluIHRoZSByZXBvc2l0b3J5IGhhcyBwYXNzZWQgQ0ksIGAgK1xuICAgICAgICBgc28gd2UncmUgcmVhZHkgZm9yIGFuIGluaXRpYWwgcHVibGlzaCB0byBOUE0hYFxuICAgICAgcmVhZHlGb3JQdWJsaXNoID0gdHJ1ZTtcbiAgICAgIHN0YXR1cy5nb29kID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RhdHVzLnRleHQgPSBgSSBjb3VsZG4ndCBmaW5kIHRoZSBcXGAke3BhY2thZ2VOYW1lfVxcYCBwYWNrYWdlIG9uIE5QTSwgYCArXG4gICAgICAgIGBhbmQgdGhlIHJlcG8gaGFzIG5vIENJIGNvbmZpZ3VyZWQsIHNvIEkgZG9uJ3Qga25vdyBmb3Igc3VyZSBgICtcbiAgICAgICAgYHdoZXRoZXIgdGhlIGxhdGVzdCB0YWcsICR7bGF0ZXN0R29vZFRhZy5uYW1lfSwgaXMgcmVhZHkuICpQdWJsaXNoIGAgK1xuICAgICAgICBgdG8gTlBNIGF0IHlvdXIgb3duIHJpc2suKmA7XG4gICAgICBzdGF0dXMuZ29vZCA9IGZhbHNlO1xuICAgICAgc3RhdHVzLmZpZWxkc1snUmVhZHkgZm9yIHB1Ymxpc2g/J10gPSAnOnF1ZXN0aW9uOic7XG4gICAgICByZXR1cm4gc3RhdHVzO1xuICAgIH1cbiAgfVxuXG4gIGxldCBucG1WZXJzaW9ucyA9IE9iamVjdC5rZXlzKG5wbUluZm8udmVyc2lvbnMpXG4gICAgLnNvcnQoc2VtdmVyLnJjb21wYXJlKVxuICAgIC5tYXAoKHYpID0+IG5wbUluZm8udmVyc2lvbnNbdl0pO1xuICBsZXQgY3VycmVudE5wbSA9IG5wbVZlcnNpb25zWzBdO1xuXG4gIHN0YXR1cy5maWVsZHNbJ0N1cnJlbnQgdmVyc2lvbiBvbiBOUE0nXSA9XG4gICAgYDxodHRwOi8vbnBtanMub3JnL3BhY2thZ2UvJHtwYWNrYWdlTmFtZX18JHtjdXJyZW50TnBtLnZlcnNpb259PmA7XG4gIHN0YXR1cy5maWVsZHNbJ0xhc3QgcHVibGlzaGVkIHRvIE5QTSddID1cbiAgICBtb21lbnQobnBtSW5mby50aW1lW2N1cnJlbnROcG0udmVyc2lvbl0pLmZyb21Ob3coKTtcblxuICBzd2l0Y2goc2VtdmVyLmNvbXBhcmUoY3VycmVudE5wbS52ZXJzaW9uLCBsYXRlc3RHb29kVGFnLm5hbWUpKSB7XG4gICAgY2FzZSAwOlxuICAgICAgc3RhdHVzLmdvb2QgPSB0cnVlO1xuICAgICAgcmVhZHlGb3JQdWJsaXNoID0gZmFsc2U7XG4gICAgICAvLyBUT0RPOiBjb21wYXJlIHRoZSBjdXJyZW50TnBtLmdpdEhlYWQgYW5kIGxhdGVzdEdvb2RUYWcuY29tbWl0LnNoYVxuICAgICAgLy8gYW5kIHNheSBzb21ldGhpbmcgdGVycmlmaWVkIGlmIHRoZXkgYXJlbid0IHRoZSBzYW1lXG4gICAgICAvLyBhbHNvIFRPRE8gY2hlY2sgcGFja2FnZS5qc29uIHRvIG1ha2Ugc3VyZSBpdCdzIHdoYXQgaXQgc2hvdWxkIGJlXG4gICAgICBzdGF0dXMudGV4dCA9IGBOUE0gaXMgYWxyZWFkeSB1cCB0byBkYXRlIHdpdGggdGhlIGxhdGVzdCBnb29kIHZlcnNpb24gYCArXG4gICAgICAgIGBvZiBcXGAke3BhY2thZ2VOYW1lfVxcYCwgKiR7Y3VycmVudE5wbS52ZXJzaW9ufSpgXG4gICAgICBicmVhaztcbiAgICBjYXNlIC0xOlxuICAgICAgc3RhdHVzLmdvb2QgPSB0cnVlO1xuICAgICAgcmVhZHlGb3JQdWJsaXNoID0gdHJ1ZTtcbiAgICAgIHN0YXR1cy50ZXh0ID0gYFRoZSBjdXJyZW50IHZlcnNpb24gb2YgXFxgJHtwYWNrYWdlTmFtZX1cXGAgcHVibGlzaGVkIHRvIGAgK1xuICAgICAgICBgTlBNIGlzICoke2N1cnJlbnROcG0udmVyc2lvbn0qLCBhbmQgdGhlIHJlcG9zaXRvcnkgaXMgYWhlYWQgYnkgYXQgYCArXG4gICAgICAgIGBsZWFzdCBvbmUgJHtzZW12ZXIuZGlmZihjdXJyZW50TnBtLnZlcnNpb24sIGxhdGVzdEdvb2RUYWcubmFtZSl9IGAgK1xuICAgICAgICBgdmVyc2lvbjogaXQncyBhdCAqJHtsYXRlc3RHb29kVGFnLm5hbWV9Ki4gKlJlYWR5IHRvIHB1Ymxpc2ghKmA7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDE6XG4gICAgICBzdGF0dXMuZ29vZCA9IGZhbHNlO1xuICAgICAgcmVhZHlGb3JQdWJsaXNoID0gZmFsc2U7XG4gICAgICBzdGF0dXMudGV4dCA9IGAqTm90IGdvb2QuKiBUaGUgY3VycmVudCB2ZXJzaW9uIG9mIFxcYCR7cGFja2FnZU5hbWV9XFxgIGAgK1xuICAgICAgICBgcHVibGlzaGVkIHRvIE5QTSBpcyAqJHtjdXJyZW50TnBtLnZlcnNpb259KiwgYnV0IHRoZSByZXBvc2l0b3J5J3MgYCArXG4gICAgICAgIGBsYXRlc3QgZ29vZCB2ZXJzaW9uIGlzICoke2xhdGVzdEdvb2RUYWcubmFtZX0qLCB3aGljaCBpcyBhdCBsZWFzdCBgICtcbiAgICAgICAgYG9uZSAke3NlbXZlci5kaWZmKGN1cnJlbnROcG0udmVyc2lvbiwgbGF0ZXN0R29vZFRhZy5uYW1lKX0gdmVyc2lvbiBgICtcbiAgICAgICAgYGJlaGluZC4gV2FzIGEgdmVyc2lvbiBwdWJsaXNoZWQgYmVmb3JlIGl0IGhhZCBidWlsdCBzdWNjZXNzZnVsbHk/IGAgK1xuICAgICAgICBgV2FzIGEgdmVyc2lvbiBwdWJsaXNoZWQgZnJvbSBhIGRpZmZlcmVudCBicmFuY2ggdGhhbiBcXGAke2JyYW5jaH1cXGBgICtcbiAgICAgICAgYD8gKlBsZWFzZSBpbnZlc3RpZ2F0ZS4qYFxuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHN0YXR1cy5nb29kID0gZmFsc2U7XG4gICAgICBzdGF0dXMudGV4dCA9IGBUaGUgZW50aXJlIHdvcmxkIGlzIG9uIGZpcmUuYDtcbiAgICAgIGJyZWFrO1xuICB9XG5cbiAgaWYgKHJlYWR5Rm9yUHVibGlzaCkge1xuICAgIHN0YXR1cy5maWVsZHNbJ1JlYWR5IGZvciBwdWJsaXNoPyddID0gJzp3aGl0ZV9jaGVja19tYXJrOic7XG4gICAgc3RhdHVzLmZpZWxkc1snUnVuIGNvbW1hbmQ6J10gPSBoZWFkSXNQdWJsaXNoYWJsZSA/XG4gICAgICAnYG5wbSBwdWJsaXNoYCcgOlxuICAgICAgYFxcYGdpdCBjaGVja291dCAke2xhdGVzdEdvb2RUYWcubmFtZX07IG5wbSBwdWJsaXNoXFxgYDtcbiAgfSBlbHNlIHtcbiAgICBzdGF0dXMuZmllbGRzWydSZWFkeSBmb3IgcHVibGlzaD8nXSA9ICc6eDonXG4gIH1cblxuICByZXR1cm4gc3RhdHVzO1xufVxuIl19
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

  // get full commit object
  latestGoodTag.commit = commits.find(_ref3 => {
    let sha = _ref3.sha;
    return sha === latestGoodTag.commit.sha;
  });

  let latestAuthor = latestGoodTag.commit.author;

  status.fields['Latest valid tag in repo'] = `<${ latestGoodTag.commit.html_url }|${ latestGoodTag.name }>, created by ` + `<${ latestAuthor.html_url }|${ latestAuthor.login }> ` + (0, _moment2.default)(latestGoodTag.commit.commit.author.date).fromNow();

  headIsPublishable = latestGoodTag && latestGoodTag.commit.sha === commits[0].sha;

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

  status.fields['Current version on NPM'] = `<http://npmjs.org/package/${ packageName }|${ currentNpm.version }>, ` + `created by ${ currentNpm._npmUser.name } ` + (0, _moment2.default)(npmInfo.time[currentNpm.version]).fromNow();

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
      if (!headIsPublishable) {
        status.fields['Don\'t publish HEAD!'] = `The tip of the \`${ branch }\` branch of the \`${ packageName }\` ` + `repository has moved ahead of ${ latestGoodTag.name }, so don't ` + `run \`npm publish\` willy-nilly; run ` + `\`git checkout ${ latestGoodTag.name }\` to get your working ` + `tree into a known-good state first.`;
      }
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
//# sourceMappingURL=data:application/json;base64,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QUFDLEdBQ3JFLENBQUMsa0VBQWtFLENBQUMsR0FDcEUsQ0FBQyx1REFBdUQsR0FBRSxNQUFNLEVBQUMsRUFBRSxDQUFDLEdBQ3BFLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtBQUMzQixZQUFNO0FBQUEsQUFDUjtBQUNFLFlBQU0sQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO0FBQ3BCLFlBQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0FBQzdDLFlBQU07QUFBQSxHQUNUOztBQUVELE1BQUksZUFBZSxFQUFFO0FBQ25CLFVBQU0sQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsR0FBRyxvQkFBb0IsQ0FBQztBQUMzRCxVQUFNLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxHQUFHLGlCQUFpQixHQUMvQyxlQUFlLEdBQ2YsQ0FBQyxlQUFlLEdBQUUsYUFBYSxDQUFDLElBQUksRUFBQyxlQUFlLENBQUMsQ0FBQztHQUN6RCxNQUFNO0FBQ0wsVUFBTSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLEtBQUssQ0FBQTtHQUM1Qzs7QUFFRCxTQUFPLE1BQU0sQ0FBQztDQUNmIiwiZmlsZSI6ImZvcm1hdHRpbmcuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgc2VtdmVyIGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgbW9tZW50IGZyb20gJ21vbWVudCc7XG5pbXBvcnQgeyBib3RJY29uLCBib3ROYW1lLCBzdWNjZXNzSWNvbiwgZXJyb3JJY29uIH0gZnJvbSAnLi9jb25mJztcblxuZXhwb3J0IGNvbnN0IGNvbG9ycyA9IHtcbiAgc3VjY2VzczogJyMxREVEMDUnLFxuICBlcnJvcjogJyNEMDBEMDAnXG59O1xuXG5jb25zdCBzdGFuZGFyZE1lc3NhZ2VGb3JtYXQgPSB7XG4gIGljb25fdXJsOiBib3RJY29uLFxuICB1c2VybmFtZTogYm90TmFtZVxufTtcblxuZXhwb3J0IGNvbnN0IGZvcm1hdHMgPSB7XG4gIHN0YW5kYXJkOiBzdGFuZGFyZE1lc3NhZ2VGb3JtYXQsXG4gIHN1Y2Nlc3M6IHsuLi5zdGFuZGFyZE1lc3NhZ2VGb3JtYXQsIGljb25fdXJsOiBzdWNjZXNzSWNvbiB9LFxuICBlcnJvcjogey4uLnN0YW5kYXJkTWVzc2FnZUZvcm1hdCwgaWNvbl91cmw6IGVycm9ySWNvbiB9XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0UGFja2FnZVN0YXR1cyhkKSB7XG4gIGxldCB7XG4gICAgcGFja2FnZU5hbWUsXG4gICAgYnJhbmNoLFxuICAgIG5wbUluZm8sXG4gICAgY29udGVudHMsXG4gICAgbGF0ZXN0R29vZFRhZyxcbiAgICBjb21taXRzLFxuICAgIGNpUHJvdmlkZXJzQ29uZmlndXJlZFxuICB9ID0gZDtcbiAgbGV0IHN0YXR1cyA9IHtcbiAgICBmaWVsZHM6IHt9XG4gIH07XG4gIGxldCByZWFkeUZvclB1Ymxpc2ggPSBmYWxzZTtcbiAgbGV0IGhlYWRJc1B1Ymxpc2hhYmxlID0gZmFsc2U7XG5cbiAgaWYgKCFjb250ZW50cy5zb21lKCh7IHBhdGggfSkgPT4gcGF0aCA9PT0gJ3BhY2thZ2UuanNvbicpKSB7XG4gICAgc3RhdHVzLmdvb2QgPSBmYWxzZTtcbiAgICBzdGF0dXMudGl0bGUgPSAnTnV0cyEnO1xuICAgIHN0YXR1cy50ZXh0ID0gYFRoZSBcXGAke3BhY2thZ2VOYW1lfVxcYCByZXBvc2l0b3J5IGRvZXMgbm90IGFwcGVhciB0byBgICtcbiAgICAgIGBoYXZlIGEgXFxgcGFja2FnZS5qc29uXFxgIGZpbGUsIHNvLCBub3QgdG8gcHV0IHRvbyBmaW5lIGEgcG9pbnQgb24gaXQsIGAgK1xuICAgICAgYGJ1dCBJIGRvbid0IGNhcmUgYWJvdXQgaXQuYDtcbiAgICByZXR1cm4gc3RhdHVzO1xuICB9XG5cbiAgc3RhdHVzLmZpZWxkc1snQ0kgUHJvdmlkZXJzIENvbmZpZ3VyZWQnXSA9XG4gICAgY2lQcm92aWRlcnNDb25maWd1cmVkLmxlbmd0aCA+IDAgP1xuICAgICAgY2lQcm92aWRlcnNDb25maWd1cmVkLm1hcCgoeyBuYW1lIH0pID0+IG5hbWUpLmpvaW4oJywgJylcbiAgICAgIDpcbiAgICAgICdfTm9uZS4gSSByZWNvbW1lbmQgYXQgbGVhc3Qgb25lLl8nO1xuXG4gIGlmICghbGF0ZXN0R29vZFRhZykge1xuICAgIHN0YXR1cy50aXRsZSA9ICdKaW5raWVzISc7XG4gICAgc3RhdHVzLmdvb2QgPSBmYWxzZTtcbiAgICBzdGF0dXMudGV4dCA9IGBJIGNvdWxkbid0IGZpbmQgYW55IHRhZ2dlZCB2ZXJzaW9ucyBpbiB0aGUgYCArXG4gICAgICBgXFxgJHtwYWNrYWdlTmFtZX1cXGAgcmVwb3NpdG9yeSB0aGF0IGhhZCBzdWNjZXNzZnVsbHkgYnVpbHQuYDtcbiAgICByZXR1cm4gc3RhdHVzO1xuICB9XG5cbiAgLy8gZ2V0IGZ1bGwgY29tbWl0IG9iamVjdFxuICBsYXRlc3RHb29kVGFnLmNvbW1pdCA9IGNvbW1pdHMuZmluZChcbiAgICAoeyBzaGEgfSkgPT4gc2hhID09PSBsYXRlc3RHb29kVGFnLmNvbW1pdC5zaGFcbiAgKTtcblxuICBsZXQgbGF0ZXN0QXV0aG9yID0gbGF0ZXN0R29vZFRhZy5jb21taXQuYXV0aG9yO1xuXG4gIHN0YXR1cy5maWVsZHNbJ0xhdGVzdCB2YWxpZCB0YWcgaW4gcmVwbyddID0gXG4gICAgYDwke2xhdGVzdEdvb2RUYWcuY29tbWl0Lmh0bWxfdXJsfXwke2xhdGVzdEdvb2RUYWcubmFtZX0+LCBjcmVhdGVkIGJ5IGAgK1xuICAgIGA8JHtsYXRlc3RBdXRob3IuaHRtbF91cmx9fCR7bGF0ZXN0QXV0aG9yLmxvZ2lufT4gYCArXG4gICAgbW9tZW50KGxhdGVzdEdvb2RUYWcuY29tbWl0LmNvbW1pdC5hdXRob3IuZGF0ZSkuZnJvbU5vdygpO1xuXG4gIGhlYWRJc1B1Ymxpc2hhYmxlID0gbGF0ZXN0R29vZFRhZyAmJlxuICAgIGxhdGVzdEdvb2RUYWcuY29tbWl0LnNoYSA9PT0gY29tbWl0c1swXS5zaGE7XG5cbiAgaWYgKCFucG1JbmZvIHx8ICFucG1JbmZvLnZlcnNpb25zKSB7XG4gICAgc3RhdHVzLmZpZWxkc1snQ3VycmVudCB2ZXJzaW9uIG9uIE5QTSddID0gJ19OZXZlciBwdWJsaXNoZWQhXyc7XG4gICAgaWYgKGNpUHJvdmlkZXJzQ29uZmlndXJlZC5sZW5ndGggPiAwKSB7XG4gICAgICBzdGF0dXMudGV4dCA9IGBJIGNvdWxkbid0IGZpbmQgdGhlIFxcYCR7cGFja2FnZU5hbWV9XFxgIHBhY2thZ2Ugb24gTlBNLCBgICtcbiAgICAgICAgYGJ1dCB0aGUgJHtsYXRlc3RHb29kVGFnLm5hbWV9IHRhZyBpbiB0aGUgcmVwb3NpdG9yeSBoYXMgcGFzc2VkIENJLCBgICtcbiAgICAgICAgYHNvIHdlJ3JlIHJlYWR5IGZvciBhbiBpbml0aWFsIHB1Ymxpc2ggdG8gTlBNIWBcbiAgICAgIHJlYWR5Rm9yUHVibGlzaCA9IHRydWU7XG4gICAgICBzdGF0dXMuZ29vZCA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXR1cy50ZXh0ID0gYEkgY291bGRuJ3QgZmluZCB0aGUgXFxgJHtwYWNrYWdlTmFtZX1cXGAgcGFja2FnZSBvbiBOUE0sIGAgK1xuICAgICAgICBgYW5kIHRoZSByZXBvIGhhcyBubyBDSSBjb25maWd1cmVkLCBzbyBJIGRvbid0IGtub3cgZm9yIHN1cmUgYCArXG4gICAgICAgIGB3aGV0aGVyIHRoZSBsYXRlc3QgdGFnLCAke2xhdGVzdEdvb2RUYWcubmFtZX0sIGlzIHJlYWR5LiAqUHVibGlzaCBgICtcbiAgICAgICAgYHRvIE5QTSBhdCB5b3VyIG93biByaXNrLipgO1xuICAgICAgc3RhdHVzLmdvb2QgPSBmYWxzZTtcbiAgICAgIHN0YXR1cy5maWVsZHNbJ1JlYWR5IGZvciBwdWJsaXNoPyddID0gJzpxdWVzdGlvbjonO1xuICAgICAgcmV0dXJuIHN0YXR1cztcbiAgICB9XG4gIH1cblxuICBsZXQgbnBtVmVyc2lvbnMgPSBPYmplY3Qua2V5cyhucG1JbmZvLnZlcnNpb25zKVxuICAgIC5zb3J0KHNlbXZlci5yY29tcGFyZSlcbiAgICAubWFwKCh2KSA9PiBucG1JbmZvLnZlcnNpb25zW3ZdKTtcbiAgbGV0IGN1cnJlbnROcG0gPSBucG1WZXJzaW9uc1swXTtcblxuICBzdGF0dXMuZmllbGRzWydDdXJyZW50IHZlcnNpb24gb24gTlBNJ10gPVxuICAgIGA8aHR0cDovL25wbWpzLm9yZy9wYWNrYWdlLyR7cGFja2FnZU5hbWV9fCR7Y3VycmVudE5wbS52ZXJzaW9ufT4sIGAgK1xuICAgIGBjcmVhdGVkIGJ5ICR7Y3VycmVudE5wbS5fbnBtVXNlci5uYW1lfSBgICtcbiAgICBtb21lbnQobnBtSW5mby50aW1lW2N1cnJlbnROcG0udmVyc2lvbl0pLmZyb21Ob3coKTtcblxuICBzd2l0Y2goc2VtdmVyLmNvbXBhcmUoY3VycmVudE5wbS52ZXJzaW9uLCBsYXRlc3RHb29kVGFnLm5hbWUpKSB7XG4gICAgY2FzZSAwOlxuICAgICAgc3RhdHVzLmdvb2QgPSB0cnVlO1xuICAgICAgcmVhZHlGb3JQdWJsaXNoID0gZmFsc2U7XG4gICAgICAvLyBUT0RPOiBjb21wYXJlIHRoZSBjdXJyZW50TnBtLmdpdEhlYWQgYW5kIGxhdGVzdEdvb2RUYWcuY29tbWl0LnNoYVxuICAgICAgLy8gYW5kIHNheSBzb21ldGhpbmcgdGVycmlmaWVkIGlmIHRoZXkgYXJlbid0IHRoZSBzYW1lXG4gICAgICAvLyBhbHNvIFRPRE8gY2hlY2sgcGFja2FnZS5qc29uIHRvIG1ha2Ugc3VyZSBpdCdzIHdoYXQgaXQgc2hvdWxkIGJlXG4gICAgICBzdGF0dXMudGV4dCA9IGBOUE0gaXMgYWxyZWFkeSB1cCB0byBkYXRlIHdpdGggdGhlIGxhdGVzdCBnb29kIHZlcnNpb24gYCArXG4gICAgICAgIGBvZiBcXGAke3BhY2thZ2VOYW1lfVxcYCwgKiR7Y3VycmVudE5wbS52ZXJzaW9ufSpgXG4gICAgICBicmVhaztcbiAgICBjYXNlIC0xOlxuICAgICAgc3RhdHVzLmdvb2QgPSB0cnVlO1xuICAgICAgcmVhZHlGb3JQdWJsaXNoID0gdHJ1ZTtcbiAgICAgIHN0YXR1cy50ZXh0ID0gYFRoZSBjdXJyZW50IHZlcnNpb24gb2YgXFxgJHtwYWNrYWdlTmFtZX1cXGAgcHVibGlzaGVkIHRvIGAgK1xuICAgICAgICBgTlBNIGlzICoke2N1cnJlbnROcG0udmVyc2lvbn0qLCBhbmQgdGhlIHJlcG9zaXRvcnkgaXMgYWhlYWQgYnkgYXQgYCArXG4gICAgICAgIGBsZWFzdCBvbmUgJHtzZW12ZXIuZGlmZihjdXJyZW50TnBtLnZlcnNpb24sIGxhdGVzdEdvb2RUYWcubmFtZSl9IGAgK1xuICAgICAgICBgdmVyc2lvbjogaXQncyBhdCAqJHtsYXRlc3RHb29kVGFnLm5hbWV9Ki4gKlJlYWR5IHRvIHB1Ymxpc2ghKmA7XG4gICAgICAgIGlmICghaGVhZElzUHVibGlzaGFibGUpIHtcbiAgICAgICAgICBzdGF0dXMuZmllbGRzWydEb25cXCd0IHB1Ymxpc2ggSEVBRCEnXSA9IFxuICAgICAgICAgICAgYFRoZSB0aXAgb2YgdGhlIFxcYCR7YnJhbmNofVxcYCBicmFuY2ggb2YgdGhlIFxcYCR7cGFja2FnZU5hbWV9XFxgIGAgK1xuICAgICAgICAgICAgYHJlcG9zaXRvcnkgaGFzIG1vdmVkIGFoZWFkIG9mICR7bGF0ZXN0R29vZFRhZy5uYW1lfSwgc28gZG9uJ3QgYCArXG4gICAgICAgICAgICBgcnVuIFxcYG5wbSBwdWJsaXNoXFxgIHdpbGx5LW5pbGx5OyBydW4gYCArXG4gICAgICAgICAgICBgXFxgZ2l0IGNoZWNrb3V0ICR7bGF0ZXN0R29vZFRhZy5uYW1lfVxcYCB0byBnZXQgeW91ciB3b3JraW5nIGAgK1xuICAgICAgICAgICAgYHRyZWUgaW50byBhIGtub3duLWdvb2Qgc3RhdGUgZmlyc3QuYDtcbiAgICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAxOlxuICAgICAgc3RhdHVzLmdvb2QgPSBmYWxzZTtcbiAgICAgIHJlYWR5Rm9yUHVibGlzaCA9IGZhbHNlO1xuICAgICAgc3RhdHVzLnRleHQgPSBgKk5vdCBnb29kLiogVGhlIGN1cnJlbnQgdmVyc2lvbiBvZiBcXGAke3BhY2thZ2VOYW1lfVxcYCBgICtcbiAgICAgICAgYHB1Ymxpc2hlZCB0byBOUE0gaXMgKiR7Y3VycmVudE5wbS52ZXJzaW9ufSosIGJ1dCB0aGUgcmVwb3NpdG9yeSdzIGAgK1xuICAgICAgICBgbGF0ZXN0IGdvb2QgdmVyc2lvbiBpcyAqJHtsYXRlc3RHb29kVGFnLm5hbWV9Kiwgd2hpY2ggaXMgYXQgbGVhc3QgYCArXG4gICAgICAgIGBvbmUgJHtzZW12ZXIuZGlmZihjdXJyZW50TnBtLnZlcnNpb24sIGxhdGVzdEdvb2RUYWcubmFtZSl9IHZlcnNpb24gYCArXG4gICAgICAgIGBiZWhpbmQuIFdhcyBhIHZlcnNpb24gcHVibGlzaGVkIGJlZm9yZSBpdCBoYWQgYnVpbHQgc3VjY2Vzc2Z1bGx5PyBgICtcbiAgICAgICAgYFdhcyBhIHZlcnNpb24gcHVibGlzaGVkIGZyb20gYSBkaWZmZXJlbnQgYnJhbmNoIHRoYW4gXFxgJHticmFuY2h9XFxgYCArXG4gICAgICAgIGA/ICpQbGVhc2UgaW52ZXN0aWdhdGUuKmBcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBzdGF0dXMuZ29vZCA9IGZhbHNlO1xuICAgICAgc3RhdHVzLnRleHQgPSBgVGhlIGVudGlyZSB3b3JsZCBpcyBvbiBmaXJlLmA7XG4gICAgICBicmVhaztcbiAgfVxuXG4gIGlmIChyZWFkeUZvclB1Ymxpc2gpIHtcbiAgICBzdGF0dXMuZmllbGRzWydSZWFkeSBmb3IgcHVibGlzaD8nXSA9ICc6d2hpdGVfY2hlY2tfbWFyazonO1xuICAgIHN0YXR1cy5maWVsZHNbJ1J1biBjb21tYW5kOiddID0gaGVhZElzUHVibGlzaGFibGUgP1xuICAgICAgJ2BucG0gcHVibGlzaGAnIDpcbiAgICAgIGBcXGBnaXQgY2hlY2tvdXQgJHtsYXRlc3RHb29kVGFnLm5hbWV9OyBucG0gcHVibGlzaFxcYGA7XG4gIH0gZWxzZSB7XG4gICAgc3RhdHVzLmZpZWxkc1snUmVhZHkgZm9yIHB1Ymxpc2g/J10gPSAnOng6J1xuICB9XG5cbiAgcmV0dXJuIHN0YXR1cztcbn1cbiJdfQ==
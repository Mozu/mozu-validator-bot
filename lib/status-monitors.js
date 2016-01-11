'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.filterForBuildSuccess = filterForBuildSuccess;
exports.getPackageStatus = getPackageStatus;

var _semver = require('semver');

var _semver2 = _interopRequireDefault(_semver);

var _rx = require('rx');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function filterForBuildSuccess(_ref) {
  let events$ = _ref.events$;
  let logger = _ref.logger;
  let githubClient = _ref.githubClient;
  let github = _ref.github;

  return events$.filter(
  /**
   * first, filter for status events, in case the webhook is subscribed to
   * more than just status events. at the same time, we can filter for
   * success events.
   *
   */
  _ref2 => {
    let event = _ref2.event;
    let data = _ref2.data;
    return event === 'status' && data.state === 'success';
  }).do(
  /**
   * tap for logging. the `do` operator is a 'tap' operator that does not
   * modify the stream.
   *
   */
  _ref3 => {
    let data = _ref3.data;
    return logger.info('Received success notification', data);
  })
  // the `concatMap` operator flattens a sequence of sequences.
  .concatMap(
  /**
   * join the original data from the status event together with a combined
   * status from github, and an array of the files at repository root
   * (so we can check to be sure the repository has a package.json, so we
   * actually care about it. this step just adds data to what's flowing down
   * the pipe.
   *
   */
  _ref4 => {
    let data = _ref4.data;
    return _rx.Observable.forkJoin(
    // O.just turns a realized value back into an observable again, so we
    // can continue to pass it using Rx combinators.
    _rx.Observable.just(data),
    // GitHub "combined status" endpoint includes a combined state reflecting
    // the state of the last unique set of statuses. for now, it seems to do
    // M
    // exactly what we want.
    githubClient('get', `/repos/${ github.org }/${ data.repository.name }/commits/${ data.sha }/` + `status`),
    // 'contents' endpoint returns array of files in the commit snapshot
    githubClient.forRepo(data.repository.name)('contents', '/', data.sha),
    // O.forkJoin takes a selector function, so we can turn positional args
    // into named properties.
    (_ref5, combinedStatus, contents) => {
      let repository = _ref5.repository;
      let sha = _ref5.sha;
      return { repository, sha, combinedStatus, contents };
    });
  }).filter(
  /**
   * we only care about repositories with package.json currently, though this
   * may change in the future.
   *
   */
  _ref6 => {
    let contents = _ref6.contents;
    return contents.some(_ref7 => {
      let path = _ref7.path;
      return path === 'package.json';
    });
  }).filter(
  /**
   * more importantly, we only want to notify
   * about packages whose latest success event results in a combinedStatus
   * of "success", meaning it's the last build service to succeed and the
   * tag is ready now.
   *
   */
  _ref8 => {
    let combinedStatus = _ref8.combinedStatus;
    return combinedStatus.state === 'success';
  }).concatMap(
  /**
   * now, we only want to notify for successful builds that are *tagged*.
   * it is those builds that are release candidates. because of the nature
   * of git pointers, the commit itself doesn't know if it's a tag, so we
   * have to query the tags endpoint to find out if there is one for this
   * commit.
   * NB: we do not currently use github releases and maybe we should
   *
   */
  _ref9 => {
    let repository = _ref9.repository;
    let sha = _ref9.sha;
    return _rx.Observable.forkJoin(_rx.Observable.just({ repository, sha }), githubClient.forRepo(repository.name)('tags'), (_ref10, tags) => {
      let repository = _ref10.repository;
      let sha = _ref10.sha;
      return {
        repository,
        sha,
        // if there's a tag whose commit matches the sha of the current build,
        // add it to the data being piped through
        tag: tags.find(_ref11 => {
          let commit = _ref11.commit;
          return commit && commit.sha === sha;
        })
      };
    });
  }).filter(
  /**
   *
   * now, filter on the presence of such a tag.
   * also, we only want tags that are actually semantic versions. other
   * tags may be experiments, and certainly we can't use them to figure out
   * whether the version has incremented.
   *
   */
  _ref12 => {
    let tag = _ref12.tag;
    return tag && _semver2.default.clean(tag.name);
  });
}

function getPackageStatus(_ref13) {
  let packageName = _ref13.packageName;
  let branch = _ref13.branch;
  let githubClient = _ref13.githubClient;
  let github = _ref13.github;
  let npmClient = _ref13.npmClient;
  let ciProviders = _ref13.ciProviders;

  let getRepoData = githubClient.forRepo(packageName);
  /**
   * first, find out if the repo exists and has any tags at all, before running
   * any more calls to the API. since this request came externally, we don't
   * know it's for a real package.
   *
   **/
  return getRepoData('tags').concatMap(
  /**
   * now that we know tags exist, we can run the other calls. join the tags
   * list with package contents, so we can check for package.json,
   * and npm status, so we can compare with the package's status there.
   * this includes commits too, though they aren't used here, because
   * the formatters expect a list of commits as well.
   *
   **/
  tags => _rx.Observable.forkJoin(_rx.Observable.just(tags), getRepoData('contents', '/', branch), getRepoData('commits', branch), npmClient.getStatus(packageName),
  // once again, turn positional arguments into named arguments
  (tags, contents, commits, npmInfo) => ({ tags, contents, commits, npmInfo }))).concatMap(
  // join data to output of other observables
  data => _rx.Observable.forkJoin(
  // create observable from realized value so it can be passed
  _rx.Observable.just(data),
  /**
   * The below `O.for` turns the 'tags' array into an observable sequence
   * of requests for the combined status on each tag, then flattens the
   * results, yielding an observable sequence of combined statuses for each
   * tag.
   *
   **/
  _rx.Observable.for(data.tags,
  // again, pass the tag along, we don't want to turn it into status but
  // add a status to our combined payload
  t => _rx.Observable.forkJoin(_rx.Observable.just(t), githubClient('get', `/repos/${ github.org }/${ packageName }/commits/${ t.name }/status`), (tag, status) => ({ tag, status }))).find(
  /**
   * and the above `find` operator will traverse an observable sequence
   * until it finds an emitted value that satisfies a condition. in this
   * case the condition is that the tag/status tuple must have a status
   * with a `state` of "success".
   *
   **/
  _ref14 => {
    let status = _ref14.status;
    return status.state === 'success';
  }),
  // if a tag exists, we'll add it as `latestGoodTag` to the combined
  // payload. if it doesn't exist, this will all fall through to the error
  // operator.
  (data, _ref15) => {
    let tag = _ref15.tag;
    return _extends({ latestGoodTag: tag }, data);
  })).map(
  /**
   * add a list of CI providers based on the `contents` array, for display.
   * determine whether CI is configured by the presence of its configuration
   * file in the repo root.
   **/
  data => _extends({
    ciProvidersConfigured: ciProviders.filter(_ref16 => {
      let configFile = _ref16.configFile;
      return data.contents.some(_ref17 => {
        let path = _ref17.path;
        return path === configFile;
      });
    })
  }, data));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9zdGF0dXMtbW9uaXRvcnMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7OztRQUdnQixxQkFBcUIsR0FBckIscUJBQXFCO1FBZ0hyQixnQkFBZ0IsR0FBaEIsZ0JBQWdCOzs7Ozs7Ozs7O0FBaEh6QixTQUFTLHFCQUFxQixPQUtsQztNQUpELE9BQU8sUUFBUCxPQUFPO01BQ1AsTUFBTSxRQUFOLE1BQU07TUFDTixZQUFZLFFBQVosWUFBWTtNQUNaLE1BQU0sUUFBTixNQUFNOztBQUVOLFNBQU8sT0FBTyxDQUFDLE1BQU07Ozs7Ozs7QUFPbkI7UUFBRyxLQUFLLFNBQUwsS0FBSztRQUFFLElBQUksU0FBSixJQUFJO1dBQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVM7R0FBQSxDQUNwRSxDQUNBLEVBQUU7Ozs7OztBQU1EO1FBQUcsSUFBSSxTQUFKLElBQUk7V0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLCtCQUErQixFQUFFLElBQUksQ0FBQztHQUFBOztBQUNqRSxHQUVBLFNBQVM7Ozs7Ozs7OztBQVNSO1FBQUcsSUFBSSxTQUFKLElBQUk7V0FBTyxJQW5DVCxVQUFVLENBbUNDLFFBQVE7OztBQUd0QixRQXRDRyxVQUFVLENBc0NYLElBQUksQ0FBQyxJQUFJLENBQUM7Ozs7O0FBS1osZ0JBQVksQ0FDVixLQUFLLEVBQ0wsQ0FBQyxPQUFPLEdBQUUsTUFBTSxDQUFDLEdBQUcsRUFBQyxDQUFDLEdBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUMsU0FBUyxHQUFFLElBQUksQ0FBQyxHQUFHLEVBQUMsQ0FBQyxDQUFDLEdBQ25FLENBQUMsTUFBTSxDQUFDLENBQ1Q7O0FBRUQsZ0JBQVksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FDeEMsVUFBVSxFQUNWLEdBQUcsRUFDSCxJQUFJLENBQUMsR0FBRyxDQUNUOzs7QUFHRCxZQUFzQixjQUFjLEVBQUUs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Q0FBQyxDQUMvRCxFQUNELENBQUMsR0FBRyxFQUFFLE1BQU0sTUFBTSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUNuQyxDQUNGLENBQUMsSUFBSTs7Ozs7Ozs7QUFRSjtRQUFHLE1BQU0sVUFBTixNQUFNO1dBQU8sTUFBTSxDQUFDLEtBQUssS0FBSyxTQUFTO0dBQUEsQ0FDM0M7Ozs7QUFJRCxHQUFDLElBQUk7UUFBSSxHQUFHLFVBQUgsR0FBRztzQkFBVSxhQUFhLEVBQUUsR0FBRyxJQUFLLElBQUk7R0FBRyxDQUNyRCxDQUNGLENBQUMsR0FBRzs7Ozs7O0FBTUgsQUFBQyxNQUFJO0FBQ0gseUJBQXFCLEVBQUUsV0FBVyxDQUFDLE1BQU0sQ0FDdkM7VUFBRyxVQUFVLFVBQVYsVUFBVTthQUNYLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO1lBQUcsSUFBSSxVQUFKLElBQUk7ZUFBTyxJQUFJLEtBQUssVUFBVTtPQUFBLENBQUM7S0FBQSxDQUN4RDtLQUNFLElBQUksQ0FDUCxDQUNILENBQUM7Q0FDSCIsImZpbGUiOiJzdGF0dXMtbW9uaXRvcnMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgc2VtdmVyIGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgeyBPYnNlcnZhYmxlIGFzIE8gfSBmcm9tICdyeCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJGb3JCdWlsZFN1Y2Nlc3Moe1xuICBldmVudHMkLFxuICBsb2dnZXIsXG4gIGdpdGh1YkNsaWVudCxcbiAgZ2l0aHViXG59KSB7XG4gIHJldHVybiBldmVudHMkLmZpbHRlcihcbiAgICAvKipcbiAgICAgKiBmaXJzdCwgZmlsdGVyIGZvciBzdGF0dXMgZXZlbnRzLCBpbiBjYXNlIHRoZSB3ZWJob29rIGlzIHN1YnNjcmliZWQgdG9cbiAgICAgKiBtb3JlIHRoYW4ganVzdCBzdGF0dXMgZXZlbnRzLiBhdCB0aGUgc2FtZSB0aW1lLCB3ZSBjYW4gZmlsdGVyIGZvclxuICAgICAqIHN1Y2Nlc3MgZXZlbnRzLlxuICAgICAqXG4gICAgICovXG4gICAgKHsgZXZlbnQsIGRhdGEgfSkgPT4gZXZlbnQgPT09ICdzdGF0dXMnICYmIGRhdGEuc3RhdGUgPT09ICdzdWNjZXNzJ1xuICApXG4gIC5kbyhcbiAgICAvKipcbiAgICAgKiB0YXAgZm9yIGxvZ2dpbmcuIHRoZSBgZG9gIG9wZXJhdG9yIGlzIGEgJ3RhcCcgb3BlcmF0b3IgdGhhdCBkb2VzIG5vdFxuICAgICAqIG1vZGlmeSB0aGUgc3RyZWFtLlxuICAgICAqXG4gICAgICovXG4gICAgKHsgZGF0YSB9KSA9PiBsb2dnZXIuaW5mbygnUmVjZWl2ZWQgc3VjY2VzcyBub3RpZmljYXRpb24nLCBkYXRhKVxuICApXG4gIC8vIHRoZSBgY29uY2F0TWFwYCBvcGVyYXRvciBmbGF0dGVucyBhIHNlcXVlbmNlIG9mIHNlcXVlbmNlcy5cbiAgLmNvbmNhdE1hcChcbiAgICAvKipcbiAgICAgKiBqb2luIHRoZSBvcmlnaW5hbCBkYXRhIGZyb20gdGhlIHN0YXR1cyBldmVudCB0b2dldGhlciB3aXRoIGEgY29tYmluZWRcbiAgICAgKiBzdGF0dXMgZnJvbSBnaXRodWIsIGFuZCBhbiBhcnJheSBvZiB0aGUgZmlsZXMgYXQgcmVwb3NpdG9yeSByb290XG4gICAgICogKHNvIHdlIGNhbiBjaGVjayB0byBiZSBzdXJlIHRoZSByZXBvc2l0b3J5IGhhcyBhIHBhY2thZ2UuanNvbiwgc28gd2VcbiAgICAgKiBhY3R1YWxseSBjYXJlIGFib3V0IGl0LiB0aGlzIHN0ZXAganVzdCBhZGRzIGRhdGEgdG8gd2hhdCdzIGZsb3dpbmcgZG93blxuICAgICAqIHRoZSBwaXBlLlxuICAgICAqXG4gICAgICovXG4gICAgKHsgZGF0YSB9KSA9PiBPLmZvcmtKb2luKFxuICAgICAgLy8gTy5qdXN0IHR1cm5zIGEgcmVhbGl6ZWQgdmFsdWUgYmFjayBpbnRvIGFuIG9ic2VydmFibGUgYWdhaW4sIHNvIHdlXG4gICAgICAvLyBjYW4gY29udGludWUgdG8gcGFzcyBpdCB1c2luZyBSeCBjb21iaW5hdG9ycy5cbiAgICAgIE8uanVzdChkYXRhKSxcbiAgICAgIC8vIEdpdEh1YiBcImNvbWJpbmVkIHN0YXR1c1wiIGVuZHBvaW50IGluY2x1ZGVzIGEgY29tYmluZWQgc3RhdGUgcmVmbGVjdGluZ1xuICAgICAgLy8gdGhlIHN0YXRlIG9mIHRoZSBsYXN0IHVuaXF1ZSBzZXQgb2Ygc3RhdHVzZXMuIGZvciBub3csIGl0IHNlZW1zIHRvIGRvXG4gICAgICAvLyBNXG4gICAgICAvLyBleGFjdGx5IHdoYXQgd2Ugd2FudC5cbiAgICAgIGdpdGh1YkNsaWVudChcbiAgICAgICAgJ2dldCcsXG4gICAgICAgIGAvcmVwb3MvJHtnaXRodWIub3JnfS8ke2RhdGEucmVwb3NpdG9yeS5uYW1lfS9jb21taXRzLyR7ZGF0YS5zaGF9L2AgK1xuICAgICAgICBgc3RhdHVzYFxuICAgICAgKSxcbiAgICAgIC8vICdjb250ZW50cycgZW5kcG9pbnQgcmV0dXJucyBhcnJheSBvZiBmaWxlcyBpbiB0aGUgY29tbWl0IHNuYXBzaG90XG4gICAgICBnaXRodWJDbGllbnQuZm9yUmVwbyhkYXRhLnJlcG9zaXRvcnkubmFtZSkoXG4gICAgICAgICdjb250ZW50cycsXG4gICAgICAgICcvJyxcbiAgICAgICAgZGF0YS5zaGFcbiAgICAgICksXG4gICAgICAvLyBPLmZvcmtKb2luIHRha2VzIGEgc2VsZWN0b3IgZnVuY3Rpb24sIHNvIHdlIGNhbiB0dXJuIHBvc2l0aW9uYWwgYXJnc1xuICAgICAgLy8gaW50byBuYW1lZCBwcm9wZXJ0aWVzLlxuICAgICAgKHsgcmVwb3NpdG9yeSwgc2hhIH0sIGNvbWJpbmVkU3RhdHVzLCBjb250ZW50cykgPT5cbiAgICAgICAgKHsgcmVwb3NpdG9yeSwgc2hhLCBjb21iaW5lZFN0YXR1cywgY29udGVudHMgfSlcbiAgICApXG4gIClcbiAgLmZpbHRlcihcbiAgICAvKipcbiAgICAgKiB3ZSBvbmx5IGNhcmUgYWJvdXQgcmVwb3NpdG9yaWVzIHdpdGggcGFja2FnZS5qc29uIGN1cnJlbnRseSwgdGhvdWdoIHRoaXNcbiAgICAgKiBtYXkgY2hhbmdlIGluIHRoZSBmdXR1cmUuXG4gICAgICpcbiAgICAgKi9cbiAgICAoeyBjb250ZW50cyB9KSA9PiBjb250ZW50cy5zb21lKCh7IHBhdGggfSkgPT4gcGF0aCA9PT0gJ3BhY2thZ2UuanNvbicpXG4gIClcbiAgLmZpbHRlcihcbiAgICAvKipcbiAgICAgKiBtb3JlIGltcG9ydGFudGx5LCB3ZSBvbmx5IHdhbnQgdG8gbm90aWZ5XG4gICAgICogYWJvdXQgcGFja2FnZXMgd2hvc2UgbGF0ZXN0IHN1Y2Nlc3MgZXZlbnQgcmVzdWx0cyBpbiBhIGNvbWJpbmVkU3RhdHVzXG4gICAgICogb2YgXCJzdWNjZXNzXCIsIG1lYW5pbmcgaXQncyB0aGUgbGFzdCBidWlsZCBzZXJ2aWNlIHRvIHN1Y2NlZWQgYW5kIHRoZVxuICAgICAqIHRhZyBpcyByZWFkeSBub3cuXG4gICAgICpcbiAgICAgKi9cbiAgICAoeyBjb21iaW5lZFN0YXR1cyB9KSA9PiBjb21iaW5lZFN0YXR1cy5zdGF0ZSA9PT0gJ3N1Y2Nlc3MnXG4gIClcbiAgLmNvbmNhdE1hcChcbiAgICAvKipcbiAgICAgKiBub3csIHdlIG9ubHkgd2FudCB0byBub3RpZnkgZm9yIHN1Y2Nlc3NmdWwgYnVpbGRzIHRoYXQgYXJlICp0YWdnZWQqLlxuICAgICAqIGl0IGlzIHRob3NlIGJ1aWxkcyB0aGF0IGFyZSByZWxlYXNlIGNhbmRpZGF0ZXMuIGJlY2F1c2Ugb2YgdGhlIG5hdHVyZVxuICAgICAqIG9mIGdpdCBwb2ludGVycywgdGhlIGNvbW1pdCBpdHNlbGYgZG9lc24ndCBrbm93IGlmIGl0J3MgYSB0YWcsIHNvIHdlXG4gICAgICogaGF2ZSB0byBxdWVyeSB0aGUgdGFncyBlbmRwb2ludCB0byBmaW5kIG91dCBpZiB0aGVyZSBpcyBvbmUgZm9yIHRoaXNcbiAgICAgKiBjb21taXQuXG4gICAgICogTkI6IHdlIGRvIG5vdCBjdXJyZW50bHkgdXNlIGdpdGh1YiByZWxlYXNlcyBhbmQgbWF5YmUgd2Ugc2hvdWxkXG4gICAgICpcbiAgICAgKi9cbiAgICAoeyByZXBvc2l0b3J5LCBzaGEgfSkgPT4gTy5mb3JrSm9pbihcbiAgICAgIE8uanVzdCh7IHJlcG9zaXRvcnksIHNoYSB9KSxcbiAgICAgIGdpdGh1YkNsaWVudC5mb3JSZXBvKHJlcG9zaXRvcnkubmFtZSkoJ3RhZ3MnKSxcbiAgICAgICh7IHJlcG9zaXRvcnksIHNoYSB9LCB0YWdzKSA9PlxuICAgICAgKHtcbiAgICAgICAgcmVwb3NpdG9yeSxcbiAgICAgICAgc2hhLFxuICAgICAgICAvLyBpZiB0aGVyZSdzIGEgdGFnIHdob3NlIGNvbW1pdCBtYXRjaGVzIHRoZSBzaGEgb2YgdGhlIGN1cnJlbnQgYnVpbGQsXG4gICAgICAgIC8vIGFkZCBpdCB0byB0aGUgZGF0YSBiZWluZyBwaXBlZCB0aHJvdWdoXG4gICAgICAgIHRhZzogdGFncy5maW5kKCh7IGNvbW1pdCB9KSA9PiBjb21taXQgJiYgY29tbWl0LnNoYSA9PT0gc2hhKVxuICAgICAgfSlcbiAgICApXG4gIClcbiAgLmZpbHRlcihcbiAgICAvKipcbiAgICAgKlxuICAgICAqIG5vdywgZmlsdGVyIG9uIHRoZSBwcmVzZW5jZSBvZiBzdWNoIGEgdGFnLlxuICAgICAqIGFsc28sIHdlIG9ubHkgd2FudCB0YWdzIHRoYXQgYXJlIGFjdHVhbGx5IHNlbWFudGljIHZlcnNpb25zLiBvdGhlclxuICAgICAqIHRhZ3MgbWF5IGJlIGV4cGVyaW1lbnRzLCBhbmQgY2VydGFpbmx5IHdlIGNhbid0IHVzZSB0aGVtIHRvIGZpZ3VyZSBvdXRcbiAgICAgKiB3aGV0aGVyIHRoZSB2ZXJzaW9uIGhhcyBpbmNyZW1lbnRlZC5cbiAgICAgKlxuICAgICAqL1xuICAgICh7IHRhZyB9KSA9PiB0YWcgJiYgc2VtdmVyLmNsZWFuKHRhZy5uYW1lKVxuICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UGFja2FnZVN0YXR1cyh7XG4gIHBhY2thZ2VOYW1lLFxuICBicmFuY2gsXG4gIGdpdGh1YkNsaWVudCxcbiAgZ2l0aHViLFxuICBucG1DbGllbnQsXG4gIGNpUHJvdmlkZXJzXG59KSB7XG4gIGxldCBnZXRSZXBvRGF0YSA9IGdpdGh1YkNsaWVudC5mb3JSZXBvKHBhY2thZ2VOYW1lKTtcbiAgLyoqXG4gICAqIGZpcnN0LCBmaW5kIG91dCBpZiB0aGUgcmVwbyBleGlzdHMgYW5kIGhhcyBhbnkgdGFncyBhdCBhbGwsIGJlZm9yZSBydW5uaW5nXG4gICAqIGFueSBtb3JlIGNhbGxzIHRvIHRoZSBBUEkuIHNpbmNlIHRoaXMgcmVxdWVzdCBjYW1lIGV4dGVybmFsbHksIHdlIGRvbid0XG4gICAqIGtub3cgaXQncyBmb3IgYSByZWFsIHBhY2thZ2UuXG4gICAqXG4gICAqKi9cbiAgcmV0dXJuIGdldFJlcG9EYXRhKCd0YWdzJylcbiAgLmNvbmNhdE1hcChcbiAgICAvKipcbiAgICAgKiBub3cgdGhhdCB3ZSBrbm93IHRhZ3MgZXhpc3QsIHdlIGNhbiBydW4gdGhlIG90aGVyIGNhbGxzLiBqb2luIHRoZSB0YWdzXG4gICAgICogbGlzdCB3aXRoIHBhY2thZ2UgY29udGVudHMsIHNvIHdlIGNhbiBjaGVjayBmb3IgcGFja2FnZS5qc29uLFxuICAgICAqIGFuZCBucG0gc3RhdHVzLCBzbyB3ZSBjYW4gY29tcGFyZSB3aXRoIHRoZSBwYWNrYWdlJ3Mgc3RhdHVzIHRoZXJlLlxuICAgICAqIHRoaXMgaW5jbHVkZXMgY29tbWl0cyB0b28sIHRob3VnaCB0aGV5IGFyZW4ndCB1c2VkIGhlcmUsIGJlY2F1c2VcbiAgICAgKiB0aGUgZm9ybWF0dGVycyBleHBlY3QgYSBsaXN0IG9mIGNvbW1pdHMgYXMgd2VsbC5cbiAgICAgKlxuICAgICAqKi9cbiAgICAodGFncykgPT4gTy5mb3JrSm9pbihcbiAgICAgIE8uanVzdCh0YWdzKSxcbiAgICAgIGdldFJlcG9EYXRhKCdjb250ZW50cycsICcvJywgYnJhbmNoKSxcbiAgICAgIGdldFJlcG9EYXRhKCdjb21taXRzJywgYnJhbmNoKSxcbiAgICAgIG5wbUNsaWVudC5nZXRTdGF0dXMocGFja2FnZU5hbWUpLFxuICAgICAgLy8gb25jZSBhZ2FpbiwgdHVybiBwb3NpdGlvbmFsIGFyZ3VtZW50cyBpbnRvIG5hbWVkIGFyZ3VtZW50c1xuICAgICAgKHRhZ3MsIGNvbnRlbnRzLCBjb21taXRzLCBucG1JbmZvKSA9PlxuICAgICAgICAoeyB0YWdzLCBjb250ZW50cywgY29tbWl0cywgbnBtSW5mbyB9KVxuICAgIClcbiAgKS5jb25jYXRNYXAoXG4gICAgLy8gam9pbiBkYXRhIHRvIG91dHB1dCBvZiBvdGhlciBvYnNlcnZhYmxlc1xuICAgIChkYXRhKSA9PiBPLmZvcmtKb2luKFxuICAgICAgLy8gY3JlYXRlIG9ic2VydmFibGUgZnJvbSByZWFsaXplZCB2YWx1ZSBzbyBpdCBjYW4gYmUgcGFzc2VkXG4gICAgICBPLmp1c3QoZGF0YSksXG4gICAgICAvKipcbiAgICAgICAqIFRoZSBiZWxvdyBgTy5mb3JgIHR1cm5zIHRoZSAndGFncycgYXJyYXkgaW50byBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlXG4gICAgICAgKiBvZiByZXF1ZXN0cyBmb3IgdGhlIGNvbWJpbmVkIHN0YXR1cyBvbiBlYWNoIHRhZywgdGhlbiBmbGF0dGVucyB0aGVcbiAgICAgICAqIHJlc3VsdHMsIHlpZWxkaW5nIGFuIG9ic2VydmFibGUgc2VxdWVuY2Ugb2YgY29tYmluZWQgc3RhdHVzZXMgZm9yIGVhY2hcbiAgICAgICAqIHRhZy5cbiAgICAgICAqXG4gICAgICAgKiovXG4gICAgICBPLmZvcihcbiAgICAgICAgZGF0YS50YWdzLFxuICAgICAgICAvLyBhZ2FpbiwgcGFzcyB0aGUgdGFnIGFsb25nLCB3ZSBkb24ndCB3YW50IHRvIHR1cm4gaXQgaW50byBzdGF0dXMgYnV0XG4gICAgICAgIC8vIGFkZCBhIHN0YXR1cyB0byBvdXIgY29tYmluZWQgcGF5bG9hZFxuICAgICAgICAodCkgPT4gTy5mb3JrSm9pbihcbiAgICAgICAgICBPLmp1c3QodCksXG4gICAgICAgICAgZ2l0aHViQ2xpZW50KFxuICAgICAgICAgICAgJ2dldCcsXG4gICAgICAgICAgICBgL3JlcG9zLyR7Z2l0aHViLm9yZ30vJHtwYWNrYWdlTmFtZX0vY29tbWl0cy8ke3QubmFtZX0vc3RhdHVzYFxuICAgICAgICAgICksXG4gICAgICAgICAgKHRhZywgc3RhdHVzKSA9PiAoeyB0YWcsIHN0YXR1cyB9KVxuICAgICAgICApXG4gICAgICApLmZpbmQoXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBhbmQgdGhlIGFib3ZlIGBmaW5kYCBvcGVyYXRvciB3aWxsIHRyYXZlcnNlIGFuIG9ic2VydmFibGUgc2VxdWVuY2VcbiAgICAgICAgICogdW50aWwgaXQgZmluZHMgYW4gZW1pdHRlZCB2YWx1ZSB0aGF0IHNhdGlzZmllcyBhIGNvbmRpdGlvbi4gaW4gdGhpc1xuICAgICAgICAgKiBjYXNlIHRoZSBjb25kaXRpb24gaXMgdGhhdCB0aGUgdGFnL3N0YXR1cyB0dXBsZSBtdXN0IGhhdmUgYSBzdGF0dXNcbiAgICAgICAgICogd2l0aCBhIGBzdGF0ZWAgb2YgXCJzdWNjZXNzXCIuXG4gICAgICAgICAqXG4gICAgICAgICAqKi9cbiAgICAgICAgKHsgc3RhdHVzIH0pID0+IHN0YXR1cy5zdGF0ZSA9PT0gJ3N1Y2Nlc3MnXG4gICAgICApLFxuICAgICAgLy8gaWYgYSB0YWcgZXhpc3RzLCB3ZSdsbCBhZGQgaXQgYXMgYGxhdGVzdEdvb2RUYWdgIHRvIHRoZSBjb21iaW5lZFxuICAgICAgLy8gcGF5bG9hZC4gaWYgaXQgZG9lc24ndCBleGlzdCwgdGhpcyB3aWxsIGFsbCBmYWxsIHRocm91Z2ggdG8gdGhlIGVycm9yXG4gICAgICAvLyBvcGVyYXRvci5cbiAgICAgIChkYXRhLCB7IHRhZyB9KSA9PiAoeyBsYXRlc3RHb29kVGFnOiB0YWcsIC4uLmRhdGEgfSlcbiAgICApXG4gICkubWFwKFxuICAgIC8qKlxuICAgICAqIGFkZCBhIGxpc3Qgb2YgQ0kgcHJvdmlkZXJzIGJhc2VkIG9uIHRoZSBgY29udGVudHNgIGFycmF5LCBmb3IgZGlzcGxheS5cbiAgICAgKiBkZXRlcm1pbmUgd2hldGhlciBDSSBpcyBjb25maWd1cmVkIGJ5IHRoZSBwcmVzZW5jZSBvZiBpdHMgY29uZmlndXJhdGlvblxuICAgICAqIGZpbGUgaW4gdGhlIHJlcG8gcm9vdC5cbiAgICAgKiovXG4gICAgKGRhdGEpID0+ICh7XG4gICAgICBjaVByb3ZpZGVyc0NvbmZpZ3VyZWQ6IGNpUHJvdmlkZXJzLmZpbHRlcihcbiAgICAgICAgKHsgY29uZmlnRmlsZSB9KSA9PlxuICAgICAgICAgIGRhdGEuY29udGVudHMuc29tZSgoeyBwYXRoIH0pID0+IHBhdGggPT09IGNvbmZpZ0ZpbGUpXG4gICAgICApLFxuICAgICAgLi4uZGF0YVxuICAgIH0pXG4gICk7XG59XG4iXX0=
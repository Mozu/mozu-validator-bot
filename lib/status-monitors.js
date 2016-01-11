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
    (originalStatus, combinedStatus, contents) => ({ originalStatus, combinedStatus, contents }));
  }).filter(
  /**
   * we only care about repositories with package.json currently, though this
   * may change in the future.
   *
   */
  _ref5 => {
    let contents = _ref5.contents;
    return contents.some(_ref6 => {
      let path = _ref6.path;
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
  _ref7 => {
    let combinedStatus = _ref7.combinedStatus;
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
  _ref8 => {
    let originalStatus = _ref8.originalStatus;
    return _rx.Observable.forkJoin(_rx.Observable.just(originalStatus), githubClient.forRepo(originalStatus.repository.name)('tags'), (originalStatus, tags) => ({
      originalStatus,
      // if there's a tag whose commit matches the sha of the current build,
      // add it to the data being piped through
      tag: tags.find(_ref9 => {
        let commit = _ref9.commit;
        return commit && commit.sha === originalStatus.sha;
      })
    }));
  }).filter(
  /**
   *
   * now, filter on the presence of such a tag.
   * also, we only want tags that are actually semantic versions. other
   * tags may be experiments, and certainly we can't use them to figure out
   * whether the version has incremented.
   *
   */
  _ref10 => {
    let tag = _ref10.tag;
    return tag && _semver2.default.clean(tag.name);
  });
}

function getPackageStatus(_ref11) {
  let packageName = _ref11.packageName;
  let branch = _ref11.branch;
  let githubClient = _ref11.githubClient;
  let github = _ref11.github;
  let npmClient = _ref11.npmClient;
  let ciProviders = _ref11.ciProviders;

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
  _ref12 => {
    let status = _ref12.status;
    return status.state === 'success';
  }),
  // if a tag exists, we'll add it as `latestGoodTag` to the combined
  // payload. if it doesn't exist, this will all fall through to the error
  // operator.
  (data, _ref13) => {
    let tag = _ref13.tag;
    return _extends({ latestGoodTag: tag }, data);
  })).map(
  /**
   * add a list of CI providers based on the `contents` array, for display.
   * determine whether CI is configured by the presence of its configuration
   * file in the repo root.
   **/
  data => _extends({
    ciProvidersConfigured: ciProviders.filter(_ref14 => {
      let configFile = _ref14.configFile;
      return data.contents.some(_ref15 => {
        let path = _ref15.path;
        return path === configFile;
      });
    })
  }, data));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9zdGF0dXMtbW9uaXRvcnMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7OztRQUdnQixxQkFBcUIsR0FBckIscUJBQXFCO1FBaUhyQixnQkFBZ0IsR0FBaEIsZ0JBQWdCOzs7Ozs7Ozs7O0FBakh6QixTQUFTLHFCQUFxQixPQUtsQztNQUpELE9BQU8sUUFBUCxPQUFPO01BQ1AsTUFBTSxRQUFOLE1BQU07TUFDTixZQUFZLFFBQVosWUFBWTtNQUNaLE1BQU0sUUFBTixNQUFNOztBQUVOLFNBQU8sT0FBTyxDQUFDLE1BQU07Ozs7Ozs7QUFPbkI7UUFBRyxLQUFLLFNBQUwsS0FBSztRQUFFLElBQUksU0FBSixJQUFJO1dBQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVM7R0FBQSxDQUNwRSxDQUNBLEVBQUU7Ozs7OztBQU1EO1FBQUcsSUFBSSxTQUFKLElBQUk7V0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLCtCQUErQixFQUFFLElBQUksQ0FBQztHQUFBOztBQUNqRSxHQUVBLFNBQVM7Ozs7Ozs7OztBQVNSO1FBQUcsSUFBSSxTQUFKLElBQUk7V0FBTyxJQW5DVCxVQUFVLENBbUNDLFFBQVE7OztBQUd0QixRQXRDRyxVQUFVLENBc0NYLElBQUksQ0FBQyxJQUFJLENBQUM7Ozs7O0FBS1osZ0JBQVksQ0FDVixLQUFLLEVBQ0wsQ0FBQyxPQUFPLEdBQUUsTUFBTSxDQUFDLEdBQUcsRUFBQyxDQUFDLEdBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUMsU0FBUyxHQUFFLElBQUksQ0FBQyxHQUFHLEVBQUMsQ0FBQyxDQUFDLEdBQ25FLENBQUMsTUFBTSxDQUFDLENBQ1Q7O0FBRUQsZ0JBQVksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FDeEMsVUFBVSxFQUNWLEdBQUcsRUFDSCxJQUFJLENBQUMsR0FBRyxDQUNUOzs7QUFHRCxLQUFDLGNBQWMsRUFBRSxj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UUFBRyxNQUFNLFVBQU4sTUFBTTtXQUFPLE1BQU0sQ0FBQyxLQUFLLEtBQUssU0FBUztHQUFBLENBQzNDOzs7O0FBSUQsR0FBQyxJQUFJO1FBQUksR0FBRyxVQUFILEdBQUc7c0JBQVUsYUFBYSxFQUFFLEdBQUcsSUFBSyxJQUFJO0dBQUcsQ0FDckQsQ0FDRixDQUFDLEdBQUc7Ozs7OztBQU1ILEFBQUMsTUFBSTtBQUNILHlCQUFxQixFQUFFLFdBQVcsQ0FBQyxNQUFNLENBQ3ZDO1VBQUcsVUFBVSxVQUFWLFVBQVU7YUFDWCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztZQUFHLElBQUksVUFBSixJQUFJO2VBQU8sSUFBSSxLQUFLLFVBQVU7T0FBQSxDQUFDO0tBQUEsQ0FDeEQ7S0FDRSxJQUFJLENBQ1AsQ0FDSCxDQUFDO0NBQ0giLCJmaWxlIjoic3RhdHVzLW1vbml0b3JzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHNlbXZlciBmcm9tICdzZW12ZXInO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZSBhcyBPIH0gZnJvbSAncngnO1xuXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyRm9yQnVpbGRTdWNjZXNzKHtcbiAgZXZlbnRzJCxcbiAgbG9nZ2VyLFxuICBnaXRodWJDbGllbnQsXG4gIGdpdGh1YlxufSkge1xuICByZXR1cm4gZXZlbnRzJC5maWx0ZXIoXG4gICAgLyoqXG4gICAgICogZmlyc3QsIGZpbHRlciBmb3Igc3RhdHVzIGV2ZW50cywgaW4gY2FzZSB0aGUgd2ViaG9vayBpcyBzdWJzY3JpYmVkIHRvXG4gICAgICogbW9yZSB0aGFuIGp1c3Qgc3RhdHVzIGV2ZW50cy4gYXQgdGhlIHNhbWUgdGltZSwgd2UgY2FuIGZpbHRlciBmb3JcbiAgICAgKiBzdWNjZXNzIGV2ZW50cy5cbiAgICAgKlxuICAgICAqL1xuICAgICh7IGV2ZW50LCBkYXRhIH0pID0+IGV2ZW50ID09PSAnc3RhdHVzJyAmJiBkYXRhLnN0YXRlID09PSAnc3VjY2VzcydcbiAgKVxuICAuZG8oXG4gICAgLyoqXG4gICAgICogdGFwIGZvciBsb2dnaW5nLiB0aGUgYGRvYCBvcGVyYXRvciBpcyBhICd0YXAnIG9wZXJhdG9yIHRoYXQgZG9lcyBub3RcbiAgICAgKiBtb2RpZnkgdGhlIHN0cmVhbS5cbiAgICAgKlxuICAgICAqL1xuICAgICh7IGRhdGEgfSkgPT4gbG9nZ2VyLmluZm8oJ1JlY2VpdmVkIHN1Y2Nlc3Mgbm90aWZpY2F0aW9uJywgZGF0YSlcbiAgKVxuICAvLyB0aGUgYGNvbmNhdE1hcGAgb3BlcmF0b3IgZmxhdHRlbnMgYSBzZXF1ZW5jZSBvZiBzZXF1ZW5jZXMuXG4gIC5jb25jYXRNYXAoXG4gICAgLyoqXG4gICAgICogam9pbiB0aGUgb3JpZ2luYWwgZGF0YSBmcm9tIHRoZSBzdGF0dXMgZXZlbnQgdG9nZXRoZXIgd2l0aCBhIGNvbWJpbmVkXG4gICAgICogc3RhdHVzIGZyb20gZ2l0aHViLCBhbmQgYW4gYXJyYXkgb2YgdGhlIGZpbGVzIGF0IHJlcG9zaXRvcnkgcm9vdFxuICAgICAqIChzbyB3ZSBjYW4gY2hlY2sgdG8gYmUgc3VyZSB0aGUgcmVwb3NpdG9yeSBoYXMgYSBwYWNrYWdlLmpzb24sIHNvIHdlXG4gICAgICogYWN0dWFsbHkgY2FyZSBhYm91dCBpdC4gdGhpcyBzdGVwIGp1c3QgYWRkcyBkYXRhIHRvIHdoYXQncyBmbG93aW5nIGRvd25cbiAgICAgKiB0aGUgcGlwZS5cbiAgICAgKlxuICAgICAqL1xuICAgICh7IGRhdGEgfSkgPT4gTy5mb3JrSm9pbihcbiAgICAgIC8vIE8uanVzdCB0dXJucyBhIHJlYWxpemVkIHZhbHVlIGJhY2sgaW50byBhbiBvYnNlcnZhYmxlIGFnYWluLCBzbyB3ZVxuICAgICAgLy8gY2FuIGNvbnRpbnVlIHRvIHBhc3MgaXQgdXNpbmcgUnggY29tYmluYXRvcnMuXG4gICAgICBPLmp1c3QoZGF0YSksXG4gICAgICAvLyBHaXRIdWIgXCJjb21iaW5lZCBzdGF0dXNcIiBlbmRwb2ludCBpbmNsdWRlcyBhIGNvbWJpbmVkIHN0YXRlIHJlZmxlY3RpbmdcbiAgICAgIC8vIHRoZSBzdGF0ZSBvZiB0aGUgbGFzdCB1bmlxdWUgc2V0IG9mIHN0YXR1c2VzLiBmb3Igbm93LCBpdCBzZWVtcyB0byBkb1xuICAgICAgLy8gTVxuICAgICAgLy8gZXhhY3RseSB3aGF0IHdlIHdhbnQuXG4gICAgICBnaXRodWJDbGllbnQoXG4gICAgICAgICdnZXQnLFxuICAgICAgICBgL3JlcG9zLyR7Z2l0aHViLm9yZ30vJHtkYXRhLnJlcG9zaXRvcnkubmFtZX0vY29tbWl0cy8ke2RhdGEuc2hhfS9gICtcbiAgICAgICAgYHN0YXR1c2BcbiAgICAgICksXG4gICAgICAvLyAnY29udGVudHMnIGVuZHBvaW50IHJldHVybnMgYXJyYXkgb2YgZmlsZXMgaW4gdGhlIGNvbW1pdCBzbmFwc2hvdFxuICAgICAgZ2l0aHViQ2xpZW50LmZvclJlcG8oZGF0YS5yZXBvc2l0b3J5Lm5hbWUpKFxuICAgICAgICAnY29udGVudHMnLFxuICAgICAgICAnLycsXG4gICAgICAgIGRhdGEuc2hhXG4gICAgICApLFxuICAgICAgLy8gTy5mb3JrSm9pbiB0YWtlcyBhIHNlbGVjdG9yIGZ1bmN0aW9uLCBzbyB3ZSBjYW4gdHVybiBwb3NpdGlvbmFsIGFyZ3NcbiAgICAgIC8vIGludG8gbmFtZWQgcHJvcGVydGllcy5cbiAgICAgIChvcmlnaW5hbFN0YXR1cywgY29tYmluZWRTdGF0dXMsIGNvbnRlbnRzKSA9PlxuICAgICAgICAoeyBvcmlnaW5hbFN0YXR1cywgY29tYmluZWRTdGF0dXMsIGNvbnRlbnRzIH0pXG4gICAgKVxuICApXG4gIC5maWx0ZXIoXG4gICAgLyoqXG4gICAgICogd2Ugb25seSBjYXJlIGFib3V0IHJlcG9zaXRvcmllcyB3aXRoIHBhY2thZ2UuanNvbiBjdXJyZW50bHksIHRob3VnaCB0aGlzXG4gICAgICogbWF5IGNoYW5nZSBpbiB0aGUgZnV0dXJlLlxuICAgICAqXG4gICAgICovXG4gICAgKHsgY29udGVudHMgfSkgPT4gY29udGVudHMuc29tZSgoeyBwYXRoIH0pID0+IHBhdGggPT09ICdwYWNrYWdlLmpzb24nKVxuICApXG4gIC5maWx0ZXIoXG4gICAgLyoqXG4gICAgICogbW9yZSBpbXBvcnRhbnRseSwgd2Ugb25seSB3YW50IHRvIG5vdGlmeVxuICAgICAqIGFib3V0IHBhY2thZ2VzIHdob3NlIGxhdGVzdCBzdWNjZXNzIGV2ZW50IHJlc3VsdHMgaW4gYSBjb21iaW5lZFN0YXR1c1xuICAgICAqIG9mIFwic3VjY2Vzc1wiLCBtZWFuaW5nIGl0J3MgdGhlIGxhc3QgYnVpbGQgc2VydmljZSB0byBzdWNjZWVkIGFuZCB0aGVcbiAgICAgKiB0YWcgaXMgcmVhZHkgbm93LlxuICAgICAqXG4gICAgICovXG4gICAgKHsgY29tYmluZWRTdGF0dXMgfSkgPT4gY29tYmluZWRTdGF0dXMuc3RhdGUgPT09ICdzdWNjZXNzJ1xuICApXG4gIC5jb25jYXRNYXAoXG4gICAgLyoqXG4gICAgICogbm93LCB3ZSBvbmx5IHdhbnQgdG8gbm90aWZ5IGZvciBzdWNjZXNzZnVsIGJ1aWxkcyB0aGF0IGFyZSAqdGFnZ2VkKi5cbiAgICAgKiBpdCBpcyB0aG9zZSBidWlsZHMgdGhhdCBhcmUgcmVsZWFzZSBjYW5kaWRhdGVzLiBiZWNhdXNlIG9mIHRoZSBuYXR1cmVcbiAgICAgKiBvZiBnaXQgcG9pbnRlcnMsIHRoZSBjb21taXQgaXRzZWxmIGRvZXNuJ3Qga25vdyBpZiBpdCdzIGEgdGFnLCBzbyB3ZVxuICAgICAqIGhhdmUgdG8gcXVlcnkgdGhlIHRhZ3MgZW5kcG9pbnQgdG8gZmluZCBvdXQgaWYgdGhlcmUgaXMgb25lIGZvciB0aGlzXG4gICAgICogY29tbWl0LlxuICAgICAqIE5COiB3ZSBkbyBub3QgY3VycmVudGx5IHVzZSBnaXRodWIgcmVsZWFzZXMgYW5kIG1heWJlIHdlIHNob3VsZFxuICAgICAqXG4gICAgICovXG4gICAgKHsgb3JpZ2luYWxTdGF0dXMgfSkgPT4gTy5mb3JrSm9pbihcbiAgICAgIE8uanVzdChvcmlnaW5hbFN0YXR1cyksXG4gICAgICBnaXRodWJDbGllbnQuZm9yUmVwbyhvcmlnaW5hbFN0YXR1cy5yZXBvc2l0b3J5Lm5hbWUpKCd0YWdzJyksXG4gICAgICAob3JpZ2luYWxTdGF0dXMsIHRhZ3MpID0+XG4gICAgICAoe1xuICAgICAgICBvcmlnaW5hbFN0YXR1cyxcbiAgICAgICAgLy8gaWYgdGhlcmUncyBhIHRhZyB3aG9zZSBjb21taXQgbWF0Y2hlcyB0aGUgc2hhIG9mIHRoZSBjdXJyZW50IGJ1aWxkLFxuICAgICAgICAvLyBhZGQgaXQgdG8gdGhlIGRhdGEgYmVpbmcgcGlwZWQgdGhyb3VnaFxuICAgICAgICB0YWc6IHRhZ3MuZmluZChcbiAgICAgICAgICAoeyBjb21taXQgfSkgPT4gY29tbWl0ICYmIGNvbW1pdC5zaGEgPT09IG9yaWdpbmFsU3RhdHVzLnNoYVxuICAgICAgICApXG4gICAgICB9KVxuICAgIClcbiAgKVxuICAuZmlsdGVyKFxuICAgIC8qKlxuICAgICAqXG4gICAgICogbm93LCBmaWx0ZXIgb24gdGhlIHByZXNlbmNlIG9mIHN1Y2ggYSB0YWcuXG4gICAgICogYWxzbywgd2Ugb25seSB3YW50IHRhZ3MgdGhhdCBhcmUgYWN0dWFsbHkgc2VtYW50aWMgdmVyc2lvbnMuIG90aGVyXG4gICAgICogdGFncyBtYXkgYmUgZXhwZXJpbWVudHMsIGFuZCBjZXJ0YWlubHkgd2UgY2FuJ3QgdXNlIHRoZW0gdG8gZmlndXJlIG91dFxuICAgICAqIHdoZXRoZXIgdGhlIHZlcnNpb24gaGFzIGluY3JlbWVudGVkLlxuICAgICAqXG4gICAgICovXG4gICAgKHsgdGFnIH0pID0+IHRhZyAmJiBzZW12ZXIuY2xlYW4odGFnLm5hbWUpXG4gICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQYWNrYWdlU3RhdHVzKHtcbiAgcGFja2FnZU5hbWUsXG4gIGJyYW5jaCxcbiAgZ2l0aHViQ2xpZW50LFxuICBnaXRodWIsXG4gIG5wbUNsaWVudCxcbiAgY2lQcm92aWRlcnNcbn0pIHtcbiAgbGV0IGdldFJlcG9EYXRhID0gZ2l0aHViQ2xpZW50LmZvclJlcG8ocGFja2FnZU5hbWUpO1xuICAvKipcbiAgICogZmlyc3QsIGZpbmQgb3V0IGlmIHRoZSByZXBvIGV4aXN0cyBhbmQgaGFzIGFueSB0YWdzIGF0IGFsbCwgYmVmb3JlIHJ1bm5pbmdcbiAgICogYW55IG1vcmUgY2FsbHMgdG8gdGhlIEFQSS4gc2luY2UgdGhpcyByZXF1ZXN0IGNhbWUgZXh0ZXJuYWxseSwgd2UgZG9uJ3RcbiAgICoga25vdyBpdCdzIGZvciBhIHJlYWwgcGFja2FnZS5cbiAgICpcbiAgICoqL1xuICByZXR1cm4gZ2V0UmVwb0RhdGEoJ3RhZ3MnKVxuICAuY29uY2F0TWFwKFxuICAgIC8qKlxuICAgICAqIG5vdyB0aGF0IHdlIGtub3cgdGFncyBleGlzdCwgd2UgY2FuIHJ1biB0aGUgb3RoZXIgY2FsbHMuIGpvaW4gdGhlIHRhZ3NcbiAgICAgKiBsaXN0IHdpdGggcGFja2FnZSBjb250ZW50cywgc28gd2UgY2FuIGNoZWNrIGZvciBwYWNrYWdlLmpzb24sXG4gICAgICogYW5kIG5wbSBzdGF0dXMsIHNvIHdlIGNhbiBjb21wYXJlIHdpdGggdGhlIHBhY2thZ2UncyBzdGF0dXMgdGhlcmUuXG4gICAgICogdGhpcyBpbmNsdWRlcyBjb21taXRzIHRvbywgdGhvdWdoIHRoZXkgYXJlbid0IHVzZWQgaGVyZSwgYmVjYXVzZVxuICAgICAqIHRoZSBmb3JtYXR0ZXJzIGV4cGVjdCBhIGxpc3Qgb2YgY29tbWl0cyBhcyB3ZWxsLlxuICAgICAqXG4gICAgICoqL1xuICAgICh0YWdzKSA9PiBPLmZvcmtKb2luKFxuICAgICAgTy5qdXN0KHRhZ3MpLFxuICAgICAgZ2V0UmVwb0RhdGEoJ2NvbnRlbnRzJywgJy8nLCBicmFuY2gpLFxuICAgICAgZ2V0UmVwb0RhdGEoJ2NvbW1pdHMnLCBicmFuY2gpLFxuICAgICAgbnBtQ2xpZW50LmdldFN0YXR1cyhwYWNrYWdlTmFtZSksXG4gICAgICAvLyBvbmNlIGFnYWluLCB0dXJuIHBvc2l0aW9uYWwgYXJndW1lbnRzIGludG8gbmFtZWQgYXJndW1lbnRzXG4gICAgICAodGFncywgY29udGVudHMsIGNvbW1pdHMsIG5wbUluZm8pID0+XG4gICAgICAgICh7IHRhZ3MsIGNvbnRlbnRzLCBjb21taXRzLCBucG1JbmZvIH0pXG4gICAgKVxuICApLmNvbmNhdE1hcChcbiAgICAvLyBqb2luIGRhdGEgdG8gb3V0cHV0IG9mIG90aGVyIG9ic2VydmFibGVzXG4gICAgKGRhdGEpID0+IE8uZm9ya0pvaW4oXG4gICAgICAvLyBjcmVhdGUgb2JzZXJ2YWJsZSBmcm9tIHJlYWxpemVkIHZhbHVlIHNvIGl0IGNhbiBiZSBwYXNzZWRcbiAgICAgIE8uanVzdChkYXRhKSxcbiAgICAgIC8qKlxuICAgICAgICogVGhlIGJlbG93IGBPLmZvcmAgdHVybnMgdGhlICd0YWdzJyBhcnJheSBpbnRvIGFuIG9ic2VydmFibGUgc2VxdWVuY2VcbiAgICAgICAqIG9mIHJlcXVlc3RzIGZvciB0aGUgY29tYmluZWQgc3RhdHVzIG9uIGVhY2ggdGFnLCB0aGVuIGZsYXR0ZW5zIHRoZVxuICAgICAgICogcmVzdWx0cywgeWllbGRpbmcgYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZSBvZiBjb21iaW5lZCBzdGF0dXNlcyBmb3IgZWFjaFxuICAgICAgICogdGFnLlxuICAgICAgICpcbiAgICAgICAqKi9cbiAgICAgIE8uZm9yKFxuICAgICAgICBkYXRhLnRhZ3MsXG4gICAgICAgIC8vIGFnYWluLCBwYXNzIHRoZSB0YWcgYWxvbmcsIHdlIGRvbid0IHdhbnQgdG8gdHVybiBpdCBpbnRvIHN0YXR1cyBidXRcbiAgICAgICAgLy8gYWRkIGEgc3RhdHVzIHRvIG91ciBjb21iaW5lZCBwYXlsb2FkXG4gICAgICAgICh0KSA9PiBPLmZvcmtKb2luKFxuICAgICAgICAgIE8uanVzdCh0KSxcbiAgICAgICAgICBnaXRodWJDbGllbnQoXG4gICAgICAgICAgICAnZ2V0JyxcbiAgICAgICAgICAgIGAvcmVwb3MvJHtnaXRodWIub3JnfS8ke3BhY2thZ2VOYW1lfS9jb21taXRzLyR7dC5uYW1lfS9zdGF0dXNgXG4gICAgICAgICAgKSxcbiAgICAgICAgICAodGFnLCBzdGF0dXMpID0+ICh7IHRhZywgc3RhdHVzIH0pXG4gICAgICAgIClcbiAgICAgICkuZmluZChcbiAgICAgICAgLyoqXG4gICAgICAgICAqIGFuZCB0aGUgYWJvdmUgYGZpbmRgIG9wZXJhdG9yIHdpbGwgdHJhdmVyc2UgYW4gb2JzZXJ2YWJsZSBzZXF1ZW5jZVxuICAgICAgICAgKiB1bnRpbCBpdCBmaW5kcyBhbiBlbWl0dGVkIHZhbHVlIHRoYXQgc2F0aXNmaWVzIGEgY29uZGl0aW9uLiBpbiB0aGlzXG4gICAgICAgICAqIGNhc2UgdGhlIGNvbmRpdGlvbiBpcyB0aGF0IHRoZSB0YWcvc3RhdHVzIHR1cGxlIG11c3QgaGF2ZSBhIHN0YXR1c1xuICAgICAgICAgKiB3aXRoIGEgYHN0YXRlYCBvZiBcInN1Y2Nlc3NcIi5cbiAgICAgICAgICpcbiAgICAgICAgICoqL1xuICAgICAgICAoeyBzdGF0dXMgfSkgPT4gc3RhdHVzLnN0YXRlID09PSAnc3VjY2VzcydcbiAgICAgICksXG4gICAgICAvLyBpZiBhIHRhZyBleGlzdHMsIHdlJ2xsIGFkZCBpdCBhcyBgbGF0ZXN0R29vZFRhZ2AgdG8gdGhlIGNvbWJpbmVkXG4gICAgICAvLyBwYXlsb2FkLiBpZiBpdCBkb2Vzbid0IGV4aXN0LCB0aGlzIHdpbGwgYWxsIGZhbGwgdGhyb3VnaCB0byB0aGUgZXJyb3JcbiAgICAgIC8vIG9wZXJhdG9yLlxuICAgICAgKGRhdGEsIHsgdGFnIH0pID0+ICh7IGxhdGVzdEdvb2RUYWc6IHRhZywgLi4uZGF0YSB9KVxuICAgIClcbiAgKS5tYXAoXG4gICAgLyoqXG4gICAgICogYWRkIGEgbGlzdCBvZiBDSSBwcm92aWRlcnMgYmFzZWQgb24gdGhlIGBjb250ZW50c2AgYXJyYXksIGZvciBkaXNwbGF5LlxuICAgICAqIGRldGVybWluZSB3aGV0aGVyIENJIGlzIGNvbmZpZ3VyZWQgYnkgdGhlIHByZXNlbmNlIG9mIGl0cyBjb25maWd1cmF0aW9uXG4gICAgICogZmlsZSBpbiB0aGUgcmVwbyByb290LlxuICAgICAqKi9cbiAgICAoZGF0YSkgPT4gKHtcbiAgICAgIGNpUHJvdmlkZXJzQ29uZmlndXJlZDogY2lQcm92aWRlcnMuZmlsdGVyKFxuICAgICAgICAoeyBjb25maWdGaWxlIH0pID0+XG4gICAgICAgICAgZGF0YS5jb250ZW50cy5zb21lKCh7IHBhdGggfSkgPT4gcGF0aCA9PT0gY29uZmlnRmlsZSlcbiAgICAgICksXG4gICAgICAuLi5kYXRhXG4gICAgfSlcbiAgKTtcbn1cbiJdfQ==
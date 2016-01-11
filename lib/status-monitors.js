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
  }).defaultIfEmpty({ tag: null }),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9zdGF0dXMtbW9uaXRvcnMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7OztRQUdnQixxQkFBcUIsR0FBckIscUJBQXFCO1FBaUhyQixnQkFBZ0IsR0FBaEIsZ0JBQWdCOzs7Ozs7Ozs7O0FBakh6QixTQUFTLHFCQUFxQixPQUtsQztNQUpELE9BQU8sUUFBUCxPQUFPO01BQ1AsTUFBTSxRQUFOLE1BQU07TUFDTixZQUFZLFFBQVosWUFBWTtNQUNaLE1BQU0sUUFBTixNQUFNOztBQUVOLFNBQU8sT0FBTyxDQUFDLE1BQU07Ozs7Ozs7QUFPbkI7UUFBRyxLQUFLLFNBQUwsS0FBSztRQUFFLElBQUksU0FBSixJQUFJO1dBQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVM7R0FBQSxDQUNwRSxDQUNBLEVBQUU7Ozs7OztBQU1EO1FBQUcsSUFBSSxTQUFKLElBQUk7V0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLCtCQUErQixFQUFFLElBQUksQ0FBQztHQUFBOztBQUNqRSxHQUVBLFNBQVM7Ozs7Ozs7OztBQVNSO1FBQUcsSUFBSSxTQUFKLElBQUk7V0FBTyxJQW5DVCxVQUFVLENBbUNDLFFBQVE7OztBQUd0QixRQXRDRyxVQUFVLENBc0NYLElBQUksQ0FBQyxJQUFJLENBQUM7Ozs7O0FBS1osZ0JBQVksQ0FDVixLQUFLLEVBQ0wsQ0FBQyxPQUFPLEdBQUUsTUFBTSxDQUFDLEdBQUcsRUFBQyxDQUFDLEdBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUMsU0FBUyxHQUFFLElBQUksQ0FBQyxHQUFHLEVBQUMsQ0FBQyxDQUFDLEdBQ25FLENBQUMsTUFBTSxDQUFDLENBQ1Q7O0FBRUQsZ0JBQVksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FDeEMsVUFBVSxFQUNWLEdBQUcsRUFDSCxJQUFJLENBQUMsR0FBRyxDQUNUOzs7QUFHRCxLQUFDLGNBQWMsRUFBRSxj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UUFBRyxNQUFNLFVBQU4sTUFBTTtXQUFPLE1BQU0sQ0FBQyxLQUFLLEtBQUssU0FBUztHQUFBLENBQzNDLENBQUMsY0FBYyxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxDQUFDOzs7O0FBSS9CLEdBQUMsSUFBSTtRQUFJLEdBQUcsVUFBSCxHQUFHO3NCQUFVLGFBQWEsRUFBRSxHQUFHLElBQUssSUFBSTtHQUFHLENBQ3JELENBQ0YsQ0FBQyxHQUFHOzs7Ozs7QUFNSCxBQUFDLE1BQUk7QUFDSCx5QkFBcUIsRUFBRSxXQUFXLENBQUMsTUFBTSxDQUN2QztVQUFHLFVBQVUsVUFBVixVQUFVO2FBQ1gsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7WUFBRyxJQUFJLFVBQUosSUFBSTtlQUFPLElBQUksS0FBSyxVQUFVO09BQUEsQ0FBQztLQUFBLENBQ3hEO0tBQ0UsSUFBSSxDQUNQLENBQ0gsQ0FBQztDQUNIIiwiZmlsZSI6InN0YXR1cy1tb25pdG9ycy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBzZW12ZXIgZnJvbSAnc2VtdmVyJztcbmltcG9ydCB7IE9ic2VydmFibGUgYXMgTyB9IGZyb20gJ3J4JztcblxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlckZvckJ1aWxkU3VjY2Vzcyh7XG4gIGV2ZW50cyQsXG4gIGxvZ2dlcixcbiAgZ2l0aHViQ2xpZW50LFxuICBnaXRodWJcbn0pIHtcbiAgcmV0dXJuIGV2ZW50cyQuZmlsdGVyKFxuICAgIC8qKlxuICAgICAqIGZpcnN0LCBmaWx0ZXIgZm9yIHN0YXR1cyBldmVudHMsIGluIGNhc2UgdGhlIHdlYmhvb2sgaXMgc3Vic2NyaWJlZCB0b1xuICAgICAqIG1vcmUgdGhhbiBqdXN0IHN0YXR1cyBldmVudHMuIGF0IHRoZSBzYW1lIHRpbWUsIHdlIGNhbiBmaWx0ZXIgZm9yXG4gICAgICogc3VjY2VzcyBldmVudHMuXG4gICAgICpcbiAgICAgKi9cbiAgICAoeyBldmVudCwgZGF0YSB9KSA9PiBldmVudCA9PT0gJ3N0YXR1cycgJiYgZGF0YS5zdGF0ZSA9PT0gJ3N1Y2Nlc3MnXG4gIClcbiAgLmRvKFxuICAgIC8qKlxuICAgICAqIHRhcCBmb3IgbG9nZ2luZy4gdGhlIGBkb2Agb3BlcmF0b3IgaXMgYSAndGFwJyBvcGVyYXRvciB0aGF0IGRvZXMgbm90XG4gICAgICogbW9kaWZ5IHRoZSBzdHJlYW0uXG4gICAgICpcbiAgICAgKi9cbiAgICAoeyBkYXRhIH0pID0+IGxvZ2dlci5pbmZvKCdSZWNlaXZlZCBzdWNjZXNzIG5vdGlmaWNhdGlvbicsIGRhdGEpXG4gIClcbiAgLy8gdGhlIGBjb25jYXRNYXBgIG9wZXJhdG9yIGZsYXR0ZW5zIGEgc2VxdWVuY2Ugb2Ygc2VxdWVuY2VzLlxuICAuY29uY2F0TWFwKFxuICAgIC8qKlxuICAgICAqIGpvaW4gdGhlIG9yaWdpbmFsIGRhdGEgZnJvbSB0aGUgc3RhdHVzIGV2ZW50IHRvZ2V0aGVyIHdpdGggYSBjb21iaW5lZFxuICAgICAqIHN0YXR1cyBmcm9tIGdpdGh1YiwgYW5kIGFuIGFycmF5IG9mIHRoZSBmaWxlcyBhdCByZXBvc2l0b3J5IHJvb3RcbiAgICAgKiAoc28gd2UgY2FuIGNoZWNrIHRvIGJlIHN1cmUgdGhlIHJlcG9zaXRvcnkgaGFzIGEgcGFja2FnZS5qc29uLCBzbyB3ZVxuICAgICAqIGFjdHVhbGx5IGNhcmUgYWJvdXQgaXQuIHRoaXMgc3RlcCBqdXN0IGFkZHMgZGF0YSB0byB3aGF0J3MgZmxvd2luZyBkb3duXG4gICAgICogdGhlIHBpcGUuXG4gICAgICpcbiAgICAgKi9cbiAgICAoeyBkYXRhIH0pID0+IE8uZm9ya0pvaW4oXG4gICAgICAvLyBPLmp1c3QgdHVybnMgYSByZWFsaXplZCB2YWx1ZSBiYWNrIGludG8gYW4gb2JzZXJ2YWJsZSBhZ2Fpbiwgc28gd2VcbiAgICAgIC8vIGNhbiBjb250aW51ZSB0byBwYXNzIGl0IHVzaW5nIFJ4IGNvbWJpbmF0b3JzLlxuICAgICAgTy5qdXN0KGRhdGEpLFxuICAgICAgLy8gR2l0SHViIFwiY29tYmluZWQgc3RhdHVzXCIgZW5kcG9pbnQgaW5jbHVkZXMgYSBjb21iaW5lZCBzdGF0ZSByZWZsZWN0aW5nXG4gICAgICAvLyB0aGUgc3RhdGUgb2YgdGhlIGxhc3QgdW5pcXVlIHNldCBvZiBzdGF0dXNlcy4gZm9yIG5vdywgaXQgc2VlbXMgdG8gZG9cbiAgICAgIC8vIE1cbiAgICAgIC8vIGV4YWN0bHkgd2hhdCB3ZSB3YW50LlxuICAgICAgZ2l0aHViQ2xpZW50KFxuICAgICAgICAnZ2V0JyxcbiAgICAgICAgYC9yZXBvcy8ke2dpdGh1Yi5vcmd9LyR7ZGF0YS5yZXBvc2l0b3J5Lm5hbWV9L2NvbW1pdHMvJHtkYXRhLnNoYX0vYCArXG4gICAgICAgIGBzdGF0dXNgXG4gICAgICApLFxuICAgICAgLy8gJ2NvbnRlbnRzJyBlbmRwb2ludCByZXR1cm5zIGFycmF5IG9mIGZpbGVzIGluIHRoZSBjb21taXQgc25hcHNob3RcbiAgICAgIGdpdGh1YkNsaWVudC5mb3JSZXBvKGRhdGEucmVwb3NpdG9yeS5uYW1lKShcbiAgICAgICAgJ2NvbnRlbnRzJyxcbiAgICAgICAgJy8nLFxuICAgICAgICBkYXRhLnNoYVxuICAgICAgKSxcbiAgICAgIC8vIE8uZm9ya0pvaW4gdGFrZXMgYSBzZWxlY3RvciBmdW5jdGlvbiwgc28gd2UgY2FuIHR1cm4gcG9zaXRpb25hbCBhcmdzXG4gICAgICAvLyBpbnRvIG5hbWVkIHByb3BlcnRpZXMuXG4gICAgICAob3JpZ2luYWxTdGF0dXMsIGNvbWJpbmVkU3RhdHVzLCBjb250ZW50cykgPT5cbiAgICAgICAgKHsgb3JpZ2luYWxTdGF0dXMsIGNvbWJpbmVkU3RhdHVzLCBjb250ZW50cyB9KVxuICAgIClcbiAgKVxuICAuZmlsdGVyKFxuICAgIC8qKlxuICAgICAqIHdlIG9ubHkgY2FyZSBhYm91dCByZXBvc2l0b3JpZXMgd2l0aCBwYWNrYWdlLmpzb24gY3VycmVudGx5LCB0aG91Z2ggdGhpc1xuICAgICAqIG1heSBjaGFuZ2UgaW4gdGhlIGZ1dHVyZS5cbiAgICAgKlxuICAgICAqL1xuICAgICh7IGNvbnRlbnRzIH0pID0+IGNvbnRlbnRzLnNvbWUoKHsgcGF0aCB9KSA9PiBwYXRoID09PSAncGFja2FnZS5qc29uJylcbiAgKVxuICAuZmlsdGVyKFxuICAgIC8qKlxuICAgICAqIG1vcmUgaW1wb3J0YW50bHksIHdlIG9ubHkgd2FudCB0byBub3RpZnlcbiAgICAgKiBhYm91dCBwYWNrYWdlcyB3aG9zZSBsYXRlc3Qgc3VjY2VzcyBldmVudCByZXN1bHRzIGluIGEgY29tYmluZWRTdGF0dXNcbiAgICAgKiBvZiBcInN1Y2Nlc3NcIiwgbWVhbmluZyBpdCdzIHRoZSBsYXN0IGJ1aWxkIHNlcnZpY2UgdG8gc3VjY2VlZCBhbmQgdGhlXG4gICAgICogdGFnIGlzIHJlYWR5IG5vdy5cbiAgICAgKlxuICAgICAqL1xuICAgICh7IGNvbWJpbmVkU3RhdHVzIH0pID0+IGNvbWJpbmVkU3RhdHVzLnN0YXRlID09PSAnc3VjY2VzcydcbiAgKVxuICAuY29uY2F0TWFwKFxuICAgIC8qKlxuICAgICAqIG5vdywgd2Ugb25seSB3YW50IHRvIG5vdGlmeSBmb3Igc3VjY2Vzc2Z1bCBidWlsZHMgdGhhdCBhcmUgKnRhZ2dlZCouXG4gICAgICogaXQgaXMgdGhvc2UgYnVpbGRzIHRoYXQgYXJlIHJlbGVhc2UgY2FuZGlkYXRlcy4gYmVjYXVzZSBvZiB0aGUgbmF0dXJlXG4gICAgICogb2YgZ2l0IHBvaW50ZXJzLCB0aGUgY29tbWl0IGl0c2VsZiBkb2Vzbid0IGtub3cgaWYgaXQncyBhIHRhZywgc28gd2VcbiAgICAgKiBoYXZlIHRvIHF1ZXJ5IHRoZSB0YWdzIGVuZHBvaW50IHRvIGZpbmQgb3V0IGlmIHRoZXJlIGlzIG9uZSBmb3IgdGhpc1xuICAgICAqIGNvbW1pdC5cbiAgICAgKiBOQjogd2UgZG8gbm90IGN1cnJlbnRseSB1c2UgZ2l0aHViIHJlbGVhc2VzIGFuZCBtYXliZSB3ZSBzaG91bGRcbiAgICAgKlxuICAgICAqL1xuICAgICh7IG9yaWdpbmFsU3RhdHVzIH0pID0+IE8uZm9ya0pvaW4oXG4gICAgICBPLmp1c3Qob3JpZ2luYWxTdGF0dXMpLFxuICAgICAgZ2l0aHViQ2xpZW50LmZvclJlcG8ob3JpZ2luYWxTdGF0dXMucmVwb3NpdG9yeS5uYW1lKSgndGFncycpLFxuICAgICAgKG9yaWdpbmFsU3RhdHVzLCB0YWdzKSA9PlxuICAgICAgKHtcbiAgICAgICAgb3JpZ2luYWxTdGF0dXMsXG4gICAgICAgIC8vIGlmIHRoZXJlJ3MgYSB0YWcgd2hvc2UgY29tbWl0IG1hdGNoZXMgdGhlIHNoYSBvZiB0aGUgY3VycmVudCBidWlsZCxcbiAgICAgICAgLy8gYWRkIGl0IHRvIHRoZSBkYXRhIGJlaW5nIHBpcGVkIHRocm91Z2hcbiAgICAgICAgdGFnOiB0YWdzLmZpbmQoXG4gICAgICAgICAgKHsgY29tbWl0IH0pID0+IGNvbW1pdCAmJiBjb21taXQuc2hhID09PSBvcmlnaW5hbFN0YXR1cy5zaGFcbiAgICAgICAgKVxuICAgICAgfSlcbiAgICApXG4gIClcbiAgLmZpbHRlcihcbiAgICAvKipcbiAgICAgKlxuICAgICAqIG5vdywgZmlsdGVyIG9uIHRoZSBwcmVzZW5jZSBvZiBzdWNoIGEgdGFnLlxuICAgICAqIGFsc28sIHdlIG9ubHkgd2FudCB0YWdzIHRoYXQgYXJlIGFjdHVhbGx5IHNlbWFudGljIHZlcnNpb25zLiBvdGhlclxuICAgICAqIHRhZ3MgbWF5IGJlIGV4cGVyaW1lbnRzLCBhbmQgY2VydGFpbmx5IHdlIGNhbid0IHVzZSB0aGVtIHRvIGZpZ3VyZSBvdXRcbiAgICAgKiB3aGV0aGVyIHRoZSB2ZXJzaW9uIGhhcyBpbmNyZW1lbnRlZC5cbiAgICAgKlxuICAgICAqL1xuICAgICh7IHRhZyB9KSA9PiB0YWcgJiYgc2VtdmVyLmNsZWFuKHRhZy5uYW1lKVxuICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UGFja2FnZVN0YXR1cyh7XG4gIHBhY2thZ2VOYW1lLFxuICBicmFuY2gsXG4gIGdpdGh1YkNsaWVudCxcbiAgZ2l0aHViLFxuICBucG1DbGllbnQsXG4gIGNpUHJvdmlkZXJzXG59KSB7XG4gIGxldCBnZXRSZXBvRGF0YSA9IGdpdGh1YkNsaWVudC5mb3JSZXBvKHBhY2thZ2VOYW1lKTtcbiAgLyoqXG4gICAqIGZpcnN0LCBmaW5kIG91dCBpZiB0aGUgcmVwbyBleGlzdHMgYW5kIGhhcyBhbnkgdGFncyBhdCBhbGwsIGJlZm9yZSBydW5uaW5nXG4gICAqIGFueSBtb3JlIGNhbGxzIHRvIHRoZSBBUEkuIHNpbmNlIHRoaXMgcmVxdWVzdCBjYW1lIGV4dGVybmFsbHksIHdlIGRvbid0XG4gICAqIGtub3cgaXQncyBmb3IgYSByZWFsIHBhY2thZ2UuXG4gICAqXG4gICAqKi9cbiAgcmV0dXJuIGdldFJlcG9EYXRhKCd0YWdzJylcbiAgLmNvbmNhdE1hcChcbiAgICAvKipcbiAgICAgKiBub3cgdGhhdCB3ZSBrbm93IHRhZ3MgZXhpc3QsIHdlIGNhbiBydW4gdGhlIG90aGVyIGNhbGxzLiBqb2luIHRoZSB0YWdzXG4gICAgICogbGlzdCB3aXRoIHBhY2thZ2UgY29udGVudHMsIHNvIHdlIGNhbiBjaGVjayBmb3IgcGFja2FnZS5qc29uLFxuICAgICAqIGFuZCBucG0gc3RhdHVzLCBzbyB3ZSBjYW4gY29tcGFyZSB3aXRoIHRoZSBwYWNrYWdlJ3Mgc3RhdHVzIHRoZXJlLlxuICAgICAqIHRoaXMgaW5jbHVkZXMgY29tbWl0cyB0b28sIHRob3VnaCB0aGV5IGFyZW4ndCB1c2VkIGhlcmUsIGJlY2F1c2VcbiAgICAgKiB0aGUgZm9ybWF0dGVycyBleHBlY3QgYSBsaXN0IG9mIGNvbW1pdHMgYXMgd2VsbC5cbiAgICAgKlxuICAgICAqKi9cbiAgICAodGFncykgPT4gTy5mb3JrSm9pbihcbiAgICAgIE8uanVzdCh0YWdzKSxcbiAgICAgIGdldFJlcG9EYXRhKCdjb250ZW50cycsICcvJywgYnJhbmNoKSxcbiAgICAgIGdldFJlcG9EYXRhKCdjb21taXRzJywgYnJhbmNoKSxcbiAgICAgIG5wbUNsaWVudC5nZXRTdGF0dXMocGFja2FnZU5hbWUpLFxuICAgICAgLy8gb25jZSBhZ2FpbiwgdHVybiBwb3NpdGlvbmFsIGFyZ3VtZW50cyBpbnRvIG5hbWVkIGFyZ3VtZW50c1xuICAgICAgKHRhZ3MsIGNvbnRlbnRzLCBjb21taXRzLCBucG1JbmZvKSA9PlxuICAgICAgICAoeyB0YWdzLCBjb250ZW50cywgY29tbWl0cywgbnBtSW5mbyB9KVxuICAgIClcbiAgKS5jb25jYXRNYXAoXG4gICAgLy8gam9pbiBkYXRhIHRvIG91dHB1dCBvZiBvdGhlciBvYnNlcnZhYmxlc1xuICAgIChkYXRhKSA9PiBPLmZvcmtKb2luKFxuICAgICAgLy8gY3JlYXRlIG9ic2VydmFibGUgZnJvbSByZWFsaXplZCB2YWx1ZSBzbyBpdCBjYW4gYmUgcGFzc2VkXG4gICAgICBPLmp1c3QoZGF0YSksXG4gICAgICAvKipcbiAgICAgICAqIFRoZSBiZWxvdyBgTy5mb3JgIHR1cm5zIHRoZSAndGFncycgYXJyYXkgaW50byBhbiBvYnNlcnZhYmxlIHNlcXVlbmNlXG4gICAgICAgKiBvZiByZXF1ZXN0cyBmb3IgdGhlIGNvbWJpbmVkIHN0YXR1cyBvbiBlYWNoIHRhZywgdGhlbiBmbGF0dGVucyB0aGVcbiAgICAgICAqIHJlc3VsdHMsIHlpZWxkaW5nIGFuIG9ic2VydmFibGUgc2VxdWVuY2Ugb2YgY29tYmluZWQgc3RhdHVzZXMgZm9yIGVhY2hcbiAgICAgICAqIHRhZy5cbiAgICAgICAqXG4gICAgICAgKiovXG4gICAgICBPLmZvcihcbiAgICAgICAgZGF0YS50YWdzLFxuICAgICAgICAvLyBhZ2FpbiwgcGFzcyB0aGUgdGFnIGFsb25nLCB3ZSBkb24ndCB3YW50IHRvIHR1cm4gaXQgaW50byBzdGF0dXMgYnV0XG4gICAgICAgIC8vIGFkZCBhIHN0YXR1cyB0byBvdXIgY29tYmluZWQgcGF5bG9hZFxuICAgICAgICAodCkgPT4gTy5mb3JrSm9pbihcbiAgICAgICAgICBPLmp1c3QodCksXG4gICAgICAgICAgZ2l0aHViQ2xpZW50KFxuICAgICAgICAgICAgJ2dldCcsXG4gICAgICAgICAgICBgL3JlcG9zLyR7Z2l0aHViLm9yZ30vJHtwYWNrYWdlTmFtZX0vY29tbWl0cy8ke3QubmFtZX0vc3RhdHVzYFxuICAgICAgICAgICksXG4gICAgICAgICAgKHRhZywgc3RhdHVzKSA9PiAoeyB0YWcsIHN0YXR1cyB9KVxuICAgICAgICApXG4gICAgICApLmZpbmQoXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBhbmQgdGhlIGFib3ZlIGBmaW5kYCBvcGVyYXRvciB3aWxsIHRyYXZlcnNlIGFuIG9ic2VydmFibGUgc2VxdWVuY2VcbiAgICAgICAgICogdW50aWwgaXQgZmluZHMgYW4gZW1pdHRlZCB2YWx1ZSB0aGF0IHNhdGlzZmllcyBhIGNvbmRpdGlvbi4gaW4gdGhpc1xuICAgICAgICAgKiBjYXNlIHRoZSBjb25kaXRpb24gaXMgdGhhdCB0aGUgdGFnL3N0YXR1cyB0dXBsZSBtdXN0IGhhdmUgYSBzdGF0dXNcbiAgICAgICAgICogd2l0aCBhIGBzdGF0ZWAgb2YgXCJzdWNjZXNzXCIuXG4gICAgICAgICAqXG4gICAgICAgICAqKi9cbiAgICAgICAgKHsgc3RhdHVzIH0pID0+IHN0YXR1cy5zdGF0ZSA9PT0gJ3N1Y2Nlc3MnXG4gICAgICApLmRlZmF1bHRJZkVtcHR5KHsgdGFnOiBudWxsIH0pLFxuICAgICAgLy8gaWYgYSB0YWcgZXhpc3RzLCB3ZSdsbCBhZGQgaXQgYXMgYGxhdGVzdEdvb2RUYWdgIHRvIHRoZSBjb21iaW5lZFxuICAgICAgLy8gcGF5bG9hZC4gaWYgaXQgZG9lc24ndCBleGlzdCwgdGhpcyB3aWxsIGFsbCBmYWxsIHRocm91Z2ggdG8gdGhlIGVycm9yXG4gICAgICAvLyBvcGVyYXRvci5cbiAgICAgIChkYXRhLCB7IHRhZyB9KSA9PiAoeyBsYXRlc3RHb29kVGFnOiB0YWcsIC4uLmRhdGEgfSlcbiAgICApXG4gICkubWFwKFxuICAgIC8qKlxuICAgICAqIGFkZCBhIGxpc3Qgb2YgQ0kgcHJvdmlkZXJzIGJhc2VkIG9uIHRoZSBgY29udGVudHNgIGFycmF5LCBmb3IgZGlzcGxheS5cbiAgICAgKiBkZXRlcm1pbmUgd2hldGhlciBDSSBpcyBjb25maWd1cmVkIGJ5IHRoZSBwcmVzZW5jZSBvZiBpdHMgY29uZmlndXJhdGlvblxuICAgICAqIGZpbGUgaW4gdGhlIHJlcG8gcm9vdC5cbiAgICAgKiovXG4gICAgKGRhdGEpID0+ICh7XG4gICAgICBjaVByb3ZpZGVyc0NvbmZpZ3VyZWQ6IGNpUHJvdmlkZXJzLmZpbHRlcihcbiAgICAgICAgKHsgY29uZmlnRmlsZSB9KSA9PlxuICAgICAgICAgIGRhdGEuY29udGVudHMuc29tZSgoeyBwYXRoIH0pID0+IHBhdGggPT09IGNvbmZpZ0ZpbGUpXG4gICAgICApLFxuICAgICAgLi4uZGF0YVxuICAgIH0pXG4gICk7XG59XG4iXX0=
import semver from 'semver';
import { Observable as O } from 'rx';

export function filterForBuildSuccess({
  events$,
  logger,
  githubClient,
  github
}) {
  return events$.filter(
    /**
     * first, filter for status events, in case the webhook is subscribed to
     * more than just status events. at the same time, we can filter for
     * success events.
     *
     */
    ({ event, data }) => event === 'status' && data.state === 'success'
  )
  .do(
    /**
     * tap for logging. the `do` operator is a 'tap' operator that does not
     * modify the stream.
     *
     */
    ({ data }) => logger.info('Received success notification', data)
  )
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
    ({ data }) => O.forkJoin(
      // O.just turns a realized value back into an observable again, so we
      // can continue to pass it using Rx combinators.
      O.just(data),
      // GitHub "combined status" endpoint includes a combined state reflecting
      // the state of the last unique set of statuses. for now, it seems to do
      // M
      // exactly what we want.
      githubClient(
        'get',
        `/repos/${github.org}/${data.repository.name}/commits/${data.sha}/` +
        `status`
      ),
      // 'contents' endpoint returns array of files in the commit snapshot
      githubClient.forRepo(data.repository.name)(
        'contents',
        '/',
        data.sha
      ),
      // O.forkJoin takes a selector function, so we can turn positional args
      // into named properties.
      ({ repository, sha }, combinedStatus, contents) =>
        ({ repository, sha, combinedStatus, contents })
    )
  )
  .filter(
    /**
     * we only care about repositories with package.json currently, though this
     * may change in the future.
     *
     */
    ({ contents }) => contents.some(({ path }) => path === 'package.json')
  )
  .filter(
    /**
     * more importantly, we only want to notify
     * about packages whose latest success event results in a combinedStatus
     * of "success", meaning it's the last build service to succeed and the
     * tag is ready now.
     *
     */
    ({ combinedStatus }) => combinedStatus.state === 'success'
  )
  .concatMap(
    /**
     * now, we only want to notify for successful builds that are *tagged*.
     * it is those builds that are release candidates. because of the nature
     * of git pointers, the commit itself doesn't know if it's a tag, so we
     * have to query the tags endpoint to find out if there is one for this
     * commit.
     * NB: we do not currently use github releases and maybe we should
     *
     */
    ({ repository, sha }) => O.forkJoin(
      O.just({ repository, sha }),
      githubClient.forRepo(repository.name)('tags'),
      ({ repository, sha }, tags) =>
      ({
        repository,
        sha,
        // if there's a tag whose commit matches the sha of the current build,
        // add it to the data being piped through
        tag: tags.find(({ commit }) => commit && commit.sha === sha)
      })
    )
  )
  .filter(
    /**
     *
     * now, filter on the presence of such a tag.
     * also, we only want tags that are actually semantic versions. other
     * tags may be experiments, and certainly we can't use them to figure out
     * whether the version has incremented.
     *
     */
    ({ tag }) => tag && semver.clean(tag.name)
  );
}

export function getPackageStatus({
  packageName,
  branch,
  githubClient,
  github,
  npmClient,
  ciProviders
}) {
  let getRepoData = githubClient.forRepo(packageName);
  /**
   * first, find out if the repo exists and has any tags at all, before running
   * any more calls to the API. since this request came externally, we don't
   * know it's for a real package.
   *
   **/
  return getRepoData('tags')
  .concatMap(
    /**
     * now that we know tags exist, we can run the other calls. join the tags
     * list with package contents, so we can check for package.json,
     * and npm status, so we can compare with the package's status there.
     * this includes commits too, though they aren't used here, because
     * the formatters expect a list of commits as well.
     *
     **/
    (tags) => O.forkJoin(
      O.just(tags),
      getRepoData('contents', '/', branch),
      getRepoData('commits', branch),
      npmClient.getStatus(packageName),
      // once again, turn positional arguments into named arguments
      (tags, contents, commits, npmInfo) =>
        ({ tags, contents, commits, npmInfo })
    )
  ).concatMap(
    // join data to output of other observables
    (data) => O.forkJoin(
      // create observable from realized value so it can be passed
      O.just(data),
      /**
       * The below `O.for` turns the 'tags' array into an observable sequence
       * of requests for the combined status on each tag, then flattens the
       * results, yielding an observable sequence of combined statuses for each
       * tag.
       *
       **/
      O.for(
        data.tags,
        // again, pass the tag along, we don't want to turn it into status but
        // add a status to our combined payload
        (t) => O.forkJoin(
          O.just(t),
          githubClient(
            'get',
            `/repos/${github.org}/${packageName}/commits/${t.name}/status`
          ),
          (tag, status) => ({ tag, status })
        )
      ).find(
        /**
         * and the above `find` operator will traverse an observable sequence
         * until it finds an emitted value that satisfies a condition. in this
         * case the condition is that the tag/status tuple must have a status
         * with a `state` of "success".
         *
         **/
        ({ status }) => status.state === 'success'
      ),
      // if a tag exists, we'll add it as `latestGoodTag` to the combined
      // payload. if it doesn't exist, this will all fall through to the error
      // operator.
      (data, { tag }) => ({ latestGoodTag: tag, ...data })
    )
  ).map(
    /**
     * add a list of CI providers based on the `contents` array, for display.
     * determine whether CI is configured by the presence of its configuration
     * file in the repo root.
     **/
    (data) => ({
      ciProvidersConfigured: ciProviders.filter(
        ({ configFile }) =>
          data.contents.some(({ path }) => path === configFile)
      ),
      ...data
    })
  );
}

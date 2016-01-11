
export function allCiSucceeded({ repository, sha, statuses, contents }) {
  let successes = statuses.filter(({ state }) => state === 'success');
  return conf.ciProviders.every(
    ({ name, configFile, statusContext }) => {
      let isConfigured = contents.some(({ path }) => path === configFile);
      let successFound = !isConfigured ||
        successes.find(({ context }) => context === statusContext);
      if (isConfigured && successFound) {
        logger.notice(
          `${name} build success for ${repository.name}#${sha}, triggered by`,
          successFound
        );
      }
      return !!successFound;
    }
  )
}

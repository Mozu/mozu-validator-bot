import { Observable } from 'rx';
import octonode from 'octonode';

export default function GithubClient({ logger, githubToken, githubOrg }) {
  const github = octonode.client(githubToken);
  const getClient = (repo) => {
    let path = `${githubOrg}/${repo}`;
    let repoClient = github.repo(path);
    let methods = {};
    return (method, ...args) => {
      logger.log('info', `calling github api method '${method} for ${path}`);
      methods[method] = methods[method] || Observable.fromNodeCallback(
        repoClient[method],
        repoClient,
        (data) => data
      );
      return methods[method](...args);
    };
  };
  return {
    fullCommitStatus(repo, sha) {
      logger.info(
        `getting full commit status for ${repo}#${sha}`
      );
      let retrieve = getClient(repo);
      return Observable.forkJoin(
        retrieve('statuses', sha),
        retrieve('contents', '/', sha),
        (statuses, contents) => ({ statuses, contents })
      );
    },
    latestCommitStatus(repo, branch = 'master') {
      logger.info(
        `getting latest commit status for ${repo}`
      );
      let retrieve = getClient(repo);
      return Observable.forkJoin(
        retrieve('statuses', branch),
        retrieve('contents', '/', branch),
        retrieve('tags'),
        retrieve('commits'),
        (statuses, contents, tags, commits) =>
          ({ statuses, contents, tags, commits })
      );
    },
    tags(repo) {
      return getClient(repo)('tags');
    }
  }
}

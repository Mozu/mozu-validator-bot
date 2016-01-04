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
    repoStatus(repo) {
      let retrieve = getClient(repo);
      return retrieve('statuses', 'master');
    },
    repoInfo(repo) {
      let retrieve = getClient(repo);
      return Observable.forkJoin(
        retrieve('contents', '/', 'master'),
        retrieve('tags'),
        retrieve('commit', 'HEAD'),
        (contents, tags, head) => ({ contents, tags, head })
      );
    }
  }
}

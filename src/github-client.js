import { Observable } from 'rx';
import octonode from 'octonode';

export default function GithubClient({ logger, githubToken, githubOrg }) {
  const github = octonode.client(githubToken);
  return {
    forRepo: (repo) => {
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
    }
  };
}

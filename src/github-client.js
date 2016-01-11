import { Observable } from 'rx';
import octonode from 'octonode';

function createMethodMemoizer(logger, instance) {
  let methods = {};
  return function(method, ...args) {
    methods[method] = methods[method] || Observable.fromNodeCallback(
      instance[method],
      instance,
      (maybeStatus, data) =>
        typeof maybeStatus === 'number' ? data : maybeStatus
    );
    if (method === 'get' || method === 'post') {
      logger.info(`calling github ${method.toUpperCase()} ${args[0]}`);
    } else {
      logger.info(`calling github method '${method}'`);
    }
    return methods[method](...args);
  };
}

export default function GithubClient({ logger, github }) {
  const client = octonode.client(github.token);
  let runMethod = createMethodMemoizer(logger, client);
  runMethod.forRepo = (repo) =>
    createMethodMemoizer(logger, client.repo(`${github.org}/${repo}`));
  return runMethod;
}

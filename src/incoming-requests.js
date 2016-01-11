import express from 'express';
import { Observable, Subject } from 'rx';
import { text } from 'body-parser';
import { createHmac } from 'crypto';
import publicIp from 'public-ip';
export default function({ logger, web, githubClient, github }) {
  const { port, hostname, protocol, hookPath, checkPath, hookSecret } = web;
  logger.info(
    `github hook listener starting at localhost:${port}${hookPath}`,
    `check listener starting at localhost:${port}${checkPath}`
  );
  const app = express();
  const githubHooks = new Subject();
  const checkRequests = new Subject();
  app.use(text({ type: '*/*' }));
  app.get('/', (req, res, next) => res.send('I\'m listening.'));
  app.post(hookPath, (req, res, next) => {
    let hmac = createHmac('sha1', hookSecret);
    hmac.update(req.body);
    let sig = req.get('X-Hub-Signature');
    let valid = sig && hmac.digest('hex') === sig.slice(sig.indexOf('=')+1);
    logger[valid ? 'notice' : 'warning'](
      valid ? 'Received valid webhook.' :
          'Webhook request did not validate with secure signature.',
          sig
    );
    res.status(200).send('Thanks! Bathe in slack.');
    if (valid) {
      githubHooks.onNext({
        req,
        event: req.get('X-GitHub-Event'),
        data: JSON.parse(req.body)
      });
    }
  });
  app.get(checkPath, (req, res, next) => {
    checkRequests.onNext({
      reply: (status, response) => res.status(status).json(response),
      ...req.query
    });
  })

  let server = app.listen(port, ensureHookExistsForHost);

  return { server, githubHooks, checkRequests };

  function getOrCreateHook(host) {
    const url = `${protocol}//${host}:${port}${hookPath}` ;
    return githubClient('get', `/orgs/${github.org}/hooks`)
    .concatMap((hooks) => {
      const ourHook = hooks.find(({ name, events, config, active }) =>
        active &&
        name === 'web' &&
        (~events.indexOf('status') || ~events.indexOf('*')) &&
        config.url === url &&
        config.content_type === 'json'
      );
      if (ourHook) {
        logger.info('Webhook already exists');
        return Observable.just(ourHook);
      } else {
        logger.notice('Webhook does not exist. Attempting to create...');
        return githubClient(
          'post',
          `/orgs/${github.org}/hooks`,
          {
            name: 'web',
            events: ['status'],
            config: { url, content_type: 'json', secret: hookSecret },
            active: true
          }
        );
      }
    });
  }

  function getHost() {
    return web.hostname ? Observable.just(web.hostname) :
      Observable.fromNodeCallback(
        publicIp.v4, publicIp
      )()
  }

  function ensureHookExistsForHost() {
    getHost().concatMap(getOrCreateHook).subscribe(
      ({ url, events, config }) => logger.notice(
        `Webhook ${url} is set up to post ${events} events to ${config.url}`
      ),
      logger.error
    );
  }
};

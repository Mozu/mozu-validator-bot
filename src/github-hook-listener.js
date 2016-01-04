import express from 'express';
import { Subject } from 'rx';
import { text } from 'body-parser';
import { createHmac } from 'crypto';
export default function({ logger, port, hookPath, hookSecret }) {
  logger.info(
    `github hook listener starting at localhost:${port}${hookPath}`
  );
  const app = express();
  const incoming = new Subject();
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
      incoming.onNext({
        req,
        event: req.get('X-GitHub-Event'),
        data: JSON.parse(req.body)
      });
    }
  });
  let server = app.listen(port);
  return { server, incoming };
};

const logger = require('bristol');
export default function Logger(conf) {
  let severities = [
    'emergency',
    'alert',
    'critical',
    'error',
    'warning',
    'notice',
    'info',
    'debug'
  ];
  logger.setSeverities(severities);
  logger.addTarget('console')
  .withFormatter(conf.logFormat || 'commonInfoModel')
  .withLowestSeverity(severities[conf.logLevel]);
  return logger;
}

import getSubgeniusQuotes from './subgenius-quotes';
export default function frivolity(conf, logger, bot) {
  let triggers = [
    'hi', 'hello', 'say something', 'sup', 'wie gehts', 'bonjour',
    'salut', 'hey', 'how\'s it going'
  ].map((x) => `^${x}\\b`);
  bot.hears(triggers,['mention','direct_mention'], (bot, msg) =>
    getSubgeniusQuotes(logger).then((subgeniusQuotes) => bot.reply(msg, {
      icon_url: conf.botIcon,
      text: subgeniusQuotes[Math.floor(Math.random()*subgeniusQuotes.length)],
      username: conf.botName
    }))
    .catch(logger.error)
  );
  return bot;
}

import subgeniusQuotes from './subgenius-quotes';
export default function frivolity(conf, bot) {
  bot.hears(['^hi\\b','^hello\\b'],['mention','direct_mention'], (bot, msg) =>
    bot.reply(msg, {
      icon_url: conf.botIcon,
      text: subgeniusQuotes[Math.floor(Math.random()*subgeniusQuotes.length)],
      username: conf.botName
    })
  );
  return bot;
}

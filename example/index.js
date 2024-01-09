const Secrets = require('./secrets.json')
const BasicDiscordBot = require('../index.js')

BasicDiscordBot.connect({
  BOT_TOKEN: Secrets.BOT_TOKEN,
  APPLICATION_ID: Secrets.APPLICATION_ID,
  intents: ['MessageContent'],
  commands: [{
    "name": "ping",
    "description": "Ping the bot."
  }]
}).then((Bot) => {

  Bot.on('ready', () => {
    console.log('Bot is connected and ready.')
  })

})

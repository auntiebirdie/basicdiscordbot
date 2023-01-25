const {
  Client,
  GatewayIntentBits,
  InteractionType
} = require('discord.js');

module.exports = (options) => {
  if (process.argv.includes('refresh')) {
    console.log('Refreshing application commands...\r\n');

    const promises = [];

    // Global commands
    // NOTE: global commands can take several minutes for changes to propagate through Discord's systems
    promises.push(refreshCommands(options));

    // Guild-specific commands
    // Get list of unique guild IDs, filtering out false/null values and flattening array values
    const guilds = [...new Set(options.commands.filter((command) => command.guild).map((command) => command.guild).flat())];

    for (let guild of guilds) {
      promises.push(refreshCommands(options, guild));
    }

    Promise.all(promises).then(() => {
      console.log('\r\nApplication commands refreshed successfully.');
      process.exit(0);
    }).catch((err) => {
      console.log(err);
      process.exit(0);
    });
  } else {
    // Default non-privileged intents
    const intents = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages];

    // If extra intents are defined
    if (options.intents) {
      for (let intent of options.intents) {
        // Make sure the requested intent exists
        if (GatewayIntentBits[intent]) {
          intents.push(GatewayIntentBits[intent]);
        } else {
          console.log(`Could not find the '${intent}' Gateway Intent`);
        }
      }
    }

    // No partials are enabled by default
    const partials = [];

    // If partials are defined
    if (options.partials) {
      for (let partial of options.partials) {
        // Make sure the requested partial exists
        if (Partials[partial]) {
          partials.push(Partials[partial])
        } else {
          console.log(`Could not find the '${partial}' Partial`);
        }
      }
    }

    // Build the Discord Client
    const client = new Client({
      intents: [intents],
      partials: [partials]
    });

    // Log in!
    client.login(options.BOT_TOKEN);

    // If an interaction is created (e.g., invoking a slash command)
    client.on('interactionCreate', async (interaction) => {
      // If the interaction is a button press or modal submit
      if (interaction.type == InteractionType.MessageComponent || interaction.type == InteractionType.ModalSubmit) {
        let tmp = interaction.customId.split('-');

        tmp = tmp[0].split('_');
        interaction.commandName = tmp.shift();
        interaction.customId = tmp.join('_');
      }

      try {
        require(`${process.cwd()}/interactions/${interaction.commandName}.js`)(interaction);
      } catch (err) {
        interaction.reply({
          content: err.toString(),
          ephemeral: true
        });
      }
    });

    // If a trigger is defined
    if (options.trigger) {
      client.on('messageCreate', async (message) => {
        // If the message wasn't sent by the bot itself
        if (message.author.id != client.user.id) {
          // If the trigger event has happened (mentioning the bot or using a specific trigger character)
          if ((options.trigger == `<@${client.user.id}>` && message.mentions.users.get(client.user.id)) || message.content.startsWith(options.trigger)) {
            for (let trigger in options.triggers) {
              let regex = options.triggers[trigger];

              if (regex.test(message.content)) {
                try {
                  require(`${process.cwd()}/triggers/${trigger}.js`)(message);
                } catch (err) {
                  console.log(err);
                }
                break;
              }
            }
          }
        }
      });
    }

    return client;
  }
}

function refreshCommands(options, guild) {
  return new Promise((resolve, reject) => {
    const https = require('https');

    const requestOptions = {
      method: 'PUT',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bot ${options.BOT_TOKEN}`
      }
    }

    const request = https.request(`https://discord.com/api/v10/applications/${options.APPLICATION_ID}/${guild ? `guilds/${guild}/` : ''}commands`, requestOptions, (response) => {
      var output = "";

      response.on('data', (d) => {
        output += d;
      });

      response.on('end', () => {
        try {
          output = JSON.parse(output);

          if (output.message) {
            console.log(`- ERROR while updating ${guild ? `guild ${guild}` : 'global'} ("${output.message}")`);

            // If there is any error, let's stop right here
            process.exit(0);
          } else {
            console.log(`- Updated ${output.length} ${guild ? `guild ${guild}` : 'global'} commands`);
          }
        } catch (err) {
          console.log(output);
        }
        resolve();
      });
    });

    request.on('error', (e) => {
      console.log(e);
    });

    request.write(JSON.stringify(options.commands.filter((command) => guild ? (command.guild == guild || command.guild.includes(guild)) : !command.guild)));

    request.end();
  });
}

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const db = require('./src/database');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'src', 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  // Check every 30s for matches whose reminder time has arrived
  setInterval(() => checkReminders(client), 30000);
});

async function checkReminders(client) {
  try {
    const database = db.load();
    const now = Date.now();
    let changed = false;

    for (const t of Object.values(database.tournaments)) {
      if (!t.channelId) continue;
      for (const round of t.rounds || []) {
        for (const m of round.matches) {
          if (m.remindAt && !m.reminded && m.status !== 'completed' && now >= m.remindAt) {
            try {
              const channel = await client.channels.fetch(t.channelId);
              const mentions = [m.runner, ...m.hunters].map(id => `<@${id}>`).join(' ');
              await channel.send(`⏰ Reminder: match **${m.matchId}** starting now! 🏃 <@${m.runner}> vs 🏹 ${m.hunters.map(h => `<@${h}>`).join(', ')}\n${mentions}`);
            } catch (err) {
              console.error('Reminder send failed:', err.message);
            }
            m.reminded = true;
            changed = true;
          }
        }
      }
    }

    if (changed) db.save(database);
  } catch (err) {
    console.error('Reminder check failed:', err);
  }
}

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(err);
    const reply = { content: '❌ Kuch error aa gaya command run karte waqt.', ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(reply);
    else await interaction.reply(reply);
  }
});

client.login(process.env.DISCORD_TOKEN);

const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the Manhunt leaderboard'),

  async execute(interaction) {
    const database = db.load();
    const entries = Object.entries(database.players)
      .sort((a, b) => b[1].wins - a[1].wins)
      .slice(0, 10);

    if (entries.length === 0) {
      return interaction.reply('Abhi koi results record nahi hue hain.');
    }

    const lines = entries.map(([uid, p], idx) =>
      `${idx + 1}. **${p.username}** — 🏆 ${p.wins}W / ${p.losses}L (${p.matchesPlayed} matches)`
    );
    return interaction.reply(`🏆 **Manhunt Leaderboard**\n\n${lines.join('\n')}`);
  }
};

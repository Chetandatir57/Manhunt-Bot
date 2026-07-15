const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Show your (or someone else\'s) Manhunt stats')
    .addUserOption(o => o.setName('player').setDescription('Player to look up').setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('player') || interaction.user;
    const database = db.load();
    const p = database.players[target.id];

    if (!p) {
      return interaction.reply({ content: `${target.username} ne abhi tak koi match nahi khela / register nahi kiya.`, ephemeral: true });
    }

    const winRate = p.matchesPlayed > 0 ? ((p.wins / p.matchesPlayed) * 100).toFixed(1) : '0.0';
    return interaction.reply(
      `📊 **${p.username}**\n🏆 Wins: ${p.wins}\n💀 Losses: ${p.losses}\n🎮 Matches: ${p.matchesPlayed}\n📈 Win rate: ${winRate}%`
    );
  }
};

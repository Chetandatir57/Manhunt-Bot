const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Admin utility commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sc => sc.setName('reset').setDescription('Clear the active tournament (does not delete player stats)'))
    .addSubcommand(sc => sc.setName('remove-player').setDescription('Remove a player from the active tournament pool')
      .addUserOption(o => o.setName('player').setDescription('Player to remove').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const database = db.load();

    if (sub === 'reset') {
      if (!database.activeTournamentId) {
        return interaction.reply({ content: '❌ Koi active tournament nahi hai.', ephemeral: true });
      }
      const t = database.tournaments[database.activeTournamentId];
      t.status = 'cancelled';
      database.activeTournamentId = null;
      db.save(database);
      return interaction.reply(`🗑️ Active tournament **${t.name}** clear kar diya. Player stats/leaderboard safe hai. Naya tournament \`/tournament create\` se banao.`);
    }

    if (sub === 'remove-player') {
      const t = db.getActiveTournament(database);
      if (!t) return interaction.reply({ content: '❌ Koi active tournament nahi hai.', ephemeral: true });
      const user = interaction.options.getUser('player');
      const before = t.pool.length;
      t.pool = t.pool.filter(id => id !== user.id);
      db.save(database);
      if (t.pool.length === before) {
        return interaction.reply({ content: `${user.username} tournament pool me nahi tha.`, ephemeral: true });
      }
      return interaction.reply(`✅ **${user.username}** ko **${t.name}** se remove kar diya.`);
    }
  }
};

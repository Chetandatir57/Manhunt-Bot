const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Register yourself for Manhunt tournaments'),

  async execute(interaction) {
    const database = db.load();
    db.ensurePlayer(database, interaction.user.id, interaction.user.username);
    db.save(database);

    const roleName = process.env.MANHUNT_ROLE_NAME || 'Manhunt Player';
    const role = interaction.guild.roles.cache.find(r => r.name === roleName);

    if (role) {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role);
      }
      await interaction.reply({
        content: `✅ Registered! **${roleName}** role assigned. Ab \`/tournament join\` use karke active tournament join karo.`,
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: `✅ Registered in database, lekin "${roleName}" role server me nahi mila — admin se check karwao.`,
        ephemeral: true
      });
    }
  }
};

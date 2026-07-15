const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available bot commands'),

  async execute(interaction) {
    const message =
      `📖 **Manhunt Tournament Bot — Commands**\n\n` +
      `**Player Commands**\n` +
      `\`/register\` — Get the Manhunt Player role + join the database\n` +
      `\`/tournament join\` — Join the active tournament's player pool\n` +
      `\`/tournament matches\` — List current round's matches + status\n` +
      `\`/tournament standings\` — See who's still in the running\n` +
      `\`/status\` — Point table, match counts, bracket, today's & upcoming matches\n` +
      `\`/stats [player]\` — Win/loss record and win rate\n` +
      `\`/leaderboard\` — Top 10 players by wins\n` +
      `\`/help\` — Show this message\n\n` +
      `**Admin Commands** _(Manage Server permission required)_\n` +
      `\`/tournament create name:<x> hunters:<n>\` — Create a new tournament\n` +
      `\`/tournament start\` — Randomly generate Round 1 matches\n` +
      `\`/tournament next-round\` — Advance winners into a fresh round\n` +
      `\`/tournament add-match runner:<user> hunter1:<user> [hunter2-5] [time] [remind_in_minutes] [voice_channel]\` — Manually add a match\n` +
      `\`/tournament delete-match match_id:<x>\` — Remove a match\n` +
      `\`/tournament result match_id:<x> winner:<runner|hunters>\` — Record a match result\n` +
      `\`/tournament schedule match_id:<x> time:<x> [remind_in_minutes] [voice_channel]\` — Set match time/VC/reminder\n` +
      `\`/admin reset\` — Clear the active tournament (keeps player stats)\n` +
      `\`/admin remove-player player:<x>\` — Remove someone from the tournament pool`;

    return interaction.reply({ content: message, ephemeral: true });
  }
};
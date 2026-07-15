const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');

function allMatches(t) {
  const matches = [];
  for (const round of t.rounds || []) {
    for (const m of round.matches) matches.push({ ...m, roundNumber: round.roundNumber });
  }
  return matches;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Show the tournament point table, match counts, and upcoming matches'),

  async execute(interaction) {
    const database = db.load();
    const t = db.getActiveTournament(database);

    if (!t) {
      return interaction.reply({ content: '❌ Koi active tournament nahi hai.', ephemeral: true });
    }

    const matches = allMatches(t);
    const totalMatches = matches.length;
    const completed = matches.filter(m => m.status === 'completed').length;
    const pending = totalMatches - completed;

    // Point table — points based on overall player stats (wins = points)
    const involvedIds = new Set();
    matches.forEach(m => { involvedIds.add(m.runner); m.hunters.forEach(h => involvedIds.add(h)); });
    t.pool.forEach(id => involvedIds.add(id));

    const pointRows = [...involvedIds]
      .map(id => {
        const p = database.players[id] || { username: id, wins: 0, losses: 0, matchesPlayed: 0 };
        return { id, username: p.username, points: p.wins, losses: p.losses, played: p.matchesPlayed };
      })
      .sort((a, b) => b.points - a.points);

    let pointTable = '```\n#   Player               Pts  W-L  Played\n';
    pointRows.forEach((r, i) => {
      const rank = String(i + 1).padEnd(3);
      const name = r.username.slice(0, 18).padEnd(21);
      const pts = String(r.points).padEnd(4);
      const wl = `${r.points}-${r.losses}`.padEnd(4);
      const played = String(r.played);
      pointTable += `${rank} ${name}${pts} ${wl} ${played}\n`;
    });
    pointTable += '```';
    if (pointRows.length === 0) pointTable = '_Abhi tak koi player registered nahi hai._';

    // Upcoming (not completed) matches, soonest scheduled first, max 3
    const upcoming = matches
      .filter(m => m.status !== 'completed')
      .sort((a, b) => (a.remindAt || Infinity) - (b.remindAt || Infinity))
      .slice(0, 3);

    let upcomingText = upcoming.map(m => {
      const timeLabel = m.scheduledTime ? ` — 🕒 ${m.scheduledTime}` : ' — ⏳ Not scheduled';
      return `**${m.matchId}** (Round ${m.roundNumber}) — 🏃 <@${m.runner}> vs 🏹 ${m.hunters.map(h => `<@${h}>`).join(', ')}${timeLabel}`;
    }).join('\n');
    if (upcoming.length === 0) upcomingText = '_Koi upcoming match nahi hai._';

    const summary =
      `📊 **${t.name}** — Status\n\n` +
      `🎮 Total matches: **${totalMatches}** (✅ ${completed} completed, ⏳ ${pending} pending)\n\n` +
      `🏆 **Point Table**\n${pointTable}\n\n` +
      `📅 **Upcoming Matches**\n${upcomingText}`;

    return interaction.reply(summary);
  }
};

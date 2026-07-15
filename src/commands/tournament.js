const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database');

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildMatches(pool, hunterCount, tournamentId, roundNumber) {
  const shuffled = shuffle(pool);
  const matches = [];
  let i = 0;
  let matchNum = 1;
  while (i < shuffled.length) {
    const runner = shuffled[i];
    const hunters = shuffled.slice(i + 1, i + 1 + hunterCount);
    if (hunters.length < 1) break;
    matches.push({
      matchId: `${tournamentId}-R${roundNumber}-M${matchNum}`,
      runner,
      hunters,
      status: 'scheduled',
      winner: null,
      scheduledTime: null,
      remindAt: null,
      reminded: false,
      voiceChannelId: null
    });
    i += 1 + hunterCount;
    matchNum++;
  }
  return matches;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tournament')
    .setDescription('Manhunt tournament management')
    .addSubcommand(sc => sc.setName('create').setDescription('Create a new tournament (admin)')
      .addStringOption(o => o.setName('name').setDescription('Tournament name').setRequired(true))
      .addIntegerOption(o => o.setName('hunters').setDescription('Hunters per match').setRequired(true)))
    .addSubcommand(sc => sc.setName('join').setDescription('Join the active tournament'))
    .addSubcommand(sc => sc.setName('start').setDescription('Generate round 1 matches for the active tournament (admin)'))
    .addSubcommand(sc => sc.setName('next-round').setDescription('Advance winners into a new round (admin)'))
    .addSubcommand(sc => sc.setName('matches').setDescription('List current round matches'))
    .addSubcommand(sc => sc.setName('standings').setDescription('Show remaining players in the active tournament'))
    .addSubcommand(sc => sc.setName('result').setDescription('Report a match result (admin)')
      .addStringOption(o => o.setName('match_id').setDescription('Match ID').setRequired(true))
      .addStringOption(o => o.setName('winner').setDescription('Who won').setRequired(true)
        .addChoices({ name: 'Runner escaped', value: 'runner' }, { name: 'Hunters caught runner', value: 'hunters' })))
    .addSubcommand(sc => sc.setName('schedule').setDescription('Set a scheduled time for a match (admin)')
      .addStringOption(o => o.setName('match_id').setDescription('Match ID').setRequired(true))
      .addStringOption(o => o.setName('time').setDescription('Display text, e.g. Sat 8:00 PM IST').setRequired(true))
      .addIntegerOption(o => o.setName('remind_in_minutes').setDescription('Bot will ping this match in X minutes').setRequired(false))
      .addChannelOption(o => o.setName('voice_channel').setDescription('Voice channel for this match').setRequired(false)))
    .addSubcommand(sc => sc.setName('add-match').setDescription('Manually add a match (admin)')
      .addUserOption(o => o.setName('runner').setDescription('The runner').setRequired(true))
      .addUserOption(o => o.setName('hunter1').setDescription('Hunter 1').setRequired(true))
      .addUserOption(o => o.setName('hunter2').setDescription('Hunter 2').setRequired(false))
      .addUserOption(o => o.setName('hunter3').setDescription('Hunter 3').setRequired(false))
      .addUserOption(o => o.setName('hunter4').setDescription('Hunter 4').setRequired(false))
      .addUserOption(o => o.setName('hunter5').setDescription('Hunter 5').setRequired(false))
      .addStringOption(o => o.setName('time').setDescription('Display time text, e.g. Sat 8:00 PM IST').setRequired(false))
      .addIntegerOption(o => o.setName('remind_in_minutes').setDescription('Bot will ping this match in X minutes').setRequired(false))
      .addChannelOption(o => o.setName('voice_channel').setDescription('Voice channel for this match').setRequired(false)))
    .addSubcommand(sc => sc.setName('delete-match').setDescription('Delete a match (admin)')
      .addStringOption(o => o.setName('match_id').setDescription('Match ID to delete').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const database = db.load();
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);

    if (sub === 'create') {
      if (!isAdmin) return interaction.reply({ content: '❌ Sirf admins tournament create kar sakte hain.', ephemeral: true });
      const name = interaction.options.getString('name');
      const hunters = interaction.options.getInteger('hunters');
      const id = `t_${Date.now()}`;
      database.tournaments[id] = {
        name, hunterCount: hunters, status: 'open', pool: [], rounds: [],
        channelId: interaction.channelId
      };
      database.activeTournamentId = id;
      db.save(database);
      return interaction.reply(`🏆 Tournament **${name}** created! (${hunters} hunters/match). Players ab \`/tournament join\` kar sakte hain.`);
    }

    const activeId = database.activeTournamentId;
    const t = activeId ? database.tournaments[activeId] : null;

    if (sub === 'join') {
      if (!t) return interaction.reply({ content: '❌ Koi active tournament nahi hai.', ephemeral: true });
      db.ensurePlayer(database, interaction.user.id, interaction.user.username);
      if (t.pool.includes(interaction.user.id)) {
        return interaction.reply({ content: 'Tum already registered ho iss tournament ke liye.', ephemeral: true });
      }
      t.pool.push(interaction.user.id);
      db.save(database);
      return interaction.reply(`✅ **${interaction.user.username}** joined **${t.name}**! (${t.pool.length} players so far)`);
    }

    if (sub === 'start') {
      if (!isAdmin) return interaction.reply({ content: '❌ Sirf admins bracket generate kar sakte hain.', ephemeral: true });
      if (!t) return interaction.reply({ content: '❌ Koi active tournament nahi hai.', ephemeral: true });
      if (t.pool.length < t.hunterCount + 1) {
        return interaction.reply({ content: `❌ Kam se kam ${t.hunterCount + 1} players chahiye (1 runner + ${t.hunterCount} hunters).`, ephemeral: true });
      }

      const matches = buildMatches(t.pool, t.hunterCount, activeId, 1);
      t.rounds = [{ roundNumber: 1, matches }];
      t.status = 'in_progress';
      db.save(database);

      const lines = matches.map(m => `**${m.matchId}** — 🏃 <@${m.runner}> vs 🏹 ${m.hunters.map(h => `<@${h}>`).join(', ')}`);
      return interaction.reply(`🎲 Round 1 generated for **${t.name}**!\n\n${lines.join('\n')}`);
    }

    if (sub === 'next-round') {
      if (!isAdmin) return interaction.reply({ content: '❌ Sirf admins next round generate kar sakte hain.', ephemeral: true });
      if (!t || t.rounds.length === 0) return interaction.reply({ content: '❌ Pehle `/tournament start` karo.', ephemeral: true });

      const lastRound = t.rounds[t.rounds.length - 1];
      const incomplete = lastRound.matches.filter(m => m.status !== 'completed');
      if (incomplete.length > 0) {
        return interaction.reply({ content: `❌ ${incomplete.length} match(es) abhi complete nahi hue. Pehle sabka \`/tournament result\` report karo.`, ephemeral: true });
      }

      const advancing = [];
      for (const m of lastRound.matches) {
        if (m.winner === 'runner') advancing.push(m.runner);
        else advancing.push(...m.hunters);
      }

      if (advancing.length < t.hunterCount + 1) {
        t.status = 'completed';
        db.save(database);
        const finalWinners = advancing.map(id => `<@${id}>`).join(', ') || 'Koi nahi';
        return interaction.reply(`🏁 **${t.name}** khatam! Final winner(s): ${finalWinners}`);
      }

      const nextRoundNum = lastRound.roundNumber + 1;
      const matches = buildMatches(advancing, t.hunterCount, activeId, nextRoundNum);
      t.rounds.push({ roundNumber: nextRoundNum, matches });
      db.save(database);

      const lines = matches.map(m => `**${m.matchId}** — 🏃 <@${m.runner}> vs 🏹 ${m.hunters.map(h => `<@${h}>`).join(', ')}`);
      return interaction.reply(`🎲 Round ${nextRoundNum} generated!\n\n${lines.join('\n')}`);
    }

    if (sub === 'matches') {
      if (!t || t.rounds.length === 0) return interaction.reply({ content: '❌ Abhi tak koi match generate nahi hua.', ephemeral: true });
      const round = t.rounds[t.rounds.length - 1];
      const lines = round.matches.map(m => {
        const status = m.status === 'completed'
          ? `✅ Winner: ${m.winner === 'runner' ? 'Runner' : 'Hunters'}`
          : (m.scheduledTime ? `🕒 ${m.scheduledTime}` : '⏳ Not scheduled');
        const vc = m.voiceChannelId ? ` — 🔊 <#${m.voiceChannelId}>` : '';
        return `**${m.matchId}** — 🏃 <@${m.runner}> vs 🏹 ${m.hunters.map(h => `<@${h}>`).join(', ')} — ${status}${vc}`;
      });
      return interaction.reply(`📋 **${t.name}** — Round ${round.roundNumber}\n\n${lines.join('\n')}`);
    }

    if (sub === 'standings') {
      if (!t) return interaction.reply({ content: '❌ Koi active tournament nahi hai.', ephemeral: true });
      if (t.rounds.length === 0) {
        return interaction.reply(`📋 **${t.name}** — Registered pool (${t.pool.length}): ${t.pool.map(id => `<@${id}>`).join(', ') || 'Khali'}`);
      }
      const lastRound = t.rounds[t.rounds.length - 1];
      const stillIn = new Set();
      for (const m of lastRound.matches) {
        if (m.status !== 'completed') { stillIn.add(m.runner); m.hunters.forEach(h => stillIn.add(h)); }
        else if (m.winner === 'runner') stillIn.add(m.runner);
        else m.hunters.forEach(h => stillIn.add(h));
      }
      return interaction.reply(`📋 **${t.name}** — Round ${lastRound.roundNumber} me bache hue players:\n${[...stillIn].map(id => `<@${id}>`).join(', ')}`);
    }

    if (sub === 'result') {
      if (!isAdmin) return interaction.reply({ content: '❌ Sirf admins result report kar sakte hain.', ephemeral: true });
      if (!t) return interaction.reply({ content: '❌ Koi active tournament nahi hai.', ephemeral: true });
      const matchId = interaction.options.getString('match_id');
      const winner = interaction.options.getString('winner');
      const round = t.rounds[t.rounds.length - 1];
      const match = round?.matches.find(m => m.matchId === matchId);
      if (!match) return interaction.reply({ content: `❌ Match ${matchId} nahi mila.`, ephemeral: true });

      match.status = 'completed';
      match.winner = winner;

      const winners = winner === 'runner' ? [match.runner] : match.hunters;
      const losers = winner === 'runner' ? match.hunters : [match.runner];
      for (const uid of winners) {
        db.ensurePlayer(database, uid, database.players[uid]?.username || uid);
        database.players[uid].wins++;
        database.players[uid].matchesPlayed++;
      }
      for (const uid of losers) {
        db.ensurePlayer(database, uid, database.players[uid]?.username || uid);
        database.players[uid].losses++;
        database.players[uid].matchesPlayed++;
      }
      db.save(database);
      return interaction.reply(`✅ **${matchId}** result recorded: ${winner === 'runner' ? '🏃 Runner escaped!' : '🏹 Hunters caught the runner!'}`);
    }

    if (sub === 'schedule') {
      if (!isAdmin) return interaction.reply({ content: '❌ Sirf admins schedule set kar sakte hain.', ephemeral: true });
      if (!t) return interaction.reply({ content: '❌ Koi active tournament nahi hai.', ephemeral: true });
      const matchId = interaction.options.getString('match_id');
      const time = interaction.options.getString('time');
      const remindIn = interaction.options.getInteger('remind_in_minutes');
      const voiceChannel = interaction.options.getChannel('voice_channel');
      const round = t.rounds[t.rounds.length - 1];
      const match = round?.matches.find(m => m.matchId === matchId);
      if (!match) return interaction.reply({ content: `❌ Match ${matchId} nahi mila.`, ephemeral: true });
      match.scheduledTime = time;
      if (remindIn && remindIn > 0) {
        match.remindAt = Date.now() + remindIn * 60000;
        match.reminded = false;
      }
      if (voiceChannel) match.voiceChannelId = voiceChannel.id;
      db.save(database);
      return interaction.reply(`🕒 **${matchId}** scheduled for **${time}**${remindIn ? ` (reminder in ${remindIn} min)` : ''}${voiceChannel ? ` — VC: ${voiceChannel}` : ''}. <@${match.runner}> ${match.hunters.map(h => `<@${h}>`).join(' ')}`);
    }

    if (sub === 'add-match') {
      if (!isAdmin) return interaction.reply({ content: '❌ Sirf admins match add kar sakte hain.', ephemeral: true });
      if (!t) return interaction.reply({ content: '❌ Koi active tournament nahi hai. Pehle `/tournament create` karo.', ephemeral: true });

      const runner = interaction.options.getUser('runner');
      const hunterUsers = [1, 2, 3, 4, 5]
        .map(n => interaction.options.getUser(`hunter${n}`))
        .filter(Boolean);
      const time = interaction.options.getString('time');
      const remindIn = interaction.options.getInteger('remind_in_minutes');
      const voiceChannel = interaction.options.getChannel('voice_channel');

      if (hunterUsers.length === 0) {
        return interaction.reply({ content: '❌ Kam se kam 1 hunter dena zaroori hai.', ephemeral: true });
      }

      if (t.rounds.length === 0) t.rounds.push({ roundNumber: 1, matches: [] });
      const round = t.rounds[t.rounds.length - 1];
      const matchId = `${activeId}-R${round.roundNumber}-M${round.matches.length + 1}`;

      const match = {
        matchId,
        runner: runner.id,
        hunters: hunterUsers.map(u => u.id),
        status: 'scheduled',
        winner: null,
        scheduledTime: time || null,
        remindAt: remindIn && remindIn > 0 ? Date.now() + remindIn * 60000 : null,
        reminded: false,
        voiceChannelId: voiceChannel ? voiceChannel.id : null
      };
      round.matches.push(match);

      for (const uid of [runner.id, ...hunterUsers.map(u => u.id)]) {
        db.ensurePlayer(database, uid, database.players[uid]?.username || uid);
      }
      db.save(database);

      return interaction.reply(
        `✅ Match add ho gaya!\n\n**${matchId}** — 🏃 <@${match.runner}> vs 🏹 ${match.hunters.map(h => `<@${h}>`).join(', ')}` +
        (match.scheduledTime ? `\n🕒 ${match.scheduledTime}` : '') +
        (voiceChannel ? `\n🔊 VC: ${voiceChannel}` : '')
      );
    }

    if (sub === 'delete-match') {
      if (!isAdmin) return interaction.reply({ content: '❌ Sirf admins match delete kar sakte hain.', ephemeral: true });
      const matchId = interaction.options.getString('match_id');
      const found = db.findMatch(database, matchId);
      if (!found) return interaction.reply({ content: `❌ Match ${matchId} nahi mila.`, ephemeral: true });

      found.round.matches = found.round.matches.filter(m => m.matchId !== matchId);
      db.save(database);
      return interaction.reply(`🗑️ Match **${matchId}** delete kar diya.`);
    }
  }
};
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

function load() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = { players: {}, tournaments: {}, activeTournamentId: null };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function save(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function ensurePlayer(db, userId, username) {
  if (!db.players[userId]) {
    db.players[userId] = { username, wins: 0, losses: 0, matchesPlayed: 0 };
  } else {
    db.players[userId].username = username;
  }
}

function getActiveTournament(db) {
  const id = db.activeTournamentId;
  return id ? db.tournaments[id] : null;
}

function findMatch(db, matchId) {
  for (const t of Object.values(db.tournaments)) {
    for (const round of t.rounds || []) {
      const match = round.matches.find(m => m.matchId === matchId);
      if (match) return { tournament: t, round, match };
    }
  }
  return null;
}

module.exports = { load, save, ensurePlayer, getActiveTournament, findMatch };

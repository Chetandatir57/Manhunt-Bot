# Manhunt Tournament Bot

Discord bot to run Minecraft Manhunt tournaments — registration, multi-round
elimination brackets, manual match add/delete, live status (point table +
upcoming matches), reminders, and a leaderboard.

## Requirements

- Node.js 18 or newer

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Rename `.env.example` to `.env` and fill in:
   - `DISCORD_TOKEN` — Discord Developer Portal > Bot > Reset Token
   - `CLIENT_ID` — Developer Portal > General Information > Application ID
   - `GUILD_ID` — your server's ID (enable Developer Mode, right-click server > Copy Server ID)
   - `MANHUNT_ROLE_NAME` — should match your existing role name (default: `Manhunt Player`)
3. **Invite the bot** using Developer Portal > OAuth2 > URL Generator, with BOTH
   the `bot` and `applications.commands` scopes checked, and `Manage Roles` under
   bot permissions. Missing `applications.commands` is the most common cause of
   a "Missing Access" error during deploy.
4. Make sure the bot's role is placed **above** the "Manhunt Player" role in
   your server's role list, or `/register` won't be able to assign it.
5. Deploy the slash commands:
   ```
   npm run deploy
   ```
6. Start the bot:
   ```
   npm start
   ```

## Commands

**Players**
- `/register` — assigns the Manhunt Player role and adds you to the database
- `/tournament join` — join the currently active tournament's player pool
- `/tournament matches` — list the current round's matches and their status
- `/tournament standings` — see who's still in the running
- `/status` — point table, total match count, and the next 3 upcoming matches
- `/stats [player]` — win/loss record and win rate
- `/leaderboard` — top 10 players by wins

**Admins**
- `/tournament create name:<x> hunters:<n>` — create a new tournament
- `/tournament start` — randomly generate Round 1 (1 runner + N hunters per match)
- `/tournament next-round` — advance winners into a fresh round automatically (repeat until one winner remains)
- `/tournament add-match runner:<user> hunter1:<user> [hunter2..5] [time] [remind_in_minutes]` — manually add a specific match
- `/tournament delete-match match_id:<x>` — remove a match
- `/tournament result match_id:<x> winner:<runner|hunters>` — record a match result
- `/tournament schedule match_id:<x> time:<x> [remind_in_minutes:<n>]` — set a display time and, optionally, have the bot auto-ping the players when it's time
- `/admin reset` — clear the active tournament (keeps player stats intact)
- `/admin remove-player player:<x>` — remove someone from the tournament pool

## How elimination rounds work

`/tournament start` builds Round 1 from everyone who `/tournament join`ed:
random groups of 1 runner + N hunters. After results are in for every match,
`/tournament next-round` pools the winners (runners who escaped + hunters who
caught their runner) and randomly regroups them into a new round. Keep
running `next-round` after each round's results are reported until only one
winner remains. You can also skip the auto bracket entirely and just use
`/tournament add-match` to set up matches by hand.

## Reminders

If you set `remind_in_minutes` on `/tournament schedule` or `/tournament
add-match`, the bot checks every 30 seconds and posts a ping in the channel
the tournament was created in once that time arrives.

## Data storage

Player and tournament data is stored in `data/db.json` (simple JSON file, no
external database needed). Back this file up if you want to preserve history
across restarts/redeploys.

## Troubleshooting

**`DiscordAPIError[50001]: Missing Access` during `npm run deploy`**
Almost always means the bot was invited without the `applications.commands`
scope, or `CLIENT_ID`/`GUILD_ID` in `.env` don't match your actual application
and server. Re-invite using step 3 above and double-check both IDs.

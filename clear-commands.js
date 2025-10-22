require('dotenv').config();
const { REST, Routes } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID || null;

if (!TOKEN || !CLIENT_ID) {
  console.error('Please set DISCORD_TOKEN and CLIENT_ID in .env');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function listCommands(isGuild, guildId) {
  try {
    const route = isGuild ? Routes.applicationGuildCommands(CLIENT_ID, guildId) : Routes.applicationCommands(CLIENT_ID);
    const cmds = await rest.get(route);
    if (!Array.isArray(cmds)) return [];
    return cmds.map(c => ({ id: c.id, name: c.name, type: c.type }));
  } catch (e) {
    console.error('Failed to list commands:', e);
    throw e;
  }
}

async function clearCommands(isGuild, guildId) {
  try {
    const route = isGuild ? Routes.applicationGuildCommands(CLIENT_ID, guildId) : Routes.applicationCommands(CLIENT_ID);
    // PUT with empty array replaces all commands -> atomic clear
    await rest.put(route, { body: [] });
    return true;
  } catch (e) {
    console.error('Failed to clear commands:', e);
    return false;
  }
}

(async () => {
  try {
    const isGuild = Boolean(GUILD_ID);
    console.log('Using CLIENT_ID=', CLIENT_ID, 'GUILD_ID=', GUILD_ID);

    console.log('Listing commands before clear...');
    const before = await listCommands(isGuild, GUILD_ID);
    console.log(`Found ${before.length} command(s):`, before);

    console.log('Clearing commands now...');
    const ok = await clearCommands(isGuild, GUILD_ID);
    if (!ok) {
      console.error('Clear attempt failed. Check token / permissions (application.commands) and client id.');
      process.exit(1);
    }

    // small delay to allow backend propagation, then re-list
    await new Promise(r => setTimeout(r, 1500));

    console.log('Listing commands after clear...');
    const after = await listCommands(isGuild, GUILD_ID);
    console.log(`Remaining ${after.length} command(s):`, after);

    console.log('Done.');
    if (!isGuild) {
      console.log('Note: global command changes can take a few minutes to propagate to all clients.');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
})();

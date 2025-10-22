require('dotenv').config();
const { REST, Routes } = require('discord.js');

const argv = require('node:process').argv.slice(2);
function getArg(name) {
  const i = argv.indexOf(name);
  if (i === -1) return undefined;
  return argv[i + 1];
}

const TOKEN = getArg('--token') || process.env.DISCORD_TOKEN;
const CLIENT_ID = getArg('--client') || process.env.CLIENT_ID;
const GUILD_ID = getArg('--guild') || process.env.GUILD_ID || null;

if (!TOKEN || !CLIENT_ID) {
  console.error('Error: set DISCORD_TOKEN and CLIENT_ID via .env or --token / --client');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function listCommands(isGuild, guildId) {
  try {
    const route = isGuild ? Routes.applicationGuildCommands(CLIENT_ID, guildId) : Routes.applicationCommands(CLIENT_ID);
    const cmds = await rest.get(route);
    return Array.isArray(cmds) ? cmds : [];
  } catch (e) {
    console.warn(`Could not list ${isGuild ? 'guild' : 'global'} commands:`, e?.message || e);
    return null;
  }
}

async function clearCommands(isGuild, guildId) {
  try {
    const route = isGuild ? Routes.applicationGuildCommands(CLIENT_ID, guildId) : Routes.applicationCommands(CLIENT_ID);
    await rest.put(route, { body: [] });
    return true;
  } catch (e) {
    console.warn(`Failed to clear ${isGuild ? 'guild' : 'global'} commands:`, e?.message || e);
    return false;
  }
}

(async () => {
  console.log('Target application:', CLIENT_ID, 'guild:', GUILD_ID || '(none)');
  // LIST BEFORE
  const globalBefore = await listCommands(false);
  console.log('Global before:', globalBefore ? globalBefore.length : 'error');
  if (globalBefore && globalBefore.length) globalBefore.forEach(c => console.log('  ', c.name, c.id));

  const guildBefore = GUILD_ID ? await listCommands(true, GUILD_ID) : null;
  if (GUILD_ID) {
    console.log('Guild before:', guildBefore ? guildBefore.length : 'error');
    if (Array.isArray(guildBefore) && guildBefore.length) guildBefore.forEach(c => console.log('  ', c.name, c.id));
  }

  // CLEAR GLOBAL
  console.log('Clearing global commands...');
  const okGlobal = await clearCommands(false);
  console.log('Global clear:', okGlobal ? 'OK' : 'FAILED');

  // CLEAR GUILD (only if explicit)
  if (GUILD_ID) {
    console.log('Clearing guild commands for', GUILD_ID, '...');
    const okGuild = await clearCommands(true, GUILD_ID);
    console.log('Guild clear:', okGuild ? 'OK' : 'FAILED');
  } else {
    console.log('No GUILD_ID provided — skipping guild clear.');
  }

  // small delay then list after
  await new Promise(r => setTimeout(r, 1500));

  const globalAfter = await listCommands(false);
  console.log('Global after:', globalAfter ? globalAfter.length : 'error');
  if (globalAfter && globalAfter.length) globalAfter.forEach(c => console.log('  ', c.name, c.id));

  if (GUILD_ID) {
    const guildAfter = await listCommands(true, GUILD_ID);
    console.log('Guild after:', guildAfter ? guildAfter.length : 'error');
    if (guildAfter && guildAfter.length) guildAfter.forEach(c => console.log('  ', c.name, c.id));
  }

  console.log('Done. If some commands still appear in clients, wait a few minutes (global propagation).');
})();
require('dotenv').config();
const { REST, Routes } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID || null;

if (!TOKEN || !CLIENT_ID) {
  console.error('Please set DISCORD_TOKEN and CLIENT_ID in .env or via env vars for the app you want to inspect.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function show() {
  try {
    console.log('Inspecting application:', CLIENT_ID, 'guild:', GUILD_ID || '(no guild set)');
    console.log('--- Global commands for this application ---');
    try {
      const global = await rest.get(Routes.applicationCommands(CLIENT_ID));
      console.log(`Found ${global.length} global command(s):`);
      global.forEach(c => console.log({ id: c.id, name: c.name, application_id: c.application_id, type: c.type }));
    } catch (e) {
      console.warn('Could not list global commands for this application:', e.message || e);
    }

    if (GUILD_ID) {
      console.log('--- Guild commands for this application ---');
      try {
        const guild = await rest.get(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID));
        console.log(`Found ${guild.length} guild command(s):`);
        guild.forEach(c => console.log({ id: c.id, name: c.name, application_id: c.application_id, type: c.type }));
      } catch (e) {
        console.warn('Could not list guild commands for this application:', e.message || e);
      }
    } else {
      console.log('(No GUILD_ID set — skipping guild listing)');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

show();
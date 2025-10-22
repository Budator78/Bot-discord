// Bot Discord complet (musique + hymnes + mini-jeux Rocket League / Overwatch / Valorant)
// ATTENTION : Pour résoudre le problème de lecture YouTube, vous devez installer la dépendance suivante :
// npm install @discord-player/extractor
// Liste complète des dépendances :
// npm install discord.js discord-player @discordjs/voice @discordjs/rest ytdl-core dotenv xlsx @discord-player/extractor

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder, PermissionsBitField, Collection } = require('discord.js');
const { Player, useQueue, QueryType, Track } = require('discord-player');
// MODIFIÉ : Import correct de DefaultExtractors
const { DefaultExtractors } = require('@discord-player/extractor'); 
// SUPPRIMÉ : Toute référence à l'extracteur externe qui causait l'erreur 404
const xlsx = require('xlsx');

// ---------- DISCORD CLIENT & PLAYER ----------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

// CORRECTION IMPORTANTE : Initialiser client.commands comme une Collection pour stocker les commandes Slash
client.commands = new Collection();

const player = new Player(client);

// NOUVEAU BLOC: Utilisation de la méthode standard player.extractors.loadMulti()
(async () => {
    console.log('Loading discord-player extractors...');
    try {
        // MODIFIÉ : Utilisation de loadMulti conformément au message d'erreur
        await player.extractors.loadMulti(DefaultExtractors);
        // SUPPRIMÉ le chargement de l'extracteur externe défectueux
        console.log('Extractors loaded.');
    } catch (e) {
        console.error('Failed to load extractors:', e.message);
    }
    
    // Ajout d'une vérification FFmpeg simple au démarrage
    try {
        require('child_process').execSync('ffmpeg -version', { stdio: 'ignore' });
        console.log('FFmpeg check: SUCCESS');
    } catch (e) {
        console.error('FFmpeg check: FAILED. Ensure FFmpeg is installed and accessible in your system PATH.');
    }
})();

// ---------- SLASH COMMANDS (register on start) ----------
/*
  Remplacement :
  - lecture dynamique des fichiers dans ./commandes
  - stockage dans client.commands (Collection)
  - construction du tableau `commands` pour l'enregistrement via REST
*/
const COMMANDS_DIR = path.join(__dirname, 'commandes');
if (!fs.existsSync(COMMANDS_DIR)) fs.mkdirSync(COMMANDS_DIR, { recursive: true });


const commandFiles = fs.existsSync(COMMANDS_DIR) ? fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.js')) : [];
const commands = [];

for (const file of commandFiles) {
  try {
    const cmd = require(path.join(COMMANDS_DIR, file));
    if (!cmd || !cmd.data || !cmd.execute) {
      console.warn('Fichier de commande invalide:', file);
      continue;
    }
    // Ligne qui causait l'erreur, maintenant corrigée par l'initialisation de client.commands ci-dessus
    client.commands.set(cmd.data.name, cmd);
    commands.push(cmd.data.toJSON());
  } catch (e) {
    console.error('Erreur en chargeant la commande', file, e);
  }
}

async function registerCommands() {
  if (!CLIENT_ID) return;
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log('Slash commands registered for guild', GUILD_ID);
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log('Global slash commands registered');
    }
  } catch (err) {
    console.error('Failed to register commands', err);
  }
}

// ---------- CONFIG ----------
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID || null;

if (!TOKEN || !CLIENT_ID) {
  console.error('❌ Il manque DISCORD_TOKEN ou CLIENT_ID dans ton .env');
  process.exit(1);
}

// ---------- HYMNES ----------
// MODIFIÉ : Remplacement des URLs par des titres de recherche simples
const HYMNE_1 = 'Never Gonna Give You Up Rick Astley';
const HYMNE_2 = 'La danse des canards musique officielle';

// ---------- DONNÉES ----------
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const PATH_CHALLENGES = path.join(DATA_DIR, 'challenges.json');
const PATH_OW_MAPS = path.join(DATA_DIR, 'overwatch_maps.json');
const PATH_OW_HEROES = path.join(DATA_DIR, 'overwatch_heroes.json');
const PATH_VAL_MAPS = path.join(DATA_DIR, 'valorant_maps.json');
const PATH_VAL_SHEET_XLSX = path.join(DATA_DIR, 'valorant_heroes.xlsx');
const PATH_VAL_SHEET_CSV = path.join(DATA_DIR, 'valorant_heroes.csv');

const sampleChallenges = [
  "Boire un verre d'eau en 10s",
  "Faire 10 pompes",
  "Parler avec un accent pendant 5 minutes",
  "Faire un backflip (si possible)",
  "Imiter un streameur pendant 1 minute"
];
const sampleOWMaps = ["Hanamura", "King's Row", "Lijiang Tower", "Numbani"];
const sampleOWHeroes = {
  tank: ["Reinhardt", "Winston", "Sigma", "Roadhog"],
  dps: ["Tracer", "Soldier:76", "Genji", "McCree"],
  support: ["Mercy", "Ana", "Lucio", "Brigitte"]
};
const sampleValMaps = ["Ascent", "Bind", "Haven", "Split"];

// Création fichiers exemple si manquants
if (!fs.existsSync(PATH_CHALLENGES)) fs.writeFileSync(PATH_CHALLENGES, JSON.stringify(sampleChallenges, null, 2));
if (!fs.existsSync(PATH_OW_MAPS)) fs.writeFileSync(PATH_OW_MAPS, JSON.stringify(sampleOWMaps, null, 2));
if (!fs.existsSync(PATH_OW_HEROES)) fs.writeFileSync(PATH_OW_HEROES, JSON.stringify(sampleOWHeroes, null, 2));
if (!fs.existsSync(PATH_VAL_MAPS)) fs.writeFileSync(PATH_VAL_MAPS, JSON.stringify(sampleValMaps, null, 2));
if (!fs.existsSync(PATH_VAL_SHEET_XLSX) && !fs.existsSync(PATH_VAL_SHEET_CSV)) {
  const csvExample = `username,Reyna,Sage,Omen
player1,TRUE,FALSE,TRUE
player2,TRUE,TRUE,FALSE
player3,FALSE,TRUE,TRUE
`;
   fs.writeFileSync(PATH_VAL_SHEET_CSV, csvExample);
 }

// ---------- HELPERS ----------
function readJsonSafe(p) {
  try {
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.warn('readJsonSafe failed for', p, e);
    return null;
  }
}

function pickRandom(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function readCSVToObjects(csv) {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = cols[j] !== undefined ? cols[j].trim() : '';
    }
    rows.push(obj);
  }
  return rows;
}

function readValorantSheet() {
  // prefer xlsx, fallback to csv
  try {
    if (fs.existsSync(PATH_VAL_SHEET_XLSX)) {
      const wb = xlsx.readFile(PATH_VAL_SHEET_XLSX);
      const sheetName = wb.SheetNames[0];
      const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
      return data;
    }
    if (fs.existsSync(PATH_VAL_SHEET_CSV)) {
      const csv = fs.readFileSync(PATH_VAL_SHEET_CSV, 'utf8');
      return readCSVToObjects(csv);
    }
    return [];
  } catch (e) {
    console.error('Failed to read valorant sheet', e);
    return [];
  }
}

// register commands once ready
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  registerCommands();
});


client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return interaction.reply({ content: 'Commande introuvable.', ephemeral: true });

  try {
    // contexte partagé passé à chaque commande
    const ctx = {
      client,
      player,
      readJsonSafe,
      readValorantSheet,
      pickRandom,
      shuffle,
      PATH_CHALLENGES, PATH_OW_MAPS, PATH_OW_HEROES, PATH_VAL_MAPS,
      QueryType, PermissionsBitField,
    };
    await cmd.execute(interaction, ctx);
  } catch (err) {
    console.error('Interaction error', err);
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('Une erreur est survenue lors du traitement de la commande.');
      } else {
        await interaction.reply('Une erreur est survenue lors du traitement de la commande.');
      }
    } catch (e) {
      console.error('Error replying after failure', e);
    }
  }
});

// ---------- Login ----------
client.login(TOKEN);
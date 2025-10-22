const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pute')
    .setDescription('Lancer le mini-jeu pute')
    .addStringOption(opt => opt.setName('jeu').setDescription('Choisir un jeu').setRequired(true).addChoices(
      { name: 'rocket_league', value: 'rocket_league' },
      { name: 'valorant', value: 'valorant' },
      { name: 'overwatch', value: 'overwatch' },
    )),
  async execute(interaction, ctx) {
    const jeu = interaction.options.getString('jeu');
    await interaction.deferReply();
    const member = interaction.member;
    const voiceChannel = member.voice.channel;
    if (!voiceChannel) return interaction.editReply('Tu dois être dans un vocal pour utiliser cette commande.');
    const nonBotMembers = voiceChannel.members.filter(m => !m.user.bot).map(m => m);
    if (nonBotMembers.length === 0) return interaction.editReply('Aucun joueur disponible dans le vocal.');

    if (jeu === 'rocket_league') {
      const target = ctx.pickRandom(nonBotMembers);
      const challenges = ctx.readJsonSafe(ctx.PATH_CHALLENGES) || [
        "Boire un verre d'eau en 10s",
        "Faire 10 pompes",
        "Parler avec un accent pendant 5 minutes",
        "Faire un backflip (si possible)",
        "Imiter un streameur pendant 1 minute"
      ];
      const challenge = ctx.pickRandom(challenges);
      try {
        await target.send(`Pute : ${challenge}`);
        return interaction.editReply(`Défi envoyé en DM à **${target.user.tag}**.`);
      } catch (err) {
        return interaction.editReply(`Impossible d'envoyer un DM à ${target.user.tag}. Ils ont peut-être bloqué les DMs.`);
      }
    }

    if (jeu === 'overwatch') {
      const maps = ctx.readJsonSafe(ctx.PATH_OW_MAPS) || ["Hanamura", "King's Row", "Lijiang Tower", "Numbani"];
      const heroesByRole = ctx.readJsonSafe(ctx.PATH_OW_HEROES) || {
        tank: ["Reinhardt", "Winston", "Sigma", "Roadhog"],
        dps: ["Tracer", "Soldier:76", "Genji", "McCree"],
        support: ["Mercy", "Ana", "Lucio", "Brigitte"]
      };
      const players = nonBotMembers.slice();
      ctx.shuffle(players);
      if (players.length < 6) return interaction.editReply('Il faut au moins 6 joueurs dans le vocal (3v3).');
      const selected = players.slice(0, 6);
      const teamA = selected.slice(0, 3);
      const teamB = selected.slice(3, 6);

      function assignTeamRoles(team) {
        const rolesOrder = ['tank', 'dps', 'support'];
        ctx.shuffle(rolesOrder);
        const usedHeroes = new Set();
        const assignments = [];
        for (let i = 0; i < team.length; i++) {
          const role = rolesOrder[i];
          const pool = (heroesByRole[role] && Array.isArray(heroesByRole[role])) ? heroesByRole[role].slice() : [];
          ctx.shuffle(pool);
          let hero = pool.find(h => !usedHeroes.has(h));
          if (!hero) hero = pool[0] || 'RandomHero';
          usedHeroes.add(hero);
          assignments.push({ player: team[i], role, hero });
        }
        return assignments;
      }

      const aAssign = assignTeamRoles(teamA);
      const bAssign = assignTeamRoles(teamB);
      const map = ctx.pickRandom(maps);

      let msg = `Overwatch — Map: **${map}**\n\n**Team A:**\n`;
      aAssign.forEach(x => { msg += `- ${x.player.user.tag} — ${x.role} — ${x.hero}\n`; });
      msg += `\n**Team B:**\n`;
      bAssign.forEach(x => { msg += `- ${x.player.user.tag} — ${x.role} — ${x.hero}\n`; });

      return interaction.editReply(msg);
    }

    if (jeu === 'valorant') {
      const maps = ctx.readJsonSafe(ctx.PATH_VAL_MAPS) || ["Ascent", "Bind", "Haven", "Split"];
      const sheet = ctx.readValorantSheet();
      const players = nonBotMembers.slice();
      ctx.shuffle(players);
      if (players.length < 6) return interaction.editReply('Il faut au moins 6 joueurs dans le vocal (3v3).');
      const selected = players.slice(0, 6);
      const teamA = selected.slice(0, 3);
      const teamB = selected.slice(3, 6);
      const map = ctx.pickRandom(maps);

      const agentSet = new Set();
      const userAgents = {};
      sheet.forEach(row => {
        const rowKeys = Object.keys(row);
        const usernameKey = rowKeys.find(k => k.toLowerCase() === 'username') || rowKeys[0];
        const username = String(row[usernameKey] || '').trim().toLowerCase();
        if (!username) return;
        userAgents[username] = [];
        rowKeys.forEach(k => {
          if (k === usernameKey) return;
          agentSet.add(k);
          const v = row[k];
          const truthy = (v === true) || (String(v).toLowerCase() === 'true') || (String(v).toLowerCase() === 'yes') || (String(v) === '1');
          if (truthy) userAgents[username].push(k);
        });
      });
      const agents = Array.from(agentSet);

      function findOwnerKeyForMember(member) {
        const tries = [
          member.user.tag?.toLowerCase?.(),
          member.user.username?.toLowerCase?.(),
        ].filter(Boolean);
        if (member.displayName && typeof member.displayName === 'string') tries.push(member.displayName.toLowerCase());
        for (const t of tries) {
          if (userAgents[t]) return t;
        }
        for (const u of Object.keys(userAgents)) {
          for (const t of tries) {
            if (!t) continue;
            if (u.includes(t) || t.includes(u)) return u;
          }
        }
        return null;
      }

      function assignAgentsToTeam(team) {
        const assigned = new Map();
        const used = new Set();
        for (const member of team) {
          const ownerKey = findOwnerKeyForMember(member);
          let possible = [];
          if (ownerKey && Array.isArray(userAgents[ownerKey])) {
            possible = userAgents[ownerKey].filter(a => !used.has(a));
          }
          if (possible.length === 0) possible = agents.filter(a => !used.has(a));
          const pick = possible.length ? ctx.pickRandom(possible) : 'RandomAgent';
          assigned.set(member, pick);
          used.add(pick);
        }
        return assigned;
      }

      const aAssigned = assignAgentsToTeam(teamA);
      const bAssigned = assignAgentsToTeam(teamB);

      let out = `Valorant — Map: **${map}**\n\n**Team A:**\n`;
      for (const [m, agent] of aAssigned.entries()) out += `- ${m.user.tag} => ${agent}\n`;
      out += `\n**Team B:**\n`;
      for (const [m, agent] of bAssigned.entries()) out += `- ${m.user.tag} => ${agent}\n`;

      return interaction.editReply(out);
    }

    return interaction.editReply('Je n’ai pas reconnu le jeu sélectionné.');
  }
};
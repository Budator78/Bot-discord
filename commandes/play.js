const { SlashCommandBuilder } = require('@discordjs/builders');
const playdl = require('play-dl');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Joue une musique (YouTube / SoundCloud / lien direct)')
    .addStringOption(opt => opt.setName('query').setDescription('URL ou titre').setRequired(true)),
  async execute(interaction, ctx) {
    const query = interaction.options.getString('query', true);
    const member = interaction.member;
    const voiceChannel = member?.voice?.channel;
    if (!voiceChannel) return interaction.reply({ content: '🚫 Tu dois être dans un salon vocal pour utiliser /play.', ephemeral: true });

    try { if (!interaction.deferred && !interaction.replied) await interaction.deferReply(); } catch (e) { console.warn('deferReply failed:', e?.message || e); }

    // permissions
    try {
      const botMember = interaction.guild.members.me || interaction.guild.members.cache.get(ctx.client.user.id);
      const botPerms = voiceChannel.permissionsFor(botMember);
      if (!botPerms || !botPerms.has(ctx.PermissionsBitField.Flags.Connect)) return interaction.editReply?.('🚫 Pas de permission CONNECT.').catch(()=>{}) || interaction.reply?.('🚫 Pas de permission CONNECT.').catch(()=>{});
      if (!botPerms.has(ctx.PermissionsBitField.Flags.Speak)) return interaction.editReply?.('🚫 Pas de permission SPEAK.').catch(()=>{}) || interaction.reply?.('🚫 Pas de permission SPEAK.').catch(()=>{});
    } catch (permErr) { console.warn('Permission check failed:', permErr); }

    const player = ctx.player;
    const queue = player.nodes.create(interaction.guild, {
      metadata: { interaction },
      leaveOnEnd: false,
      leaveOnEmpty: false,
      leaveOnStop: false,
    });

    try { if (!queue.connection) await queue.connect(voiceChannel); } catch (connErr) { console.error('Connect failed:', connErr); return interaction.editReply?.('❌ Impossible de rejoindre le salon vocal.').catch(()=>{}) || interaction.reply?.('❌ Impossible de rejoindre le salon vocal.').catch(()=>{}); }

    // recherche initiale via discord-player
    const isUrl = /^https?:\/\//i.test(query);
    const QueryType = ctx.QueryType;
    let result = null;
    try {
      const searchEngine = isUrl ? QueryType?.AUTO : (QueryType?.AUTO_SEARCH || QueryType?.YOUTUBE_SEARCH || QueryType?.AUTO);
      result = await player.search(query, { requestedBy: interaction.user, searchEngine });
    } catch (e) {
      console.warn('Initial search failed:', e?.message || e);
      result = null;
    }

    // helper filtre "pas officiel"
    const badKeywords = /remix|slowed|reverb|cover|karaoke|instrumental|bootleg|edit|vip/i;
    let chosen = result?.tracks?.[0] ?? null;

    // si résultat SoundCloud ou titre "slowed/reverb" -> fallback YouTube
    const needYoutubeFallback = !chosen || chosen.queryType?.toLowerCase().includes('soundcloud') || badKeywords.test(chosen.title || '');
    if (needYoutubeFallback) {
      // Première tentative: play-dl (peut renvoyer l'easter-egg)
      try {
        console.log('Fallback: searching YouTube via play-dl for:', query);
        const videos = await playdl.search(query, { source: 'youtube', limit: 8 });
        const good = videos.filter(v => v.type === 'video' && !/live/i.test(v.title) && !badKeywords.test(v.title));
        const exact = good.find(v => v.title.toLowerCase().includes(query.toLowerCase()));
        const pick = exact || good[0] || videos.find(v => v.type === 'video');
        if (pick) {
          const youtubeUrl = `https://www.youtube.com/watch?v=${pick.id}`;
          console.log('play-dl selected:', pick.title, youtubeUrl);
          const ytResult = await player.search(youtubeUrl, { requestedBy: interaction.user, searchEngine: QueryType?.AUTO });
          if (ytResult && ytResult.tracks && ytResult.tracks.length > 0) chosen = ytResult.tracks[0];
          else chosen = { title: pick.title, url: youtubeUrl, requestedBy: interaction.user, queryType: 'youtube' };
        }
      } catch (e) {
        console.warn('YouTube fallback via play-dl failed:', e?.message || e);
      }

      // Si play-dl a échoué (ex: Easter Egg), utiliser yt-search (plus fiable pour rechercher)
      if (!chosen || (chosen && chosen.queryType?.toLowerCase().includes('soundcloud'))) {
        try {
          console.log('Fallback: searching YouTube via yt-search for:', query);
          const ytSearch = require('yt-search');
          const r = await ytSearch(query);
          const videos = (r && r.videos) ? r.videos.slice(0, 8) : [];
          const good = videos.filter(v => !/live/i.test(v.title) && !badKeywords.test(v.title));
          const exact = good.find(v => v.title.toLowerCase().includes(query.toLowerCase()));
          const pick = exact || good[0] || videos[0];
          if (pick) {
            const youtubeUrl = pick.url;
            console.log('yt-search selected:', pick.title, youtubeUrl);
            const ytResult = await player.search(youtubeUrl, { requestedBy: interaction.user, searchEngine: QueryType?.AUTO });
            if (ytResult && ytResult.tracks && ytResult.tracks.length > 0) chosen = ytResult.tracks[0];
            else chosen = { title: pick.title, url: youtubeUrl, requestedBy: interaction.user, queryType: 'youtube' };
          }
        } catch (e) {
          console.warn('yt-search fallback failed:', e?.message || e);
        }
      }
    }

    // si toujours rien -> message
    if (!chosen) {
      const msg = '❌ Aucune piste trouvée (même après fallback YouTube). Essaye avec le lien YouTube direct ou "artiste - titre".';
      return (interaction.deferred ? interaction.editReply(msg).catch(()=>{}) : interaction.reply(msg).catch(()=>{}));
    }

    // play
    console.log('Final chosen track:', chosen.title, chosen.url, 'queryType:', chosen.queryType || 'unknown');
    try {
      await queue.node.play(chosen);
      const successMsg = `🎶 Ajouté à la file : **${chosen.title}**`;
      if (interaction.deferred || interaction.replied) await interaction.editReply(successMsg).catch(()=>{}); else await interaction.reply(successMsg).catch(()=>{});
    } catch (err) {
      console.error('play -> queue.node.play error:', err);
      const isExtractErr = err && (err.code === 'ERR_NO_RESULT' || err.code === 'ERR_NO_STREAM' || err.name === 'NoResultError');
      if (isExtractErr) {
        const fallbackMsg = [
          '❌ Impossible d\'extraire un flux pour cette piste.',
          'Solutions :',
          '- Vérifier que ffmpeg est installé et accessible (ffmpeg -version)',
          '- Redémarrer le bot'
        ].join('\n');
        return interaction.followUp?.(fallbackMsg).catch(()=>{}) || interaction.reply?.({ content: fallbackMsg, ephemeral: true }).catch(()=>{});
      }
      return interaction.followUp?.('❌ Erreur lors de la lecture.').catch(()=>{}) || interaction.reply?.({ content: '❌ Erreur lors de la lecture.', ephemeral: true }).catch(()=>{});
    }
  }
};
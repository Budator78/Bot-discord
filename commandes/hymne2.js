const { SlashCommandBuilder } = require('@discordjs/builders');
const { QueryType } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder().setName('hymne2').setDescription("Lancer l'hymne 2"),
  async execute(interaction, ctx) {
    const HYMNE_2 = 'La danse des canards musique officielle';
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) return interaction.reply('🚫 Tu dois être dans un vocal.');
    await interaction.deferReply();
    try {
      const botMember = interaction.guild.members.me || interaction.guild.members.cache.get(ctx.client.user.id);
      const botPerms = voiceChannel.permissionsFor(botMember);
      if (!botPerms || !botPerms.has(ctx.PermissionsBitField.Flags.Connect)) {
        return interaction.editReply('🚫 Je n\'ai pas la permission de rejoindre ce salon vocal (CONNECT).');
      }
      if (!botPerms.has(ctx.PermissionsBitField.Flags.Speak)) {
        return interaction.editReply('🚫 Je n\'ai pas la permission de parler dans ce salon vocal (SPEAK).');
      }
    } catch (e) { console.warn(e); }

    try {
      const queue = ctx.player.nodes.create(interaction.guild, { metadata: interaction });
      if (!queue.connection) await queue.connect(voiceChannel);
      const result = await ctx.player.search(HYMNE_2, { requestedBy: interaction.user, searchEngine: QueryType.AUTO });
      if (!result || !result.tracks.length) return interaction.editReply('❌ Aucune piste trouvée pour cet hymne.');
      await queue.node.play(result.tracks[0]);
      return interaction.editReply('🎵 Hymne lancé.');
    } catch (e) {
      console.error('hymne2 error', e);
      return interaction.editReply('❌ Impossible de jouer l’hymne.');
    }
  }
};
const { SlashCommandBuilder } = require('@discordjs/builders');
const { useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder().setName('queue').setDescription('Afficher la file d\'attente'),
  async execute(interaction, ctx) {
    const queue = useQueue(interaction.guild);
    if (!queue || queue.tracks.size === 0) return interaction.reply('🕳️ File vide.');
    const list = queue.tracks.toArray().slice(0, 10).map((t, i) => `${i + 1}. ${t.title} (${t.duration})`).join('\n');
    return interaction.reply(`🎶 File d’attente :\n${list}`);
  }
};
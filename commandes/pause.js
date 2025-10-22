const { SlashCommandBuilder } = require('@discordjs/builders');
const { useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder().setName('pause').setDescription('Mettre en pause'),
  async execute(interaction, ctx) {
    const queue = useQueue(interaction.guild);
    if (!queue) return interaction.reply('🚫 Rien en cours.');
    queue.node.setPaused(true);
    return interaction.reply('⏸️ Pause.');
  }
};
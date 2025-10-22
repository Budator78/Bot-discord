const { SlashCommandBuilder } = require('@discordjs/builders');
const { useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder().setName('resume').setDescription('Reprendre'),
  async execute(interaction, ctx) {
    const queue = useQueue(interaction.guild);
    if (!queue) return interaction.reply('🚫 Rien en pause.');
    queue.node.setPaused(false);
    return interaction.reply('▶️ Reprise.');
  }
};
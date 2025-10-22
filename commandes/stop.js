const { SlashCommandBuilder } = require('@discordjs/builders');
const { useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder().setName('stop').setDescription('Arrêter la lecture'),
  async execute(interaction, ctx) {
    const queue = useQueue(interaction.guild);
    if (!queue) return interaction.reply('🚫 Rien à stopper.');
    queue.delete();
    return interaction.reply('🛑 Lecture arrêtée.');
  }
};
const { SlashCommandBuilder } = require('@discordjs/builders');
const { useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder().setName('skip').setDescription('Passer la piste'),
  async execute(interaction, ctx) {
    const queue = useQueue(interaction.guild);
    if (!queue) return interaction.reply('🚫 Rien à passer.');
    queue.node.skip();
    return interaction.reply('⏭️ Piste suivante.');
  }
};
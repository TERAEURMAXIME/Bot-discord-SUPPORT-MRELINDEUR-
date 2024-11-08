const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('startserver')
        .setDescription('Démarrer le serveur Minecraft (réservé au rôle A)'),
    async execute(interaction) {
        const role = interaction.guild.roles.cache.find(role => role.name === 'A');
        if (interaction.member.roles.cache.has(role?.id)) {
            await interaction.reply('Le serveur Minecraft est en cours de démarrage !');
        } else {
            await interaction.reply('Vous n\'avez pas les permissions pour démarrer le serveur Minecraft.');
        }
    }
};
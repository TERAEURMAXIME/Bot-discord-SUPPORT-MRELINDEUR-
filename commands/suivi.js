const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suivi')
        .setDescription('Suivre un colis')
        .addStringOption(option =>
            option.setName('tracking_number')
                .setDescription('Le numéro de suivi du colis')
                .setRequired(true)),
    async execute(interaction, { axios, LA_POSTE_API_KEY }) {
        const trackingNumber = interaction.options.getString('tracking_number');
        try {
            const response = await axios.get(`https://api.laposte.fr/suivi/v2/idships/${trackingNumber}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Okapi-Key': LA_POSTE_API_KEY
                }
            });
            const status = response.data.shipment.timeline[0]?.shortLabel || 'Statut inconnu';
            await interaction.reply(`Statut du colis ${trackingNumber} : ${status}`);
        } catch (error) {
            console.error('Erreur lors de la récupération des informations de suivi :', error);
            await interaction.reply('Impossible de récupérer les informations de suivi actuellement.');
        }
    }
};
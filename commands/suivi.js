const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suivi')
        .setDescription('Suivre un colis avec l\'API de La Poste')
        .addStringOption(option =>
            option.setName('tracking_number')
                .setDescription('Le numéro de suivi du colis')
                .setRequired(true)),
    async execute(interaction, { axios, LA_POSTE_API_KEY }) {
        const trackingNumber = interaction.options.getString('tracking_number');

        try {
            // Appel à l'API de La Poste
            const response = await axios.get(`https://api.laposte.fr/suivi/v2/idships/${trackingNumber}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Okapi-Key': LA_POSTE_API_KEY
                }
            });

            // Vérification si les données nécessaires sont présentes
            if (response.data && response.data.shipment && response.data.shipment.timeline) {
                const timeline = response.data.shipment.timeline;

                // Construire un historique détaillé
                const history = timeline.map(event => {
                    const date = event.eventDate || 'Date inconnue';
                    const status = event.shortLabel || 'Statut inconnu';
                    return `**[${date}]** : ${status}`;
                }).join('\n');

                await interaction.reply(`📦 **Historique du colis ${trackingNumber}**\n\n${history}`);
            } else {
                // Réponse si les données ne sont pas disponibles
                await interaction.reply(`❓ Impossible de trouver des informations pour le colis ${trackingNumber}.`);
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des informations de suivi :', error);

            // Gestion des cas spécifiques d'erreurs HTTP
            if (error.response) {
                const status = error.response.status;
                if (status === 404) {
                    await interaction.reply(`❌ Numéro de suivi ${trackingNumber} introuvable.`);
                } else if (status === 401 || status === 403) {
                    await interaction.reply('🚫 Erreur d\'authentification avec l\'API de La Poste. Veuillez vérifier votre clé API.');
                } else {
                    await interaction.reply(`⚠️ Erreur ${status} lors de la récupération des informations de suivi.`);
                }
            } else {
                // Erreur réseau ou autre
                await interaction.reply('🌐 Une erreur réseau s\'est produite. Veuillez réessayer plus tard.');
            }
        }
    }
};

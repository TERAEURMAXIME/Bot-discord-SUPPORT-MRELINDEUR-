const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('previsions_meteo')
        .setDescription('Obtenez les prévisions météo pour les prochains jours')
        .addStringOption(option =>
            option.setName('ville')
                .setDescription('Nom de la ville')
                .setRequired(true)),
    async execute(interaction, { axios, WEATHER_API_KEY }) {
        const city = interaction.options.getString('ville');
        try {
            const response = await axios.get(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${WEATHER_API_KEY}&units=metric&lang=fr`);
            const forecast = response.data;
            const message = `Prévisions météo pour ${forecast.city.name} :\nTempérature minimum : ${forecast.list[0].main.temp_min}°C\nTempérature maximum : ${forecast.list[0].main.temp_max}°C`;
            await interaction.reply(message);
        } catch (error) {
            console.error('Erreur lors de la récupération des prévisions météo :', error);
            await interaction.reply('Impossible de récupérer les prévisions météo actuellement.');
        }
    }
};
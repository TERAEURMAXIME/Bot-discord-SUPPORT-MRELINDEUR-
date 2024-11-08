const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('meteo_actuelle')
        .setDescription('Obtenez la météo actuelle')
        .addStringOption(option =>
            option.setName('ville')
                .setDescription('Nom de la ville')
                .setRequired(true)),
    async execute(interaction, { axios, WEATHER_API_KEY }) {
        const city = interaction.options.getString('ville');
        try {
            const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric&lang=fr`);
            const weather = response.data;
            const message = `Météo actuelle à ${weather.name} :\nTempérature : ${weather.main.temp}°C\nCondition : ${weather.weather[0].description}`;
            await interaction.reply(message);
        } catch (error) {
            console.error('Erreur lors de la récupération de la météo :', error);
            await interaction.reply('Impossible de récupérer la météo actuellement.');
        }
    }
};
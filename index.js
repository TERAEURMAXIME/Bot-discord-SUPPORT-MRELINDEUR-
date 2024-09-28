const { Client, GatewayIntentBits, Routes, ActivityType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { SlashCommandBuilder } = require('@discordjs/builders');
const axios = require('axios');
const schedule = require('node-schedule');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const NEWS_API_URL = `https://newsapi.org/v2/top-headlines?country=fr&apiKey=${process.env.NEWS_API_KEY}`;
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST_API_URL = 'https://api.openweathermap.org/data/2.5/forecast';
const LA_POSTE_API_KEY = process.env.LA_POSTE_API_KEY;

const commands = [
    new SlashCommandBuilder()
        .setName('actualité')
        .setDescription('Obtenez les dernières actualités'),
    new SlashCommandBuilder()
        .setName('meteo_actuelle')
        .setDescription('Obtenez la météo actuelle')
        .addStringOption(option => 
            option.setName('ville')
                .setDescription('Nom de la ville')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('previsions_meteo')
        .setDescription('Obtenez les prévisions météo pour les prochains jours')
        .addStringOption(option => 
            option.setName('ville')
                .setDescription('Nom de la ville')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('suivi')
        .setDescription('Suivre un colis')
        .addStringOption(option => 
            option.setName('tracking_number')
                .setDescription('Le numéro de suivi du colis')
                .setRequired(true))
].map(command => command.toJSON());

client.once('ready', async () => {
    console.log('Bot connecté en tant que ' + client.user.tag);

    // Définir un statut personnalisé
    client.user.setPresence({
        activities: [{ name: 'mrelindeur.fr', type: ActivityType.Playing }],
        status: 'online'
    });

    // Planifier l'envoi des actualités tous les jours à 9 heures
    const channelId = '860985574197035029';  // Remplacez par l'ID de votre canal
    const channel = await client.channels.fetch(channelId);

    // Schedule job at 9 AM every day
    const job = schedule.scheduleJob({ hour: 9, minute: 0, dayOfWeek: new schedule.Range(1, 5) }, async () => {
        try {
            const response = await axios.get(NEWS_API_URL);
            const articles = response.data.articles.slice(0, 5);
            let newsMessages = [];
            let newsMessage = 'Voici les dernières actualités :\n';
            
            articles.forEach((article, index) => {
                const articleMessage = `${index + 1}. [${article.title}](${article.url})\n`;
                if ((newsMessage + articleMessage).length > 2000) {
                    newsMessages.push(newsMessage);
                    newsMessage = articleMessage;
                } else {
                    newsMessage += articleMessage;
                }
            });

            newsMessages.push(newsMessage);

            // Envoyer les messages dans le canal spécifié
            for (const message of newsMessages) {
                await channel.send(message);
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des actualités :', error);
        }
    });

});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() && !interaction.isButton()) return;

    const { commandName, options } = interaction;

    const weatherEmojis = {
        'ciel dégagé': '☀️',
        'peu nuageux': '🌤️',
        'partiellement nuageux': '🌤️',
        'couvert': '☁️',
        'légère pluie': '🌧️',
        'nuageux': '☁️',
        'pluie': '🌦️',
        'orage': '⛈️',
        'neige': '❄️',
        'brouillard': '🌫️'
    };

    // Commande actualité
    if (commandName === 'actualité') {
        try {
            const response = await axios.get(NEWS_API_URL);
            const articles = response.data.articles.slice(0, 5);
            let newsMessages = [];
            let newsMessage = 'Voici les dernières actualités :\n';
            
            articles.forEach((article, index) => {
                const articleMessage = `${index + 1}. [${article.title}](${article.url})\n`;
                if ((newsMessage + articleMessage).length > 2000) {
                    newsMessages.push(newsMessage);
                    newsMessage = articleMessage;
                } else {
                    newsMessage += articleMessage;
                }
            });

            newsMessages.push(newsMessage);

            // Répondre à l'interaction avec le premier message
            await interaction.reply(newsMessages[0]);

            // Envoyer les messages suivants en utilisant followUp
            for (let i = 1; i < newsMessages.length; i++) {
                await interaction.followUp(newsMessages[i]);
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des actualités :', error);
            if (!interaction.replied) {
                await interaction.reply('Je ne peux pas récupérer les actualités pour le moment.');
            } else {
                await interaction.followUp('Je ne peux pas récupérer les actualités pour le moment.');
            }
        }
    }

    // Commande meteo_actuelle
    if (commandName === 'meteo_actuelle') {
        const city = options.getString('ville');

        try {
            const currentWeatherResponse = await axios.get(`${WEATHER_API_URL}?q=${city}&appid=${process.env.WEATHER_API_KEY}&units=metric&lang=fr`);

            const currentWeather = currentWeatherResponse.data;
            const weatherCondition = currentWeather.weather[0].description;

            let weatherMessage = `Météo actuelle à ${currentWeather.name} :\n`;
            weatherMessage += `Température : ${currentWeather.main.temp}°C\n`;
            weatherMessage += `Condition : ${weatherEmojis[weatherCondition] || ''} ${weatherCondition}\n`;

            await interaction.reply(weatherMessage);
        } catch (error) {
            console.error('Erreur lors de la récupération de la météo :', error);
            if (!interaction.replied) {
                await interaction.reply('Je ne peux pas récupérer la météo pour le moment.');
            } else {
                await interaction.followUp('Je ne peux pas récupérer la météo pour le moment.');
            }
        }
    }

    // Commande previsions_meteo
    if (commandName === 'previsions_meteo') {
        const city = options.getString('ville');

        try {
            const forecastResponse = await axios.get(`${FORECAST_API_URL}?q=${city}&appid=${process.env.WEATHER_API_KEY}&units=metric&lang=fr`);

            const forecast = forecastResponse.data;

            let weatherMessage = `Prévisions pour ${forecast.city.name} :\n`;
            for (let i = 0; i < forecast.list.length; i += 8) {
                const date = new Date(forecast.list[i].dt * 1000);
                const weatherCondition = forecast.list[i].weather[0].description;
                weatherMessage += `${date.toLocaleDateString('fr-FR')}: Température min ${forecast.list[i].main.temp_min}°C, max ${forecast.list[i].main.temp_max}°C, condition ${weatherEmojis[weatherCondition] || ''} ${weatherCondition}\n`;
            }

            await interaction.reply(weatherMessage);
        } catch (error) {
            console.error('Erreur lors de la récupération des prévisions météo :', error);
            if (!interaction.replied) {
                await interaction.reply('Je ne peux pas récupérer les prévisions météo pour le moment.');
            } else {
                await interaction.followUp('Je ne peux pas récupérer les prévisions météo pour le moment.');
            }
        }
    }

    // Commande suivi
    if (commandName === 'suivi') {
        const trackingNumber = options.getString('tracking_number');

        try {
            const response = await axios.get(`https://api.laposte.fr/suivi/v2/idships/${trackingNumber}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Okapi-Key': LA_POSTE_API_KEY
                }
            });

            const shipment = response.data.shipment;
            const latestEvent = shipment.timeline.find(event => event.status === true);
            const status = latestEvent ? latestEvent.shortLabel : "Statut inconnu";
            const lastUpdate = latestEvent && latestEvent.date ? latestEvent.date : "Non disponible";

            let suiviMessage = `Statut actuel du colis ${trackingNumber} : **${status}**\nDernière mise à jour : **${lastUpdate}**`;
            await interaction.reply(suiviMessage);

            let fullDetails = `Historique des statuts de suivi pour le colis ${trackingNumber} :\n\n`;
            shipment.timeline.forEach(event => {
                fullDetails += `Date: ${event.date}\nStatut: ${event.shortLabel}\n\n`;
            });
            fullDetails += `\nLien pour plus d'informations : ${shipment.url}`;
            
            await interaction.user.send(fullDetails);
        } catch (error) {
            console.error('Erreur lors de la récupération des informations de suivi :', error);
            let errorMessage = 'Je ne peux pas récupérer les informations de suivi pour le moment.';
            if (error.response && error.response.status === 404) {
                errorMessage = 'Numéro de suivi invalide.';
            }
            if (!interaction.replied) {
                await interaction.reply(errorMessage);
            } else {
                await interaction.followUp(errorMessage);
            }
        }
    }

});

client.login(process.env.DISCORD_TOKEN);
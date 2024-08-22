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
                .setRequired(true))
].map(command => command.toJSON());

client.once('ready', async () => {
    console.log('Bot connecté en tant que ' + client.user.tag);

    // Définir un statut personnalisé
    client.user.setPresence({
        activities: [{ name: 'mrelindeur.fr', type: ActivityType.Playing }],
        status: 'online'
    });

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('Enregistrement des commandes slash.');
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
            { body: commands }
        );
        console.log('Commandes slash enregistrées avec succès.');
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement des commandes slash :', error);
    }

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

    const { commandName, customId, options } = interaction;

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

    // Vérifier si l'interaction est une commande ou un bouton
    if (interaction.isCommand()) {
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
                    if (error.response && error.response.status === 401) {
                        await interaction.reply('Erreur d\'autorisation avec l\'API météo. Vérifiez votre clé API.');
                    } else {
                        await interaction.reply('Je ne peux pas récupérer la météo pour le moment.');
                    }
                } else {
                    if (error.response && error.response.status === 401) {
                        await interaction.followUp('Erreur d\'autorisation avec l\'API météo. Vérifiez votre clé API.');
                    } else {
                        await interaction.followUp('Je ne peux pas récupérer la météo pour le moment.');
                    }
                }
            }
        }

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
                    if (error.response && error.response.status === 401) {
                        await interaction.reply('Erreur d\'autorisation avec l\'API météo. Vérifiez votre clé API.');
                    } else {
                        await interaction.reply('Je ne peux pas récupérer les prévisions météo pour le moment.');
                    }
                } else {
                    if (error.response && error.response.status === 401) {
                        await interaction.followUp('Erreur d\'autorisation avec l\'API météo. Vérifiez votre clé API.');
                    } else {
                        await interaction.followUp('Je ne peux pas récupérer les prévisions météo pour le moment.');
                    }
                }
            }
        }
    } else if (interaction.isButton()) {
        // Gérer les interactions de boutons
        if (customId === 'try_actualite') {
            // Simuler l'appel à la commande actualité
            await interaction.deferUpdate();
            const actualiteCommand = client.application.commands.cache.find(cmd => cmd.name === 'actualité');
            if (actualiteCommand) {
                await client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 2, // Interaction callback type for a deferred message
                        data: {
                            content: "Essai de la commande '/actualité'...",
                        },
                    },
                });
                await client.application.commands.execute(actualiteCommand, interaction);
            }
        } else if (customId === 'try_meteo_actuelle') {
            // Simuler l'appel à la commande meteo_actuelle
            await interaction.deferUpdate();
            const meteoActuelleCommand = client.application.commands.cache.find(cmd => cmd.name === 'meteo_actuelle');
            if (meteoActuelleCommand) {
                await client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 2,
                        data: {
                            content: "Essai de la commande '/meteo_actuelle'...",
                        },
                    },
                });
                await client.application.commands.execute(meteoActuelleCommand, interaction);
            }
        } else if (customId === 'try_previsions_meteo') {
            // Simuler l'appel à la commande previsions_meteo
            await interaction.deferUpdate();
            const previsionsMeteoCommand = client.application.commands.cache.find(cmd => cmd.name === 'previsions_meteo');
            if (previsionsMeteoCommand) {
                await client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 2,
                        data: {
                            content: "Essai de la commande '/previsions_meteo'...",
                        },
                    },
                });
                await client.application.commands.execute(previsionsMeteoCommand, interaction);
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);

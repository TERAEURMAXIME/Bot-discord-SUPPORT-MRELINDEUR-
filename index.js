const { Client, GatewayIntentBits, Routes, ActivityType, Collection } = require('discord.js');
const { REST } = require('@discordjs/rest');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: ['CHANNEL']
});

client.commands = new Collection();
const LA_POSTE_API_KEY = process.env.LA_POSTE_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

// Lecture des fichiers de commandes dans le dossier 'commands'
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const commands = [];

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
}

client.once('ready', async () => {
    console.log('Bot connecté en tant que ' + client.user.tag);

    client.user.setPresence({
        activities: [{ name: 'www.mrelindeur.fr', type: ActivityType.Playing }],
        status: 'online'
    });

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('Enregistrement des commandes slash globales.');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Commandes slash enregistrées globalement avec succès.');
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement des commandes slash :', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction, { axios: require('axios'), LA_POSTE_API_KEY, WEATHER_API_KEY });
    } catch (error) {
        console.error('Erreur lors de l\'exécution de la commande :', error);
        await interaction.reply('Une erreur est survenue lors de l\'exécution de la commande.');
    }
});

client.login(process.env.DISCORD_TOKEN);

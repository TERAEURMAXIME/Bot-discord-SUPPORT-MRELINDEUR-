const { REST, Routes } = require('discord.js');
const fs = require('fs');

let config;

try {
    const data = fs.readFileSync('config.json', 'utf8');
    config = JSON.parse(data);
} catch (err) {
    console.error('Erreur lors de la lecture ou de l\'analyse du fichier config.json:', err);
    process.exit(1);
}

const { token, clientId, guildId } = config;

const commands = [
    {
        name: 'salut',
        description: 'Répond avec Bonjour!',
    },
    {
        name: 'play',
        description: 'Joue une musique depuis YouTube',
        options: [
            {
                name: 'query',
                type: 3, // STRING
                description: 'Le nom ou l\'URL de la musique',
                required: true,
            },
        ],
    },
    {
        name: 'stop',
        description: 'Arrête la musique en cours',
    },
    {
        name: 'quit',
        description: 'Fait quitter le bot du canal vocal',
    },
];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

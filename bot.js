const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');
const config = require('./config.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.once('ready', () => {
  console.log('Bot is ready!');
});

client.on('messageCreate', async (message) => {
  console.log('Received message:', message.content);
  if (!message.guild) return;

  if (message.content.startsWith('/play')) {
    const args = message.content.split(' ').slice(1).join(' ');
    if (!args) {
      message.channel.send('Please provide a song name or URL.');
      return;
    }

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      message.channel.send('You need to be in a voice channel to play music.');
      return;
    }

    let connection;
    try {
      connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });
      console.log('Joined voice channel:', voiceChannel.name);
    } catch (error) {
      console.error('Error joining voice channel:', error);
      message.channel.send('There was an error connecting to the voice channel.');
      return;
    }

    let song;
    try {
      if (ytdl.validateURL(args)) {
        song = args;
      } else {
        const result = await ytSearch(args);
        if (result.videos.length === 0) {
          message.channel.send('No results found.');
          return;
        }
        song = result.videos[0].url;
      }
      console.log('Playing song:', song);
    } catch (error) {
      console.error('Error finding song:', error);
      message.channel.send('There was an error finding the song.');
      return;
    }

    let stream;
    try {
      stream = ytdl(song, { filter: 'audioonly' });
    } catch (error) {
      console.error('Error creating stream:', error);
      message.channel.send('There was an error creating the stream.');
      return;
    }

    const resource = createAudioResource(stream);
    const player = createAudioPlayer();

    player.play(resource);
    connection.subscribe(player);

    player.on(AudioPlayerStatus.Idle, () => {
      console.log('Playback finished, destroying connection');
      connection.destroy();
    });

    player.on('error', (error) => {
      console.error('Error playing audio:', error);
      message.channel.send('There was an error playing the audio.');
      connection.destroy();
    });

    message.channel.send(`Now playing: ${song}`);
  }

  if (message.content === '/stop') {
    const connection = getVoiceConnection(message.guild.id);
    if (connection) {
      connection.destroy();
      message.channel.send('Stopped playing music.');
    } else {
      message.channel.send('No music is currently being played.');
    }
  }

  if (message.content === '/quit') {
    const connection = getVoiceConnection(message.guild.id);
    if (connection) {
      connection.destroy();
      message.channel.send('Disconnected from the voice channel.');
    } else {
      message.channel.send('I am not in a voice channel.');
    }
  }
});

client.login(config.token).catch(err => {
  console.error('Error logging in:', err);
});

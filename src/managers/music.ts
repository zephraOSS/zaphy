import {
    createConnection,
    createStream,
    createResource,
    createPlayer,
    getSongInfo,
    getSongBySearch,
} from "../utils/music";

import * as Discord from "discord.js";

import moment from "moment";
import log from "../utils/log";

export default class Music {
    musicQueue;

    constructor() {
        this.musicQueue = new Map();
    }

    /**
     * @param {Discord.ChatInputCommandInteraction} interaction
     */
    async setup(interaction: Discord.ChatInputCommandInteraction) {
        const member = interaction.guild.members.cache.find(
                (member) => member.id === interaction.user.id
            ),
            voiceChannel = member?.voice.channel;

        if (!voiceChannel)
            return await interaction.reply("You are not in a voice channel!");

        await interaction.deferReply({});

        let searchQuery = await getSongBySearch(
                interaction.options.getString("search")
            ),
            serverQueue = this.musicQueue.get(interaction.guild.id);

        searchQuery = searchQuery.all[0];

        const songInfo = await getSongInfo(searchQuery.url);

        if (!serverQueue) {
            const queueItem = {
                textChannel: interaction.channel,
                voiceChannel: voiceChannel,
                connection: createConnection(
                    interaction.guild,
                    voiceChannel.id
                ),
                songs: [],
                volume: 5,
                playing: true,
            };

            this.musicQueue.set(interaction.guild.id, queueItem);

            queueItem.songs.push({
                song: searchQuery,
                user: interaction.user,
            });

            serverQueue = this.musicQueue.get(interaction.guild.id);

            try {
                await this.play(interaction.guild, interaction);
            } catch (err) {
                log("[MUSIC]", err);
                serverQueue.delete(interaction.guild.id);

                return await interaction.channel.send(err);
            }
        } else {
            serverQueue.songs.push({
                song: searchQuery,
                user: interaction.user,
            });

            if (searchQuery.thumbnail) {
                const embed = new Discord.EmbedBuilder()
                    .setColor("#A1D3F2")
                    .setTitle("Added to queue")
                    .setThumbnail(searchQuery.thumbnail)
                    .addFields([
                        {
                            name: "Name",
                            value: `[${searchQuery.title}](${searchQuery.url})`,
                            inline: false,
                        },
                        {
                            name: "Views",
                            value:
                                searchQuery.views.toLocaleString() || "Unknown",
                            inline: true,
                        },
                        {
                            name: "Duration",
                            value: searchQuery.duration.timestamp || "Unknown",
                            inline: true,
                        },
                        {
                            name: "Author",
                            value: `[${searchQuery.author.name}](${searchQuery.author.url})`,
                            inline: true,
                        },
                    ])
                    .setFooter({
                        text: interaction.user.tag || "Unknown",
                        iconURL: interaction.user.avatarURL(),
                    });

                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.editReply(
                    `Added to queue: **${songInfo.videoDetails.title}** from **${songInfo.videoDetails.author.name}**`
                );
            }
        }
    }

    /**
     * Play music
     * @param {Discord.Guild} guild
     * @param {Discord.ChatInputCommandInteraction} interaction
     */
    async play(
        guild: Discord.Guild,
        interaction: Discord.ChatInputCommandInteraction = null
    ) {
        const serverQueue = this.musicQueue.get(guild.id);

        if (!serverQueue) return;

        const { textChannel, connection, songs } = serverQueue;

        if (songs.length === 0) return this.musicQueue.delete(guild.id);

        const song = songs[0].song,
            user = songs[0].user;

        if (song.thumbnail) {
            const embed = new Discord.EmbedBuilder()
                .setColor("#A1D3F2")
                .setTitle("Now playing")
                .setThumbnail(song.thumbnail)
                .addFields([
                    {
                        name: "Name",
                        value: `[${song.title}](${song.url})`,
                        inline: false,
                    },
                    {
                        name: "Views",
                        value: song.views.toLocaleString() || "Unknown",
                        inline: true,
                    },
                    {
                        name: "Duration",
                        value: song.duration.timestamp || "Unknown",
                        inline: true,
                    },
                    {
                        name: "Ends at",
                        value: `<t:${moment(new Date())
                            .add(song.duration.seconds, "seconds")
                            .unix()}:T>`,
                        inline: true,
                    },
                    {
                        name: "Author",
                        value: `[${song.author.name}](${song.author.url})`,
                        inline: true,
                    },
                ])
                .setFooter({
                    text: user.tag || "Unknown",
                    iconURL: user.avatarURL(),
                });

            if (interaction) await interaction.editReply({ embeds: [embed] });
            else textChannel.send({ embeds: [embed] });
        } else {
            const songInfo = await getSongInfo(song.url);

            if (interaction)
                await interaction.editReply(
                    `Now playing **${songInfo.videoDetails.title}** from **${songInfo.videoDetails.author.name}**`
                );
            else
                textChannel.send(
                    `Now playing **${songInfo.videoDetails.title}** from **${songInfo.videoDetails.author.name}**`
                );
        }

        const stream = createStream(song.url),
            resource = createResource(stream),
            player = createPlayer();

        if (!resource) return;

        player.play(resource);
        connection.subscribe(player);

        // @ts-ignore
        player.on("finish", () => {
            songs.shift();
            this.play(guild);
        });

        // @ts-ignore
        player.on("idle", () => {
            songs.shift();

            if (songs.length === 0) {
                connection.destroy();
                this.musicQueue.delete(guild.id);
            } else this.play(guild);
        });
    }

    /**
     * Skip music
     * @param {Discord.ChatInputCommandInteraction} interaction
     */
    async skip(interaction: Discord.ChatInputCommandInteraction) {
        const serverQueue = this.musicQueue.get(interaction.guild.id),
            voiceChannel = interaction.guild.members.cache.find(
                (member) => member.id === interaction.user.id
            )?.voice.channel;

        if (!serverQueue) return interaction.reply("There is nothing to skip!");
        if (!voiceChannel)
            return interaction.reply("You are not in a voice channel!");

        serverQueue.songs.shift();

        await this.play(interaction.guild);
        await interaction.reply("Skipped the current song!");
    }

    /**
     * Stop music
     * @param {Discord.ChatInputCommandInteraction} interaction
     */
    async stop(interaction: Discord.ChatInputCommandInteraction) {
        const serverQueue = this.musicQueue.get(interaction.guild.id),
            voiceChannel = interaction.guild.members.cache.find(
                (member) => member.id === interaction.user.id
            )?.voice.channel;

        if (!serverQueue) return interaction.reply("There is nothing to stop!");
        if (!voiceChannel)
            return interaction.reply("You are not in a voice channel!");

        serverQueue.songs = [];
        serverQueue.connection.destroy();
        this.musicQueue.delete(interaction.guild.id);

        await interaction.reply("Stopped the music!");
    }

    /**
     * Lists the current queue
     * @param {Discord.ChatInputCommandInteraction} interaction
     */
    async listQueue(interaction: Discord.ChatInputCommandInteraction) {
        const serverQueue = this.musicQueue.get(interaction.guild.id);

        if (!serverQueue) return interaction.reply("The queue is empty!");

        const songs = serverQueue.songs;

        if (songs.length === 0) return interaction.reply("The queue is empty!");

        await interaction.deferReply({});

        const embed = new Discord.EmbedBuilder()
            .setColor("#A1D3F2")
            .setTitle("Queue")
            .setDescription(
                songs
                    .map(
                        (song, index) =>
                            `${index + 1}. [${song.song.title}](${
                                song.song.url
                            })\n${song.user.tag}`
                    )
                    .join("\n\n")
            )
            .setFooter({
                text: interaction.user.tag || "Unknown",
                iconURL: interaction.user.avatarURL(),
            });

        await interaction.editReply({ embeds: [embed] });
    }
}

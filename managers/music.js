const Discord = require("discord.js"),
    moment = require("moment"),
    {
        createConnection,
        createStream,
        createResource,
        createPlayer,
        getSongInfo,
        getSongBySearch,
    } = require("../utils/music");

class Music {
    constructor() {
        this.musicQueue = new Map();
    }

    /**
     * @param {Discord.Interaction} interaction
     */
    async setup(interaction) {
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
            const queueContruct = {
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

            this.musicQueue.set(interaction.guild.id, queueContruct);

            queueContruct.songs.push({
                song: searchQuery,
                user: interaction.user,
            });

            serverQueue = this.musicQueue.get(interaction.guild.id);

            try {
                this.play(interaction.guild, interaction);
            } catch (err) {
                console.log("[MUSIC]", err);
                serverQueue.delete(interaction.guild.id);

                return await interaction.channel.send(err);
            }
        } else {
            serverQueue.songs.push({
                song: searchQuery,
                user: interaction.user,
            });

            if (searchQuery.thumbnail) {
                const embed = new Discord.MessageEmbed()
                    .setColor("#A1D3F2")
                    .setTitle("Added to queue")
                    .setThumbnail(searchQuery.thumbnail)
                    .addField(
                        "Name",
                        `[${searchQuery.title}](${searchQuery.url})`,
                        false
                    )
                    .addField(
                        "Views",
                        searchQuery.views.toLocaleString() || "Unknown",
                        true
                    )
                    .addField(
                        "Duration",
                        searchQuery.duration.timestamp || "Unknown",
                        true
                    )
                    .addField(
                        "Author",
                        `[${searchQuery.author.name}](${searchQuery.author.url})`,
                        true
                    )
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
     * @param {Discord.Interaction} interaction
     */
    async play(guild, interaction = false) {
        const serverQueue = this.musicQueue.get(guild.id);

        if (!serverQueue) return;

        const { textChannel, connection, songs } = serverQueue;

        if (songs.length === 0) return this.musicQueue.delete(guild.id);

        const song = songs[0].song,
            user = songs[0].user;

        if (song.thumbnail) {
            const embed = new Discord.MessageEmbed()
                .setColor("#A1D3F2")
                .setTitle("Now playing")
                .setThumbnail(song.thumbnail)
                .addField("Name", `[${song.title}](${song.url})`, false)
                .addField(
                    "Views",
                    song.views.toLocaleString() || "Unknown",
                    true
                )
                .addField(
                    "Duration",
                    song.duration.timestamp || "Unknown",
                    true
                )
                .addField(
                    "Ends at",
                    `<t:${moment(new Date())
                        .add(song.duration.seconds, "seconds")
                        .unix()}:T>`,
                    true
                )
                .addField(
                    "Author",
                    `[${song.author.name}](${song.author.url})`,
                    true
                )
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
            player = createPlayer(resource, stream);

        if (!resource) return;

        player.play(resource);
        connection.subscribe(player);

        player.on("finish", () => {
            songs.shift();
            this.play(guild);
        });

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
     * @param {Discord.Interaction} interaction
     */
    async skip(interaction) {
        const serverQueue = this.musicQueue.get(interaction.guild.id),
            voiceChannel = interaction.guild.members.cache.find(
                (member) => member.id === interaction.user.id
            )?.voice.channel;

        if (!serverQueue) return interaction.reply("There is nothing to skip!");
        if (!voiceChannel)
            return interaction.reply("You are not in a voice channel!");

        serverQueue.songs.shift();

        this.play(interaction.guild);

        await interaction.reply("Skipped the current song!");
    }

    /**
     * Stop music
     * @param {Discord.Interaction} interaction
     */
    async stop(interaction) {
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
     * @param {Discord.Interaction} interaction
     */
    async listQueue(interaction) {
        const serverQueue = this.musicQueue.get(interaction.guild.id);

        if (!serverQueue) return interaction.reply("The queue is empty!");

        const songs = serverQueue.songs;

        if (songs.length === 0) return interaction.reply("The queue is empty!");

        await interaction.deferReply({});

        const embed = new Discord.MessageEmbed()
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

module.exports = Music;

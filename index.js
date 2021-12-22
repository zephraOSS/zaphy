const Discord = require("discord.js"),
    config = require("./config.json"),
    client = new Discord.Client({
        intents: [
            Discord.Intents.FLAGS.GUILDS,
            Discord.Intents.FLAGS.GUILD_MESSAGES,
            Discord.Intents.FLAGS.DIRECT_MESSAGES,
            Discord.Intents.FLAGS.GUILD_VOICE_STATES,
            Discord.Intents.FLAGS.GUILD_MEMBERS,
        ],
        partials: ["CHANNEL"],
    }),
    { isValidURL } = require("./utils/functions"),
    { createSlashCommand, submitSlashCommands } = require("./utils/commands"),
    {
        createConnection,
        createStream,
        createResource,
        createPlayer,
        getSongInfo,
        getSongBySearch,
    } = require("./utils/music");

let musicQueue = new Map();

client.on("ready", () => {
    const guilds = client.guilds.cache;

    console.log(`[READY] ${client.user.username} was started`);
    console.log(`[READY] ${guilds.size} guilds were found`);

    guilds.forEach((guild) => {
        console.log(`[READY] Creating basic commands for ${guild.name}`);
        createBasicCommands(guild.id);
    });
});

client.on("guildCreate", (guild) => {
    console.log("[GUILD_CREATE] Creating basic commands for " + guild.name);
    createBasicCommands(guild.id);
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === "ping") {
        await interaction.reply("Pong!");
    } else if (commandName === "server") {
        const embed = new Discord.MessageEmbed()
            .setColor("#A1D3F2")
            .setThumbnail(interaction.guild.iconURL())
            .addField(
                "Name",
                `${interaction.guild.name} (${interaction.guild.id})`,
                false
            )
            .addField(
                "Creation Date",
                `<t:${Math.round(
                    interaction.guild.createdTimestamp / 1000
                )}:F>`,
                false
            )
            .addField(
                "Roles",
                interaction.guild.roles.cache
                    .map((r) => `\`${r.name}\``)
                    .join(", ") || "Not available",
                false
            );

        await interaction.reply({ embeds: [embed] });
    } else if (commandName === "user") {
        const user = interaction.options.getUser("user");

        if (user) {
            const member = interaction.guild.members.cache.find(
                    (member) => member.id === user.id
                ),
                embed = new Discord.MessageEmbed()
                    .setColor("#A1D3F2")
                    .setThumbnail(user.avatarURL())
                    .addField("Name", `${user.tag} (${user.id})`, false)
                    .addField(
                        "Join Date",
                        `<t:${Math.round(member.joinedTimestamp / 1000)}:F>`,
                        false
                    )
                    .addField(
                        "Creation Date",
                        `<t:${Math.round(user.createdTimestamp / 1000)}:F>`,
                        false
                    )
                    .addField(
                        "Roles",
                        member.roles.cache
                            .map((r) => `\`${r.name}\``)
                            .join(", ") || "Not available",
                        false
                    );

            await interaction.reply({ embeds: [embed] });
        } else {
            const member = interaction.guild.members.cache.find(
                    (member) => member.id === interaction.user.id
                ),
                embed = new Discord.MessageEmbed()
                    .setColor("#A1D3F2")
                    .setThumbnail(interaction.user.avatarURL())
                    .addField(
                        "Name",
                        `${interaction.user.tag} (${interaction.user.id})`,
                        false
                    )
                    .addField(
                        "Join Date",
                        `<t:${Math.round(member.joinedTimestamp / 1000)}:F>`,
                        false
                    )
                    .addField(
                        "Creation Date",
                        `<t:${Math.round(
                            interaction.user.createdTimestamp / 1000
                        )}:F>`,
                        false
                    )
                    .addField(
                        "Roles",
                        member.roles.cache
                            .map((r) => `\`${r.name}\``)
                            .join(", ") || "Not available",
                        false
                    );

            await interaction.reply({ embeds: [embed] });
        }
    } else if (commandName === "play") {
        musicSetup(interaction);
    }
});

/**
 * Creates basic commands for the guild
 * @param {string} guildId
 */
function createBasicCommands(guildId) {
    const commands = [
        createSlashCommand("ping", "Replies with pong!", []),
        createSlashCommand("server", "Replies with server info!", []),
        createSlashCommand("user", "Replies with user info!", {
            options: [
                {
                    type: "userOption",
                    name: "user",
                    description: "Mention an user",
                },
            ],
        }),
        createSlashCommand("play", "Play music from YouTube", {
            options: [
                {
                    type: "stringOption",
                    name: "search",
                    description: "YouTube search query or url",
                    required: true,
                },
            ],
        }),
    ].map((command) => command.toJSON());

    submitSlashCommands(commands, guildId);
}

/**
 * @param {Discord.Interaction} interaction
 */
async function musicSetup(interaction) {
    const member = interaction.guild.members.cache.find(
            (member) => member.id === interaction.user.id
        ),
        voiceChannel = member?.voice.channel;

    if (!voiceChannel)
        return await interaction.reply("You are not in a voice channel!");

    let searchQuery = interaction.options.getString("search"),
        serverQueue = musicQueue.get(interaction.guild.id);

    if (!isValidURL(searchQuery)) {
        searchQuery = await getSongBySearch(
            interaction.options.getString("search")
        );

        searchQuery = searchQuery.all[0];
    } else searchQuery = { url: searchQuery };

    const songInfo = await getSongInfo(searchQuery.url);

    if (!serverQueue) {
        const queueContruct = {
            textChannel: interaction.channel,
            voiceChannel: voiceChannel,
            connection: createConnection(interaction.guild, voiceChannel.id),
            songs: [],
            volume: 5,
            playing: true,
        };

        musicQueue.set(interaction.guild.id, queueContruct);

        queueContruct.songs.push(searchQuery);

        serverQueue = musicQueue.get(interaction.guild.id);

        try {
            musicPlay(interaction.guild, interaction);
        } catch (err) {
            console.log("[MUSIC]", err);
            serverQueue.delete(interaction.guild.id);

            return await interaction.channel.send(err);
        }
    } else {
        serverQueue.songs.push(searchQuery);

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
                );

            await interaction.reply({ embeds: [embed] });
        } else {
            await interaction.reply(
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
async function musicPlay(guild, interaction = false) {
    const serverQueue = musicQueue.get(guild.id);

    if (!serverQueue) return;

    const { textChannel, connection, songs } = serverQueue;

    if (songs.length === 0) return musicQueue.delete(guild.id);

    const song = songs[0];

    if (song.thumbnail) {
        const embed = new Discord.MessageEmbed()
            .setColor("#A1D3F2")
            .setTitle("Now playing")
            .setThumbnail(song.thumbnail)
            .addField("Name", `[${song.title}](${song.url})`, false)
            .addField("Views", song.views.toLocaleString() || "Unknown", true)
            .addField("Duration", song.duration.timestamp || "Unknown", true)
            .addField(
                "Author",
                `[${song.author.name}](${song.author.url})`,
                true
            );

        if (interaction) await interaction.reply({ embeds: [embed] });
        else textChannel.send({ embeds: [embed] });
    } else {
        textChannel.send(
            `Now playing **${song.videoDetails.title}** from **${song.videoDetails.author.name}**`
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
        musicPlay(guild);
    });

    player.on("idle", () => {
        connection.destroy();
    });
}

client.login(config.discord.token);

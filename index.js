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
        const member = interaction.guild.members.cache.find(
                (member) => member.id === interaction.user.id
            ),
            voiceChannel = member?.voice.channel;

        if (!voiceChannel)
            return await interaction.reply("You are not in a voice channel!");

        let searchQuery = interaction.options.getString("search");

        if (!isValidURL(searchQuery)) {
            searchQuery = await getSongBySearch(
                interaction.options.getString("search")
            );

            searchQuery = searchQuery.all[0];
        } else searchQuery = { url: searchQuery };

        const connection = createConnection(interaction.guild, voiceChannel.id),
            stream = createStream(searchQuery.url),
            resource = createResource(stream),
            player = createPlayer(resource, stream),
            songInfo = await getSongInfo(searchQuery.url);

        if (!resource) return await interaction.reply("There was an error!");

        if (searchQuery.thumbnail) {
            const embed = new Discord.MessageEmbed()
                .setColor("#A1D3F2")
                .setThumbnail(searchQuery.thumbnail)
                .addField(
                    "Name",
                    searchQuery.title || "Unknown",
                    false
                )
                .addField(
                    "Views",
                    searchQuery.views.toLocaleString() || "Unknown",
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
                `Now playing **${songInfo.videoDetails.title}** from **${songInfo.videoDetails.author.name}**`
            );
        }

        player.play(resource);
        connection.subscribe(player);

        player.on("idle", () => connection.destroy());
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

client.login(config.discord.token);

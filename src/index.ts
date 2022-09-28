import { createSlashCommand, submitSlashCommands } from "./utils/commands";
import { init as initAMRPC } from "./managers/amrpcPresence";

import * as Discord from "discord.js";

import Music from "./managers/music";
import config from "./config.json";
import log from "./utils/log";

const client = new Discord.Client({
        intents: [
            Discord.GatewayIntentBits.Guilds,
            Discord.GatewayIntentBits.GuildMessages,
            Discord.GatewayIntentBits.GuildVoiceStates,
            Discord.GatewayIntentBits.GuildMembers,
            Discord.GatewayIntentBits.GuildPresences,
            Discord.GatewayIntentBits.DirectMessages,
        ],
        partials: [Discord.Partials.Channel],
    }),
    music = new Music();

client.on("ready", () => {
    const guilds = client.guilds.cache;

    log(`[READY] ${client.user.username} was started`);
    log(`[READY] ${guilds.size} guilds were found`);

    createGlobalCommands();
    initAMRPC(client);

    guilds.forEach((guild) => {
        log(`[READY] Creating basic commands for ${guild.name}`);
        createBasicCommands(guild.id);
    });
});

client.on("guildCreate", (guild) => {
    log("[GUILD_CREATE] Creating basic commands for " + guild.name);
    createBasicCommands(guild.id);
});

client.on(
    "interactionCreate",
    async (interaction: Discord.ChatInputCommandInteraction) => {
        if (!interaction.isCommand()) return;

        switch (interaction.commandName) {
            case "ping": {
                await interaction.reply("Pong!");

                break;
            }

            case "server": {
                const embed = new Discord.EmbedBuilder()
                    .setColor("#A1D3F2")
                    .setThumbnail(interaction.guild.iconURL())
                    .addFields([
                        {
                            name: "Name",
                            value: `${interaction.guild.name} (${interaction.guild.id})`,
                            inline: false,
                        },
                        {
                            name: "Creation Date",
                            value: `<t:${Math.round(
                                interaction.guild.createdTimestamp / 1000
                            )}:F>`,
                            inline: false,
                        },
                        {
                            name: "Roles",
                            value:
                                interaction.guild.roles.cache
                                    .map((r) => `\`${r.name}\``)
                                    .join(", ") || "Not available",
                            inline: false,
                        },
                    ]);

                await interaction.reply({ embeds: [embed] });

                break;
            }

            case "user": {
                const user =
                    interaction.options.getUser("user") ?? interaction.user;

                if (user) {
                    const member = interaction.guild.members.cache.find(
                            (member) => member.id === user.id
                        ),
                        embed = new Discord.EmbedBuilder()
                            .setColor("#A1D3F2")
                            .setThumbnail(user.avatarURL())
                            .addFields([
                                {
                                    name: "Name",
                                    value: `${user.tag} (${user.id})`,
                                    inline: false,
                                },
                                {
                                    name: "Join Date",
                                    value: `<t:${Math.round(
                                        member.joinedTimestamp / 1000
                                    )}:F>`,
                                    inline: false,
                                },
                                {
                                    name: "Creation Date",
                                    value: `<t:${Math.round(
                                        user.createdTimestamp / 1000
                                    )}:F>`,
                                    inline: false,
                                },
                                {
                                    name: "Roles",
                                    value:
                                        member.roles.cache
                                            .map((r) => `\`${r.name}\``)
                                            .join(", ") || "Not available",
                                    inline: false,
                                },
                            ]);

                    await interaction.reply({ embeds: [embed] });
                }

                break;
            }

            case "play": {
                await music.setup(interaction);

                break;
            }

            case "skip": {
                await music.skip(interaction);

                break;
            }

            case "stop": {
                await music.stop(interaction);

                break;
            }

            case "queue": {
                await music.listQueue(interaction);

                break;
            }
        }
    }
);

/**
 * Creates basic commands for the guild
 * @param {string} guildId
 */
function createBasicCommands(guildId) {
    const commands = [].map((command) => command.toJSON());

    submitSlashCommands(commands, guildId);
}

function createGlobalCommands() {
    const commands = [
        createSlashCommand("ping", "Replies with pong!", {}),
        createSlashCommand("server", "Replies with server info!", {}),
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
        createSlashCommand("skip", "Skips the current song", {}),
        createSlashCommand("stop", "Stops the music", {}),
        createSlashCommand("queue", "Lists all items in the music queue", {}),
    ].map((command: any) => command.toJSON());

    submitSlashCommands(commands);
}

client.login(config.discord.token);

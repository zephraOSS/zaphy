const { SlashCommandBuilder } = require("@discordjs/builders"),
    { REST } = require("@discordjs/rest"),
    { Routes } = require("discord-api-types/v9"),
    config = require("../config.json"),
    rest = new REST({ version: "9" }).setToken(config.discord.token),
    log = require("./log.js");

module.exports = {
    /**
     * Creates a new slash command
     * @param {string} name The name of the command
     * @param {string} description The description of the command
     * @param {object} options The options of the command
     * @return {SlashCommandBuilder} The created command
     */
    createSlashCommand(name, description, { options = [] } = {}) {
        if (!name || !description)
            return log("[COMMANDS] No name or description given!");
        if (options && !Array.isArray(options))
            return log("[COMMANDS] Commands must be an array!");

        let command = new SlashCommandBuilder()
            .setName(name)
            .setDescription(description);

        for (let i = 0; i < options.length; i++) {
            const optionData = options[i];

            if (!optionData.type || !optionData.name || !optionData.description)
                return log("[COMMANDS] Option data is missing!");

            if (optionData.type === "subcommand") {
                command.addSubcommand((option) =>
                    option
                        .setName(optionData.name)
                        .setDescription(optionData.description)
                );
            } else if (optionData.type === "userOption") {
                command.addUserOption((option) =>
                    option
                        .setName(optionData.name)
                        .setDescription(optionData.description)
                        .setRequired(optionData.required || false)
                );
            } else if (optionData.type === "stringOption") {
                command.addStringOption((option) =>
                    option
                        .setName(optionData.name)
                        .setDescription(optionData.description)
                        .setRequired(optionData.required || false)
                );
            }
        }

        log(
            `[COMMANDS] Created command: ${name} with ${options.length} options`
        );

        return command;
    },

    /**
     * Submits commands to the Discord API
     * @param {array} commands Array of commands to submit
     * @param {string} guildId The guild ID to submit the commands to. Leave empty to create global commands.
     */
    submitSlashCommands(commands, guildId = false) {
        if (!rest) return log("[COMMANDS] REST client is not initialized!");
        if (!commands) return "No commands given!";
        if (!Array.isArray(commands)) return "Commands must be an array!";
        if (commands.length === 0) return "Commands array is empty!";

        if (guildId) {
            rest.put(
                Routes.applicationGuildCommands(config.discord.appId, guildId),
                {
                    body: commands,
                }
            )
                .then(() =>
                    log(
                        `[COMMANDS] Successfully registered ${commands.length} application commands for ${guildId}.`
                    )
                )
                .catch(console.error);
        } else {
            rest.put(Routes.applicationCommands(config.discord.appId), {
                body: commands,
            })
                .then(() =>
                    log(
                        `[COMMANDS] Successfully registered ${commands.length} global commands.`
                    )
                )
                .catch(console.error);
        }
    },
};

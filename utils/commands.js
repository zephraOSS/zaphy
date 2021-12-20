const { SlashCommandBuilder } = require("@discordjs/builders"),
   { REST } = require("@discordjs/rest"),
   { Routes } = require("discord-api-types/v9"),
   config = require("../config.json"),
   rest = new REST({ version: "9" }).setToken(config.discord.token);

module.exports = {
   createSlashCommand(name, description, { options = [] } = {}) {
      if (!name || !description)
         return console.log("[COMMANDS] No name or description given!");
      if (options && !Array.isArray(options))
         return console.log("[COMMANDS] Commands must be an array!");

      let command = new SlashCommandBuilder()
         .setName(name)
         .setDescription(description);

      for (let i = 0; i < options.length; i++) {
         const optionData = options[i];

         if (!optionData.type || !optionData.name || !optionData.description) return console.log("[COMMANDS] Option data is missing!");

         if (optionData.type === "subcommand") {
            command.addUserOption((option) =>
               option
                  .setName(optionData.name)
                  .setDescription(optionData.description)
            );
         } else if (optionData.type === "userOption") {
            command.addUserOption((option) =>
               option
                  .setName(optionData.name)
                  .setDescription(optionData.description)
                  .setRequired(optionData.required ? optionData.required : false)
            );
         }
      }

      console.log(
         `[COMMANDS] Created command: ${name} with ${options.length} options`
      );

      return command;
   },
   submitSlashCommands(guildId, commands) {
      if (!rest)
         return console.log("[COMMANDS] REST client is not initialized!");
      if (!guildId || !commands)
         return console.log("[COMMANDS] No guildId or commands given!");
      if (!Array.isArray(commands))
         return console.log("[COMMANDS] Commands must be an array!");
      if (commands.length === 0)
         return console.log("[COMMANDS] Commands array is empty!");

      rest
         .put(Routes.applicationGuildCommands(config.discord.appId, guildId), {
            body: commands,
         })
         .then(() =>
            console.log(
               `[COMMANDS] Successfully registered application commands for ${guildId}.`
            )
         )
         .catch(console.error);
   },
};

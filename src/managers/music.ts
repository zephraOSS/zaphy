import { disTube } from "../index";

import * as Discord from "discord.js";

import { createNowPlayingEmbed, createQueueAddedEmbed } from "../utils/music";

export default class Music {
    private userInitiatedPlayMap = new Map();

    constructor() {
        disTube.on("playSong", (queue, song) => {
            const guildId = queue.textChannel.guildId;

            if (this.userInitiatedPlayMap.get(guildId))
                return this.userInitiatedPlayMap.delete(guildId);

            queue.textChannel.send({ embeds: [createNowPlayingEmbed(song)] });
        }).on("error", (channel, error) => {
            if (channel) channel.send(`An error encountered: ${error}`);
            else console.error(error);
        });
    }

    /**
     * Play music
     * @param {Discord.Guild} guild
     * @param {Discord.ChatInputCommandInteraction} interaction
     */
    async play(
        guild: Discord.Guild,
        interaction: Discord.ChatInputCommandInteraction = null,
    ) {
        const member = guild.members.cache.find(
                (member) => member.id === interaction.user.id,
            ),
            song = interaction.options.getString("search") || null;

        if (!member.voice.channel)
            return interaction.reply("You are not in a voice channel!");

        if (!song)
            return interaction.reply("You need to specify a song to play!");

        this.userInitiatedPlayMap.set(interaction.guildId, true);

        await interaction.deferReply({});

        await disTube.play(member.voice.channel, song, {
            member,
            textChannel: interaction.channel,
        }).then(() => {
            const queue = disTube.getQueue(interaction.guildId);

            if (disTube.getQueue(interaction.guildId).songs.length > 1)
                interaction.editReply({ embeds: [createQueueAddedEmbed(queue.songs[queue.songs.length - 1])] });
            else
                interaction.editReply({ embeds: [createNowPlayingEmbed(queue.songs[0])] });
        });
    }

    /**
     * Skip music
     * @param {Discord.ChatInputCommandInteraction} interaction
     */
    async skip(interaction: Discord.ChatInputCommandInteraction) {
        const queue = disTube.getQueue(interaction.guildId);

        if (!queue) return interaction.reply("There is nothing to skip!");

        await queue.skip();
        await interaction.reply("Skipped the current song!");
    }

    /**
     * Stop music
     * @param {Discord.ChatInputCommandInteraction} interaction
     */
    async stop(interaction: Discord.ChatInputCommandInteraction) {
        if (!disTube.getQueue(interaction.guildId)) return interaction.reply("There is nothing to stop!");

        await disTube.stop(interaction.guildId);
        await interaction.reply("Stopped the music!");
    }

    /**
     * Lists the current queue
     * @param {Discord.ChatInputCommandInteraction} interaction
     */
    async listQueue(interaction: Discord.ChatInputCommandInteraction) {
        const songs = disTube.getQueue(interaction.guildId)?.songs;

        if (songs.length === 0) return interaction.reply("The queue is empty!");

        await interaction.deferReply({});

        const embed = new Discord.EmbedBuilder()
            .setColor("#A1D3F2")
            .setTitle("Queue")
            .setDescription(
                songs
                    .map(
                        (song, index) =>
                            `${index + 1}. [${song.name}](${
                                song.url
                            })\n${song.user.tag}`,
                    )
                    .join("\n\n"),
            )
            .setFooter({
                text: interaction.user.tag || "Unknown",
                iconURL: interaction.user.avatarURL(),
            });

        await interaction.editReply({ embeds: [embed] });
    }
}

import log from "./log";
import moment from "moment/moment";

import * as Discord from "discord.js";

/**
 * Create a now playing embed
 * @return {Discord.Embed} embed
 * @param song
 */
export function createNowPlayingEmbed(
    song
): Discord.EmbedBuilder | any {
    if (!song) return log("[MUSIC][CREATE_NOW_PLAYING_EMBED] Song is required");

    return new Discord.EmbedBuilder()
        .setColor("#A1D3F2")
        .setTitle("Now playing")
        .setThumbnail(song.thumbnail)
        .addFields([
            {
                name: "Name",
                value: `[${song.name}](${song.url})`,
                inline: false,
            },
            {
                name: "Views",
                value: song.views.toLocaleString() || "Unknown",
                inline: true,
            },
            {
                name: "Duration",
                value: song.formattedDuration || "Unknown",
                inline: true,
            },
            {
                name: "Ends at",
                value: `<t:${moment(new Date())
                    .add(song.duration, "seconds")
                    .unix()}:T>`,
                inline: true,
            },
            {
                name: "Author",
                value: `[${song.uploader.name}](${song.uploader.url})`,
                inline: true,
            },
        ])
        .setFooter({
            text: song.user.tag || "Unknown",
            iconURL: song.user.avatarURL(),
        });
}

/**
 * Create a queue embed
 * @return {Discord.Embed} embed
 * @param song
 */
export function createQueueAddedEmbed(
    song
): Discord.EmbedBuilder | any {
    if (!song) return log("[MUSIC][CREATE_QUEUE_ADDED_EMBED] Song is required");

    return new Discord.EmbedBuilder()
        .setColor("#A1D3F2")
        .setTitle("Added to queue")
        .setThumbnail(song.thumbnail)
        .addFields([
            {
                name: "Name",
                value: `[${song.name}](${song.url})`,
                inline: false,
            },
            {
                name: "Views",
                value:
                    song.views.toLocaleString() || "Unknown",
                inline: true,
            },
            {
                name: "Duration",
                value: song.formattedDuration || "Unknown",
                inline: true,
            },
            {
                name: "Author",
                value: `[${song.uploader.name}](${song.uploader.url})`,
                inline: true,
            },
        ])
        .setFooter({
            text: song.user.tag || "Unknown",
            iconURL: song.user.avatarURL(),
        });
}
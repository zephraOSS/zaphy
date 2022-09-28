import {
    AudioPlayer,
    AudioResource,
    StreamType,
    createAudioPlayer,
    createAudioResource,
    joinVoiceChannel,
    VoiceConnection,
} from "@discordjs/voice";
import { Guild } from "discord.js";

import ytdl from "ytdl-core";
import yts from "yt-search";
import log from "./log";

/**
 * Creates a new connection
 * @param {Guild} guild The guild to create the connection for
 * @param {string} channelId The channel ID to join
 * @return {VoiceConnection} The created connection
 */
export function createConnection(
    guild: Guild,
    channelId: string
): VoiceConnection | any {
    if (!guild) return log("[MUSIC][CREATE_CONNECTION] Guild is required");
    if (!channelId) return log("[MUSIC] Channel ID is required");

    return joinVoiceChannel({
        channelId: channelId,
        guildId: guild.id,
        // @ts-ignore
        adapterCreator: guild.voiceAdapterCreator,
    });
}

/**
 * Creates a new stream
 * @param {string} url The URL of the stream
 * @return {any} The created stream
 */
export function createStream(url: string) {
    if (!url) return log("[MUSIC][CREATE_STREAM] URL is required");

    return ytdl(url, {
        filter: "audioonly",
    });
}

/**
 * Creates a new audio resource
 * @param {any} stream The stream to create the resource from
 * @return {AudioResource} The created audio resource
 */
export function createResource(stream: any): AudioResource | any {
    if (!stream) return log("[MUSIC][CREATE_RESOURCE] Stream is required");
    if (!stream.on)
        return log("[MUSIC][CREATE_RESOURCE] Stream is not readable");

    return createAudioResource(stream, {
        inputType: StreamType.Arbitrary,
    });
}

/**
 * Creates a new audio player
 * @return {AudioPlayer} The created audio player
 */
export function createPlayer(): AudioPlayer {
    return createAudioPlayer();
}

/**
 * Get information about a song
 * @param {string} url The URL of the song
 */
export function getSongInfo(url: string) {
    return ytdl.getInfo(url);
}

/**
 * Get song information from a search query
 * @param {string} query The search query
 */
export function getSongBySearch(query: string) {
    return yts(query);
}

const ytdl = require("ytdl-core"),
    yts = require("yt-search"),
    {
        AudioPlayerStatus,
        StreamType,
        createAudioPlayer,
        createAudioResource,
        joinVoiceChannel,
        VoiceConnection,
        AudioPlayer,
    } = require("@discordjs/voice");

module.exports = {
    /**
     * Creates a new connection
     * @param {Guild} guild The guild to create the connection for
     * @param {string} channelId The channel ID to join
     * @return {Promise<VoiceConnection>} The created connection
     */
    createConnection(guild, channelId) {
        if (!guild) throw new Error("Guild is required");
        if (!channelId) throw new Error("Channel ID is required");

        return joinVoiceChannel({
            channelId: channelId,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
        });
    },

    /**
     * Creates a new stream
     * @param {string} url The URL of the stream
     * @return {Promise<ReadableStream>} The created stream
     */
    createStream(url) {
        if (!url) throw new Error("URL is required");

        return ytdl(url, {
            filter: "audioonly",
        });
    },

    /**
     * Creates a new audio resource
     * @param {ReadableStream} stream The stream to create the resource from
     * @return {Promise<AudioResource>} The created audio resource
     */
    createResource(stream) {
        if (!stream) throw new Error("Stream is required");
        if (!stream.on) throw new Error("Stream is not readable");

        return createAudioResource(stream, {
            inputType: StreamType.Arbitrary,
        });
    },

    /**
     * Creates a new audio player
     * @param {VoiceConnection} connection The connection to create the player for
     * @param {AudioResource} resource The resource to create the player for
     * @return {Promise<AudioPlayer>} The created audio player
     */
    createPlayer(connection, resource) {
        if (!connection) throw new Error("Connection is required");
        if (!resource) throw new Error("Resource is required");

        return createAudioPlayer(connection, resource);
    },

    /**
     * Get information about a song
     * @param {string} url The URL of the song
     */
    getSongInfo(url) {
        return ytdl.getInfo(url);
    },

    /**
     * Get song information from a search query
     * @param {string} query The search query
     */
    getSongBySearch(query) {
        return yts(query);
    },
};

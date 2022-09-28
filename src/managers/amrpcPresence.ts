import * as Discord from "discord.js";

const appId = "842112189618978897" /* AMRPC */,
    guildId = "518389564340043776" /* zephra */,
    roleId = "1024678317724532766"; /* Listening with AMRPC */

export function init(client: Discord.Client) {
    client.guilds.cache
        .find((guild) => guild.id === guildId)
        .members.cache.forEach((member) =>
            checkPresence(member.presence, member)
        );

    client.on("presenceUpdate", (oldPresence, newPresence) => {
        if (newPresence.guild.id !== guildId) return;
        if (hasDifferentActivities(oldPresence, newPresence))
            checkPresence(newPresence, newPresence.member);
    });
}

function hasDifferentActivities(
    oldPresence: Discord.Presence,
    newPresence: Discord.Presence
) {
    if (oldPresence.activities.length !== newPresence.activities.length)
        return true;

    for (let i = 0; i < oldPresence.activities.length; i++) {
        if (
            oldPresence.activities[i].name !== newPresence.activities[i].name ||
            oldPresence.activities[i].type !== newPresence.activities[i].type
        )
            return true;
    }

    return false;
}

function checkPresence(
    presence: Discord.Presence,
    member: Discord.GuildMember
) {
    if (!presence) return;

    const activityExists = presence.activities?.find(
        (activity) => activity.applicationId === appId
    );

    if (member.roles.cache.find((role) => role.id === roleId)) {
        if (!activityExists) member.roles.remove(roleId);

        return;
    } else if (activityExists) member.roles.add(roleId);
}

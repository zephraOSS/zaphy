import { client } from "../index";

export function getUser(userId: string) {
    return client.guilds.cache
        .find((guild) => guild.id === "518389564340043776" /* zephra */)
        .members.cache.find((member) => member.id === userId);
}

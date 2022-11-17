import http from "http";

// @ts-ignore
import { getUser } from "../utils/getUser";

import log from "../utils/log";

export default class Server {
    private host: string = "localhost";
    private port: number = 9413;
    // @ts-ignore
    private server: http.Server;

    constructor() {
        this.start();
    }

    start() {
        this.server = http
            .createServer((req, res) => {
                res.writeHead(200, { "Content-Type": "application/json" });
                // path: api/user/USERID/ACTION
                if (req.url.startsWith("/api/user/")) {
                    const userId = req.url.split("/")[3],
                        action = req.url.split("/")[4];

                    if (action === "roles") {
                        const user = getUser(userId);

                        if (!user) return res.end(JSON.stringify({}));

                        res.write(
                            JSON.stringify(
                                user.roles.cache.map((role) => {
                                    return {
                                        id: role.id,
                                        name: role.name,
                                    };
                                })
                            )
                        );
                        res.end();
                    } else {
                        res.statusCode = 400;
                        res.write(JSON.stringify({ error: "Bad Request" }));
                        res.end();
                    }
                } else {
                    res.statusCode = 404;
                    res.write(JSON.stringify({ error: "Invalid path" }));
                    res.end();
                }
            })
            .listen(this.port, this.host, () => {
                log(
                    `[SERVER] Server running at http://${this.host}:${this.port}/`
                );
            });
    }
}

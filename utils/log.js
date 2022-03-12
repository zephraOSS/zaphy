const fs = require("fs"),
    config = require("../config.json");

/**
 * Logs a message to the console and to a file
 * @param  {...any} args
 */
function log(...args) {
    const date = new Date();

    console.log(`[${date.toLocaleTimeString()}]`, ...args);

    if (config.logToFile) {
        fs.appendFileSync(
            "log.txt",
            `[${date.toLocaleString()}] ${args.join(" ")}\n`
        );
    }
}

module.exports = log;

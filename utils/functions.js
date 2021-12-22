module.exports = {
    /**
     * Checks if a string is a valid URL
     * @param {string} url The string to check
     * @return {boolean} Whether the string is a valid URL
     */
    isValidURL(url) {
        const pattern = new RegExp(
            "^(https?:\\/\\/)?" +
                "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" +
                "((\\d{1,3}\\.){3}\\d{1,3}))" +
                "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" +
                "(\\?[;&a-z\\d%_.~+=-]*)?" +
                "(\\#[-a-z\\d_]*)?$",
            "i"
        );

        return !!pattern.test(url);
    },
};

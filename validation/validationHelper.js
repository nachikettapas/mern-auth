/**
 * Helper functions for validating input.
 */
 class ValidationHelper {
    /**
     * Does the string have some content.
     * @param str The string to validate.
     * @param name The parameter name.
     */
    static string(str, name) {
        if (str === undefined || str === null || str.trim().length === 0) {
            throw new Error(`The parameter '${name}' has an invalid value.`);
        }
    }

    /**
     * Does the number have a value.
     * @param num The number to validate.
     * @param name The parameter name.
     */
    static number(num, name) {
        if (num === undefined || num === null || typeof num !== "number") {
            throw new Error(`The parameter '${name}' has an invalid value.`);
        }
    }

    /**
     * Is the value of one the specified items.
     * @param val The value to validate.
     * @param options The possible options.
     * @param name The parameter name.
     */
    static oneOf(val, options, name) {
        if (options.indexOf(val) < 0) {
            throw new Error(`The parameter '${name}' has an invalid value.`);
        }
    }

    /**
     * Is the given string a valid messageId
     * @param str The string to validate.
     */
    static isMessageId(str) {
        if (!new RegExp(`^[0-9a-f]{${str.length}}$`).test(str) || str.length !== 64) {
            throw new Error(`The messageId is invalid`);
        }
    }
}

module.exports = ValidationHelper
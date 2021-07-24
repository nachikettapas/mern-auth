const Converter = require("@iota/iota.js");
const crypto = require("crypto");
const Web3 = require('web3');

/**
 * Chrysalis client helper functions
 */
class IotaC2Helper {

    /**
     * Generate a random hash in Base32-encoding.
     * @returns The hash.
     */
    static generateHash() {
        return crypto.createHash("sha256").update(crypto.randomBytes(256)).digest("hex");
    }

    /**
     * Convert message object to payload
     * @param message The message object to convert.
     * @returns The payload.
     */
    static async messageToPayload(message) {
        // Need the any casts in this function because the iota.rs binding definitions are incorrect.
        if (message.message.payload.type !== 2) {
            throw new Error(`Invalid messageId: ${message.messageid}. Message has no Indexation Payload containing data.`);
        }

        //const payload = JSON.parse(Converter.hexToUtf8((message.message.payload).data));
        const data = (message.message.payload).data;
        const payload = decodeURIComponent(data.replace(/\s+/g, '').replace(/[0-9a-f]{2}/g, '%$&'));

        if (payload) {
            return payload;
        } else {
            throw new Error(`Error converting Message: ${
                message.messageId} Indexation Payload data to a valid payload`);
        }
    }
}

module.exports = IotaC2Helper
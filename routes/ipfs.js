const express = require("express");
const router = express.Router(); 
const ValidationHelper = require("../validation/validationHelper");
const IotaC2Helper = require("../utils/iotaC2Helper");
const keys = require("../config/keys");
const { SHA3 } = require('sha3');
const { create } = require("ipfs-http-client");
const { ClientBuilder } = require("@iota/client");
const { Blake2b, Converter } = require("@iota/iota.js");

// Load MessageCache model
const MessageCache = require("../models/MessageCache");
const State = require("../models/State");

// @route GET api/ipfs
// @desc Find ipfs data
// @access Public
router.get("/", async (req, res) => {
    try {
        ValidationHelper.string(req.query.messageId, "messageId");
        ValidationHelper.isMessageId(req.query.messageId);

        MessageCache.findOne({ messageid: req.query.messageId })
		    .then(async (message) => {
                
                console.log("Message: " + message);
                if (!message) {
                    throw new Error(`Unable to locate the specified message: '${req.query.messageId}'.`);
                }
                
                const payload = await IotaC2Helper.messageToPayload(message);
                console.log("Payload: " + payload);
                const output = Object.assign({"success": "true", "message": "OK"}, JSON.parse(payload));

                return res.json(output);
            });
    } catch (err) {
        return res.status(400).json({
            success: false,
            message: err.toString()
        });
    }
});

// @route POST api/ipfs
// @desc Store ipfs data
// @access Public
router.post("/", async (req, res) => {
    console.log("Name: " + req.body.name);
    try {
        ValidationHelper.string(req.body.name, "name");
        ValidationHelper.string(req.body.description, "description");
        ValidationHelper.number(req.body.size, "size");
        ValidationHelper.string(req.body.modified, "modified");
        ValidationHelper.string(req.body.algorithm, "algorithm");
        ValidationHelper.string(req.body.hash, "hash");
        ValidationHelper.string(req.body.data, "data");

        const BYTES_PER_MEGABYTE = 1048576;
        const maxSize = keys.maxBytes ?? BYTES_PER_MEGABYTE / 2;

        const buffer = Buffer.from(req.body.data, "base64");

        if (buffer.length >= maxSize) {
            const size = maxSize >= BYTES_PER_MEGABYTE
                ? `${(maxSize / BYTES_PER_MEGABYTE).toFixed(1)} Mb`
                : `${(maxSize / 1024)} Kb`;
            throw new Error(
                `The file is too large for this demonstration, it should be less than ${size}.`
            );
        }

        if (buffer.length === 0) {
            throw new Error(`The file must be greater than 0 bytes in length.`);
        }

        let hex;

        if (req.body.algorithm === "sha256") {
            const hashAlgo = crypto.createHash(req.body.algorithm);
            hashAlgo.update(buffer);
            hex = hashAlgo.digest("hex");
        } else if (req.body.algorithm === "sha3") {
            const hashAlgo = new SHA3(256);
            hashAlgo.update(buffer);
            hex = hashAlgo.digest("hex");
        }

        if (hex !== req.body.hash) {
            throw new Error(
                `The hash for the file is incorrect '${req.body.hash}' was sent but it has been calculated as '${hex}'`);
        }

        const parts = /(https?):\/\/(.*):(\d*)(.*)/.exec(keys.ipfs.provider);

        if (parts.length !== 5) {
            throw new Error(`The IPFS Provider is not formatted correctly, it should be in the format https://ipfs.mydomain.com:443/api/v0/`);
        }

        const ipfsConfig = {
            protocol: parts[1],
            host: parts[2],
            port: parts[3],
            "api-path": parts[4],
            headers: undefined
        };

        if (keys.ipfs.token) {
            ipfsConfig.headers = {
                Authorization: `Basic ${keys.ipfs.token}`
            };
        }

        const ipfs = create(ipfsConfig);

        const addStart = Date.now();
        console.log(`Adding file ${req.body.name} to IPFS of length ${req.body.size}`);
        const addResponse = await ipfs.add(buffer);

        const ipfsHash = addResponse.path;
        console.log(`Adding file ${req.body.name} complete in ${Date.now() - addStart}ms`);

        const tanglePayload = {
            name: req.body.name,
            description: req.body.description,
            size: req.body.size,
            modified: req.body.modified,
            algorithm: req.body.algorithm,
            hash: req.body.hash,
            ipfs: ipfsHash
        };

        const json = JSON.stringify(tanglePayload);
        
        var currentState = await State.findOne({ id: "default-c2" });
        if (!currentState) {
            currentState = new State({
                seed: IotaC2Helper.generateHash(),
                id: "default-c2",
                addressIndex: 0
            });
        } else {
            currentState.addressIndex++;
        }
        await currentState.save();
        
        // Chrysalis client instance
        const client = new ClientBuilder().node(keys.node.provider).build();

        const addresses = client.getAddresses(currentState.seed);

        const address = await addresses
            .accountIndex(0)
            .range(currentState.addressIndex, currentState.addressIndex + 1)
            .get();

        const hashedAddress = Blake2b.sum256(Converter.utf8ToBytes(address[0].toString()));

        const message = await client
            .message()
            .index(Converter.bytesToHex(hashedAddress))
            .seed(currentState.seed)
            .accountIndex(0)
            .data(new TextEncoder().encode(json))
            .submit();

        const msgData = new MessageCache({
            messageid: message.messageId, 
            message: message.message
        });
        msgData.save();

        return res.json({
            success: true,
            message: "OK",
            messageId: message.messageId,
            ipfs: tanglePayload.ipfs
        });
    } catch (err) {
        return res.status(400).json({
            success: false,
            message: err.toString()
        });
    }
});

module.exports = router;
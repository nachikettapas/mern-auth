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
        ValidationHelper.string(req.body.messageId, "messageId");
        ValidationHelper.isMessageId(req.body.messageId);

        MessageCache.findOne({ messageid: req.body.messageId })
		    .then(async (message) => {
                
                if (!message) {
                    throw new Error(`Unable to locate the specified message: '${req.body.messageId}'.`);
                }
                
                const payload = await IotaC2Helper.messageToPayload(message);
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

    // //Data insert code
    // const varData = new MessageCache({
    //     messageid: "2e246558305e362964d2f261d1b8e6050a46811bd13ea5e9ef6ec7f2d304d22f",
    //     message: {
    //                 "networkId": "14379272398717627559",
    //                 "nonce": "857931",
    //                 "parentMessageIds": [
    //                     "25f84df299053ae22e0ff76a94ba76a52379098564a0e6dc8c2efd8b56313dd7",
    //                     "8c1bdf041b8298eaa41e22c463d5ff9f079c23de776bdd8190e18fbdbdacb371",
    //                     "9040bc123abd814bd684ad3f4f38f0f44f1341299a2deb41439e6311756844c2",
    //                     "e146b58684e4fd801100e2c14ab351ae6182d7d166918eb9898a7a1239ef5443"
    //                 ],
    //                 "payload": {
    //                     "data": "7b226e616d65223a227465737446696c65222c226465736372697074696f6e223a226466647366222c2273697a65223a32382c226d6f646966696564223a22323032312d30362d31305431333a35393a35302e3334345a222c22616c676f726974686d223a2273686133222c2268617368223a2239663866656338393233376439383433346337306531623238386234633333636131623965376665316539356134366362343566666464653737663435613161222c2269706673223a22516d574a50686254676f41457966634d754e744a38655757514165657556696734535147707042726b535a566e51227d",
    //                     "index": "64393832383561653237353836643036353930396665633333666365613039313963343838636266383736383630613665303166613338333230323761346565",
    //                     "type": "2"
    //                 }
    //             }
    // });
    // varData.save()
    //     .then(res => console.log(res));
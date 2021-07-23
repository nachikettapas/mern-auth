const express = require("express");
const router = express.Router(); 
const ValidationHelper = require("../validation/validationHelper");
const IotaC2Helper = require("../utils/iotaC2Helper");

// Load MessageCache model
const MessageCache = require("../models/MessageCache");

// @route GET api/ipfs
// @desc Find ipfs data
// @access Public
router.get("/", async (req, res) => {
    try {
        ValidationHelper.string(req.body.messageId, "messageId");
        ValidationHelper.isMessageId(req.body.messageId);

        MessageCache.findOne({ messageId: req.body.messageId })
		    .then(async (message) => {
                
                if (!message) {
                    throw new Error(`Unable to locate the specified message: '${req.body.messageId}'.`);
                }
                
                const payload = await IotaC2Helper.messageToPayload(message);
                console.log(payload);

                return res.json({
                    success: true,
                    message: "OK",
                    ...payload
                });
            })
		    .catch(err => console.log(err));
    } catch (err) {
        return {
            success: false,
            message: err.toString()
        };
    }
});

// @route POST api/ipfs
// @desc Store ipfs data
// @access Public
router.post("/ipfs", async (req, res) => {
  
});

module.exports = router;
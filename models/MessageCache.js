const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const MessageCacheSchema = new Schema({
  messageid: {
    type: String,
    required: true
  },
  message: {
    type: Object,
    required: true
  }
},
{
    collection: "messagecache"
});

module.exports = MessageCache = mongoose.model("messagecache", MessageCacheSchema);

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const StateSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  addressIndex: {
    type: Number,
    required: true
  },
  seed: {
    type: String,
    required: true
  },
},
{
    collection: "state"
});

module.exports = State = mongoose.model("state", StateSchema);

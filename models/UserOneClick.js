const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const UserOneClickSchema = new Schema({
    nonce: {
      type: Number,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    username: {
      type: String
    } 
  },
  {
    collection: "useroneclick"
  });

module.exports = UserOneClick = mongoose.model("usersoneclick", UserOneClickSchema);
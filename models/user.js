const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: { type: String },
  time: { type: Date, default: Date.now },
  nickname: { type: String, default: "Unnamed user" },
  level: { type: String },
  sid: { type: String }, // socket id
  roomname: { type: mongoose.Types.ObjectId, ref: "Game", default: null },
  joinroomname: {
    type: mongoose.Types.ObjectId,
    ref: "Game",
    default: null,
  },
});

module.exports = mongoose.model("User", userSchema);

const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const gameSchema = new Schema({
  roomname: { type: String, required: true },
  time: { type: Date, default: Date.now },
  creator: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
  participant: { type: mongoose.Types.ObjectId, ref: "User" },
  started: { type: Boolean, default: false },
  white: { type: mongoose.Types.ObjectId, ref: "User" },
  black: { type: mongoose.Types.ObjectId, ref: "User" },
  step: { type: Number, default: 0 },
  history: [
    {
      step: { type: Number },
      boardWhite: [String],
      boardBlack: [String],
      prevPieceWhite: { type: Number }, // previous piece that was made
      prevPieceBlack: { type: Number }, // previous piece that was made
       // index of en Passant capture (not move) position for the enemy's final
       // position after the capture in enemy's coordinate, not my coordinate
      enPassant: { type: Number },
      check: { type: Boolean },
      winner: { type: String, default: "" }, // "" or "tie" or "White" or "Black"
      hasKingMoved: false, // for the pieces for this round
      hasLeftRookMoved: false, // for the pieces for this round
      hasRightRookMoved: false, // for the pieces for this round
      castleRight: false, // for next round for my opponent
      castleLeft: false, // for next round for my opponent
    },
  ],
});

module.exports = mongoose.model("Game", gameSchema);

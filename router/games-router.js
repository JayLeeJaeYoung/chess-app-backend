const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { check, validationResult } = require("express-validator");
const User = require("../models/user");
const Game = require("../models/game");
const io = require("../util/socket");

const { initializeHistory, checkRound } = require("./games-helper");

const checkToken = require("../middleware/check-token");
const HttpError = require("../util/http-error");

/**
 * POST /api/games/new: create a new game room
 */
router.post(
  "/new",

  checkToken,

  [
    check("nickname").trim().not().isEmpty(),
    check("roomname").trim().not().isEmpty(),
    check("level").isIn(["1", "2", "3"]).toInt(),
  ],

  async (req, res, next) => {
    // validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        new HttpError("Invalid inputs: " + JSON.stringify(errors.errors), 400)
      );
    }

    const { nickname, roomname, level } = req.body;
    const uid = req.userData.uid;

    let creator;
    try {
      creator = await User.findById(uid);
    } catch (err) {
      return next(new HttpError(err, 500));
    }
    if (!creator) {
      return next(new HttpError("No user found", 404));
    }
    if (creator?.roomname !== null) {
      return next(new HttpError("User already has a game room", 405));
    }
    if (creator?.joinroomname !== null) {
      return next(new HttpError("User already requested to join a room", 405));
    }
    creator.nickname = nickname;
    creator.level = level;

    const newGame = new Game({
      roomname,
      creator: creator,
    });

    try {
      const session = await mongoose.startSession();
      session.startTransaction();
      await newGame.save({ session: session });
      creator.roomname = newGame;
      await creator.save({ session: session });
      await session.commitTransaction();
    } catch (err) {
      return next(new HttpError(err, 500));
    }

    const responseGame = {
      _id: newGame._id,
      roomname: roomname,
      creatorId: creator._id,
      creator: nickname,
      level: level,
      started: false,
    };

    io.getIO().emit("room", {
      action: "create",
      game: responseGame,
    });

    res.status(201).json({
      message: "POST /api/games/new: create a new game room",
      game: responseGame,
    });
  }
);

/**
 * GET /api/games/: get all game rooms
 */
router.get("/", checkToken, async (req, res, next) => {
  const uid = req.userData.uid;

  let gameList;
  try {
    gameList = await Game.find(
      {},
      "-history -white -black -step -time"
    ).populate(
      "creator participant",
      "-roomname -joinroomname -sid -time -__v"
    );
  } catch (err) {
    return next(new HttpError("Server Error " + err, 500));
  }

  let myGame = gameList.filter(
    (game) =>
      game.creator?._id.toString() === uid ||
      (game.started && game.participant?._id.toString() === uid)
  )[0];

  if (myGame) {
    myGame = {
      _id: myGame._id,
      roomname: myGame.roomname,
      creatorId: myGame.creator?._id,
      creator: myGame.creator?.nickname,
      level: myGame.creator?.level,
      participantId: myGame.participant?._id,
      participant: myGame.participant?.nickname,
      participantLevel: myGame.participant?.level,
      started: myGame.started,
    };
  }

  const otherGames = gameList.filter(
    (game) =>
      game.creator?._id !== uid &&
      !(game.started && game.participant?._id === uid)
  );

  res.status(201).json({
    message: "GET /api/games/: get all game rooms",
    myGame: myGame,
    otherGames: otherGames.map((game) => {
      return {
        _id: game._id,
        roomname: game.roomname,
        creatorId: game.creator?._id,
        creator: game.creator?.nickname,
        level: game.creator?.level,
        participantId: game.participant?._id,
        participant: game.participant?.nickname,
        participantLevel: game.participant?.level,
        started: game.started,
      };
    }),
  });
});

/**
 * PATCH /api/games/:rid/join: participant request to join
 */
router.patch(
  "/:rid/join",

  checkToken,

  [
    check("nickname").trim().not().isEmpty(),
    check("level").isIn(["1", "2", "3"]).toInt(),
  ],

  async (req, res, next) => {
    // validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        new HttpError("Invalid inputs: " + JSON.stringify(errors.errors), 400)
      );
    }

    const { nickname, level } = req.body;
    const rid = req.params.rid;
    const pid = req.userData.uid;

    let room;
    try {
      room = await Game.findById(rid).populate(
        "creator participant",
        "-roomname -joinroomname -time -__v"
      );
    } catch (err) {
      return next(new HttpError(err, 500));
    }
    if (!room) {
      return next(new HttpError("The game room no longer exists", 404));
    }
    if (pid === room.creator._id) {
      return next(new HttpError("Creator cannot be participant", 404));
    }
    if (room.participant) {
      return next(
        new HttpError("Another user has already requested to join", 404)
      );
    }

    let participant;
    try {
      participant = await User.findById(pid);
    } catch (err) {
      return next(new HttpError(err, 500));
    }
    if (!participant) {
      return next(new HttpError("No user found", 404));
    }
    if (participant.roomname) {
      return next(new HttpError("User already has a game room", 405));
    }
    if (participant.joinroomname) {
      return next(
        new HttpError("User already requested to join another room", 405)
      );
    }

    try {
      const session = await mongoose.startSession();
      session.startTransaction();
      room.participant = pid; // this works
      await room.save({ session: session });
      participant.nickname = nickname;
      participant.level = level;
      participant.joinroomname = room;
      await participant.save({ session: session });
      await session.commitTransaction();
    } catch (err) {
      return next(new HttpError(err, 500));
    }

    io.getIO().emit("room", {
      action: "request",
      game: {
        _id: rid,
        creatorId: room.creator._id,
        participantId: pid,
        participant: nickname,
        participantLevel: level,
      },
    });

    res.status(201).json({
      message: "PATCH /api/games/:rid/join: participant request to join",
      game: {
        _id: rid,
        creatorId: room.creator._id,
        participantId: pid,
        participant: nickname,
        participantLevel: level,
      },
    });
  }
);

/**
 * DELETE /api/games/:rid: Delete Room
 */
router.delete(
  "/:rid",
  checkToken,

  async (req, res, next) => {
    const rid = req.params.rid;
    const uid = req.userData.uid;

    let room;
    try {
      room = await Game.findById(rid).populate("creator participant");
    } catch (err) {
      return next(new HttpError(err, 500));
    }
    if (!room) {
      return next(new HttpError("The game room no longer exists", 404));
    }
    if (uid !== room.creator._id.toString()) {
      return next(new HttpError("Only Creator can delete the game room", 404));
    }
    if (room.participant) {
      return next(
        new HttpError("You have a pending participant to respond to", 404)
      );
    }

    const roomId = room._id;
    const creatorId = room.creator._id;
    const creator = room.creator;

    try {
      const session = await mongoose.startSession();
      session.startTransaction();
      await room.remove({ session: session });
      creator.roomname = undefined;
      // creator.nickname = undefined;
      await creator.save({ session: session });
      await session.commitTransaction();
    } catch (err) {
      return next(new HttpError(err, 500));
    }

    io.getIO().emit("room", {
      action: "delete",
      game: {
        _id: roomId,
        creatorId,
      },
    });

    res.status(201).json({
      message: "DELETE /api/games/:rid: Delete Room",
    });
  }
);

/**
 * PATCH /api/games/:rid/respond: creator responds to request
 */
router.patch(
  "/:rid/respond",

  checkToken,

  async (req, res, next) => {
    const { accept } = req.body;
    const rid = req.params.rid;
    const uid = req.userData.uid;

    let room;
    try {
      room = await Game.findById(rid).populate("creator participant");
    } catch (err) {
      return next(new HttpError(err, 500));
    }
    if (!room) {
      return next(new HttpError("The game room no longer exists", 404));
    }
    if (uid !== room.creator._id.toString()) {
      return next(
        new HttpError("Only creator can accept/decline requests", 404)
      );
    }
    if (!room.participant) {
      return next(new HttpError("Participant does not exist", 404));
    }

    const priorParticipantId = room.participant._id;

    if (accept) {
      try {
        room.started = true;
        await room.save();
      } catch (err) {
        return next(new HttpError(err, 500));
      }

      io.getIO().emit("room", {
        action: "respond",
        accept: true,
        game: {
          _id: room._id,
          creatorId: room.creator._id,
          participantId: room.participant._id,
          started: true,
        },
      });

      res.status(201).json({
        message: "PATCH /api/games/:rid/respond: creator responds to request",
        game: {
          started: true,
        },
      });
    } else {
      try {
        const session = await mongoose.startSession();
        session.startTransaction();
        room.participant.joinroomname = undefined;
        await room.participant.save({ session: session });
        room.participant = undefined;
        await room.save({ session: session });
        await session.commitTransaction();
      } catch (err) {
        return next(new HttpError(err, 500));
      }

      io.getIO().emit("room", {
        action: "respond",
        accept: false,
        priorParticipantId,
        game: {
          _id: room._id,
          creatorId: room.creator?._id,
          participantId: null,
          participant: null,
          participantLevel: null,
        },
      });

      res.status(201).json({
        message: "PATCH /api/games/:rid/respond: creator responds to request",
        game: {
          participantId: null,
          participant: null,
          participantLevel: null,
        },
      });
    }
  }
);

/**
 * GET /api/games/game: get myGame info
 */
router.get(
  "/game",

  checkToken,

  async (req, res, next) => {
    const uid = req.userData.uid;

    let user;
    try {
      user = await User.findById(uid);
    } catch (err) {
      return next(new HttpError(err, 500));
    }
    if (!user) {
      return next(new HttpError("No user found", 404));
    }
    let myGameId;
    if (user.roomname) myGameId = user.roomname;
    else if (user.joinroomname) myGameId = user.joinroomname;
    else return next(new HttpError("No game room found", 404));

    let game;
    try {
      game = await Game.findById(myGameId).populate(
        "white black creator participant",
        "-roomname -joinroomname -time -__v"
      );
    } catch (err) {
      return next(new HttpError(err, 500));
    }

    let myGame;
    let info;
    if (uid === game.white?._id.toString()) {
      info = {
        _id: game._id,
        roomname: game.roomname,
        creatorId: game.creator?._id,
        myName: game.white.nickname,
        opponentName: game.black.nickname,
        color: "White",
      };
      myGame = {
        step: game.step,
        history: game.history.map((item) => {
          return {
            step: item.step,
            board: item.boardWhite,
            prevPiece: item.prevPieceWhite,
            enPassant: item.enPassant,
            check: item.check,
            winner: item.winner,
            castleLeft: item.castleLeft,
            castleRight: item.castleRight,
          };
        }),
      };
    } else if (uid === game.black?._id.toString()) {
      info = {
        _id: game._id,
        creatorId: game.creator?._id,
        roomname: game.roomname,
        myName: game.black.nickname,
        opponentName: game.white.nickname,
        color: "Black",
      };
      myGame = {
        step: game.step,
        history: game.history.map((item) => {
          return {
            step: item.step,
            board: item.boardBlack,
            prevPiece: item.prevPieceBlack,
            enPassant: item.enPassant,
            check: item.check,
            winner: item.winner,
            castleLeft: item.castleLeft,
            castleRight: item.castleRight,
          };
        }),
      };
    } else {
      const myName = user.nickname;
      let opponentName;
      if (user.roomname) {
        opponentName = game.participant?.nickname;
      } else {
        opponentName = game.creator?.nickname;
      }

      info = {
        _id: game._id,
        creatorId: game.creator?._id,
        roomname: game.roomname,
        myName,
        opponentName,
        color: null,
      };
      myGame = { step: null, history: null };
    }

    res.status(201).json({
      message: "GET /api/games/game: get myGame info",
      game: {
        myGame,
        info,
      },
    });
  }
);

/**
 * PATCH /api/games/game/color: update creator's color
 */
router.patch(
  "/game/color",

  checkToken,

  [check("color").isIn(["1", "2"])],

  async (req, res, next) => {
    // validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        new HttpError("Invalid inputs: " + JSON.stringify(errors.errors), 400)
      );
    }
    const color = req.body.color === "1" ? "White" : "Black";
    const uid = req.userData.uid;

    let user;
    try {
      user = await User.findById(uid);
    } catch (err) {
      return next(new HttpError(err, 500));
    }
    if (!user) {
      return next(new HttpError("No user found", 404));
    }
    let rid = user.roomname;
    if (!rid) {
      return next(new HttpError("The game room no longer exists", 404));
    }

    let game;
    try {
      game = await Game.findById(rid).populate(
        "creator participant",
        "-roomname -joinroomname -time -__v"
      );
    } catch (err) {
      return next(new HttpError(err, 500));
    }

    try {
      if (color === "White") {
        game.white = uid;
        game.black = game.participant?._id;
      } else {
        game.black = uid;
        game.white = game.participant?._id;
      }
      await game.save();
    } catch (err) {
      return next(new HttpError(err, 500));
    }

    // games = { white: [], black: []}
    let games;
    try {
      games = await initializeHistory(rid);
    } catch (err) {
      return next(new HttpError(err, 500));
    }

    if (color === "White") {
      let info = {
        _id: game._id,
        roomname: game.roomname,
        creatorId: game.creator?._id,
        myName: game.creator?.nickname,
        opponentName: game.participant?.nickname,
        color: "White",
      };
      let myGame = {
        step: 0,
        history: [
          {
            step: 0,
            board: games.white,
            prevPiece: -1,
            enPassant: -1,
            check: false,
            winner: "",
            castleLeft: false,
            castleRight: false,
          },
        ],
      };

      res.status(201).json({
        message: "PATCH /api/games/game/color: update creator's color",
        game: {
          myGame,
          info,
        },
      });

      info["myName"] = game.participant?.nickname;
      info["opponentName"] = game.creator?.nickname;
      info["color"] = "Black";
      myGame = {
        step: 0,
        history: [
          {
            step: 0,
            board: games.black,
            prevPiece: -1,
            enPassant: -1,
            check: false,
            winner: "",
            castleLeft: false,
            castleRight: false,
          },
        ],
      };

      io.getIO().to(game.participant?.sid).emit("game", {
        action: "initialize",
        game: {
          myGame,
          info,
        },
      });
    } else {
      let info = {
        _id: game._id,
        roomname: game.roomname,
        creatorId: game.creator?._id,
        myName: game.creator?.nickname,
        opponentName: game.participant?.nickname,
        color: "Black",
      };
      let myGame = {
        step: 0,
        history: [
          {
            step: 0,
            board: games.black,
            prevPiece: -1,
            enPassant: -1,
            check: false,
            winner: "",
            castleLeft: false,
            castleRight: false,
          },
        ],
      };

      res.status(201).json({
        message: "PATCH /api/games/game/color: update creator's color",
        game: {
          myGame,
          info,
        },
      });

      info["myName"] = game.participant?.nickname;
      info["opponentName"] = game.creator?.nickname;
      info["color"] = "White";
      myGame = {
        step: 0,
        history: [
          {
            step: 0,
            board: games.white,
            winner: 0,
            prevPiece: -1,
            enPassant: -1,
            check: false,
            winner: "",
            castleLeft: false,
            castleRight: false,
          },
        ],
      };

      io.getIO().to(game.participant?.sid).emit("game", {
        action: "initialize",
        test: 1,
        game: {
          myGame,
          info,
        },
      });
    }
  }
);

/**
 * PATCH /api/games/game/round: update after round
 */
router.patch(
  "/game/round",

  checkToken,

  async (req, res, next) => {
    const uid = req.userData.uid;
    const { round } = req.body;

    let user;
    try {
      user = await User.findById(uid);
    } catch (err) {
      return next(new HttpError(err, 500));
    }
    if (!user) {
      return next(new HttpError("No user found", 404));
    }

    let myGameId;
    if (user.roomname) myGameId = user.roomname;
    else if (user.joinroomname) myGameId = user.joinroomname;
    else return next(new HttpError("No game room found", 404));

    let game;
    try {
      game = await Game.findById(myGameId).populate(
        "white black",
        "-roomname -joinroomname -time -__v"
      );
    } catch (err) {
      return next(new HttpError(err, 500));
    }

    const color = game.white._id.toString() === uid ? "White" : "Black";

    // check if it is the user's turn to submit
    if (game.step + 1 !== round.step) {
      return next(new HttpError("Round number not in line with server", 404));
    }
    if (round.step % 2 == 1) {
      if (color === "Black")
        return next(new HttpError("It's not your turn", 404));
    } else {
      if (color === "White")
        return next(new HttpError("It's not your turn", 404));
    }

    // check legal movements and save to db
    try {
      game = await checkRound(round, color, myGameId);
    } catch (err) {
      return next(new HttpError(err, 500));
    }

    let whiteGame = {
      step: game.step,
      history: game.history.map((item) => {
        return {
          step: item.step,
          board: item.boardWhite,
          prevPiece: item.prevPieceWhite,
          enPassant: item.enPassant,
          check: item.check,
          winner: item.winner,
          castleLeft: item.castleLeft,
          castleRight: item.castleRight,
        };
      }),
    };

    let blackGame = {
      step: game.step,
      history: game.history.map((item) => {
        return {
          step: item.step,
          board: item.boardBlack,
          prevPiece: item.prevPieceBlack,
          enPassant: item.enPassant,
          check: item.check,
          winner: item.winner,
          castleLeft: item.castleLeft,
          castleRight: item.castleRight,
        };
      }),
    };

    if (color === "White") {
      res.status(201).json({
        message: "PATCH /api/games/game/round: update after round",
        game: whiteGame,
      });

      io.getIO().to(game.black.sid).emit("game", {
        action: "round",
        game: blackGame,
      });
    } else {
      res.status(201).json({
        message: "PATCH /api/games/game/round: update after round",
        game: blackGame,
      });

      io.getIO().to(game.white.sid).emit("game", {
        action: "round",
        game: whiteGame,
      });
    }
  }
);

/**
 * PATCH /api/games/game/leave: participant leaves the game
 */
router.patch(
  "/game/leave",

  checkToken,

  async (req, res, next) => {
    const pid = req.userData.uid;

    let participant;
    try {
      participant = await User.findById(pid);
    } catch (err) {
      return next(new HttpError(err, 500));
    }
    if (!participant) {
      return next(new HttpError("No user found", 404));
    }

    const rid = participant?.joinroomname;

    let room;
    try {
      room = await Game.findById(rid).populate(
        "creator",
        "-roomname -joinroomname -sid -time -__v"
      );
    } catch (err) {
      return next(new HttpError(err, 500));
    }
    if (!room) {
      return next(new HttpError("The game room no longer exists", 404));
    }

    try {
      const session = await mongoose.startSession();
      session.startTransaction();
      room.participant = undefined;
      room.started = false;
      room.white = undefined;
      room.black = undefined;
      room.step = 0;
      room.history = [];
      participant.joinroomname = undefined;
      await room.save({ session: session });
      await participant.save({ session: session });
      await session.commitTransaction();
    } catch (err) {
      return next(new HttpError(err, 500));
    }

    io.getIO().emit("room", {
      action: "leave",
      priorParticipantId: pid,
      game: {
        _id: room._id,
        creatorId: room.creator?._id,
        participantId: null,
        participant: null,
        participantLevel: null,
        started: false,
      },
    });

    res.status(201).json({
      message: "PATCH /api/games/game/leave: participant leaves the game",
      game: {
        _id: rid,
        roomname: room.roomname,
        creatorId: room.creator?._id,
        creator: room.creator?.nickname,
        level: room.creator?.level,
      },
    });
  }
);

/**
 * DELETE /api/games/game/close: Close Room
 */
router.delete(
  "/game/close",

  checkToken,

  async (req, res, next) => {
    const uid = req.userData.uid;

    let creator;
    try {
      creator = await User.findById(uid);
    } catch (err) {
      return next(new HttpError(err, 500));
    }
    if (!creator) {
      return next(new HttpError("No user found", 404));
    }

    const rid = creator.roomname;

    let room;
    try {
      room = await Game.findById(rid).populate(
        "participant",
        "-roomname -joinroomname -sid -time -__v"
      );
    } catch (err) {
      return next(new HttpError(err, 500));
    }
    if (!room) {
      return next(new HttpError("The game room no longer exists", 404));
    }

    const participantId = room.participant._id;

    try {
      const session = await mongoose.startSession();
      session.startTransaction();
      room.participant.nickname = undefined;
      room.participant.level = undefined;
      room.participant.joinroomname = undefined;
      await room.participant.save({ session: session });
      creator.roomname = undefined;
      creator.nickname = undefined;
      creator.level = undefined;
      await creator.save({ session: session });
      await room.remove({ session: session });
      await session.commitTransaction();
    } catch (err) {
      return next(new HttpError(err, 500));
    }

    io.getIO().emit("room", {
      action: "close",
      game: {
        _id: rid,
        creatorId: uid,
        participantId,
      },
    });

    res.status(201).json({
      message: "DELETE /api/games/game/close: Close Room",
    });
  }
);

/**
 * PATCH /api/games/game/renew: creator responds to request
 */
router.patch(
  "/game/renew",

  checkToken,

  async (req, res, next) => {
    const uid = req.userData.uid;

    let creator;
    try {
      creator = await User.findById(uid);
    } catch (err) {
      return next(new HttpError(err, 500));
    }
    if (!creator) {
      return next(new HttpError("No user found", 404));
    }

    const rid = creator.roomname;

    let room;
    try {
      room = await Game.findById(rid).populate("creator participant");
    } catch (err) {
      return next(new HttpError(err, 500));
    }
    if (!room) {
      return next(new HttpError("The game room no longer exists", 404));
    }

    try {
      room.white = undefined;
      room.black = undefined;
      room.step = 0;
      room.history = [];
      await room.save();
    } catch (err) {
      return next(new HttpError(err, 500));
    }

    io.getIO().to(room.participant.sid).emit("game", {
      action: "renew",
    });

    res.status(201).json({
      message: "PATCH /api/games/game/renew: creator responds to request",
    });
  }
);

module.exports = router;

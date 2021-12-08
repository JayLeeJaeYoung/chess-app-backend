const Game = require("../models/game");

const printBoard = (board) => {
  for (let i = 0; i < 64; i++) {
    process.stdout.write(`${board[i]} `);
    if (i % 8 === 7) console.log();
  }
  console.log();
};

// i, j represent delta move in x and y direction in 2D coordinate
// returning the 1D coordinate of such displacement
// if out of bound, return -1
const getIndex = (index, i, j) => {
  const rowIndex = Math.floor(index / 8);
  const colIndex = index % 8;
  if (rowIndex + i < 0 || rowIndex + i > 7) return -1;
  if (colIndex + j < 0 || colIndex + j > 7) return -1;
  return (rowIndex + i) * 8 + (colIndex + j);
};

// convert white's board to black's board
const convertToBlack = (white) => {
  const whiteBoard = [...white];
  const blackBoard = new Array(64).fill("X0");
  let piece;
  let newPiece;

  for (let i = 0; i < 64; i++) {
    piece = whiteBoard[i];
    if (piece.charAt(1) === "1") newPiece = piece.charAt(0) + "2";
    else if (piece.charAt(1) === "2") newPiece = piece.charAt(0) + "1";
    else continue;
    blackBoard[63 - i] = newPiece;
  }
  return blackBoard.slice();
};

// convert black's board to white's board
const convertToWhite = (black) => {
  const blackBoard = [...black];
  const whiteBoard = new Array(64).fill("X0");
  let piece;
  let newPiece;

  for (let i = 0; i < 64; i++) {
    piece = blackBoard[i];
    if (piece.charAt(1) === "1") newPiece = piece.charAt(0) + "2";
    else if (piece.charAt(1) === "2") newPiece = piece.charAt(0) + "1";
    else continue;
    whiteBoard[63 - i] = newPiece;
  }
  return whiteBoard.slice();
};

// different from pawnMoves() in frontend
// separately tracks enPassantMove
// ignores en passant capture
const pawnMoves = (x, board, move, capture, enPassantMove) => {
  let y = getIndex(x, -1, -1);
  if (y !== -1 && board[y].charAt(1) === "2") capture[y] = true;
  y = getIndex(x, -1, 1);
  if (y !== -1 && board[y].charAt(1) === "2") capture[y] = true;

  y = getIndex(x, -1, 0);
  if (board[y].charAt(1) === "0") {
    move[y] = true;
    // en passant move (not en passant capture)
    if (Math.floor(x / 8) === 6) {
      y = getIndex(x, -2, 0);
      if (board[y].charAt(1) === "0") enPassantMove[y] = true;
    }
  }
};

const rookMoves = (x, board, move, capture) => {
  let y;
  for (let delta = 1; delta < 8; delta++) {
    y = getIndex(x, delta, 0);
    if (y === -1) break;
    if (board[y].charAt(1) === "0") move[y] = true;
    else if (board[y].charAt(1) === "2") {
      capture[y] = true;
      break;
    } else break;
  }
  for (let delta = 1; delta < 8; delta++) {
    y = getIndex(x, -delta, 0);
    if (y === -1) break;
    if (board[y].charAt(1) === "0") {
      move[y] = true;
    } else if (board[y].charAt(1) === "2") {
      capture[y] = true;
      break;
    } else break;
  }
  for (let delta = 1; delta < 8; delta++) {
    y = getIndex(x, 0, delta);
    if (y === -1) break;
    if (board[y].charAt(1) === "0") move[y] = true;
    else if (board[y].charAt(1) === "2") {
      capture[y] = true;
      break;
    } else break;
  }
  for (let delta = 1; delta < 8; delta++) {
    y = getIndex(x, 0, -delta);
    if (y === -1) break;
    if (board[y].charAt(1) === "0") move[y] = true;
    else if (board[y].charAt(1) === "2") {
      capture[y] = true;
      break;
    } else break;
  }
};

const knightMoves = (x, board, move, capture) => {
  const deltaList = [
    [-2, -1],
    [-2, 1],
    [-1, 2],
    [-1, -2],
    [1, 2],
    [2, 1],
    [2, -1],
    [1, -2],
  ];
  let y;
  for (const delta of deltaList) {
    y = getIndex(x, delta[0], delta[1]);
    if (y === -1) continue;
    if (board[y].charAt(1) === "0") move[y] = true;
    else if (board[y].charAt(1) === "2") capture[y] = true;
  }
};

const bishopMoves = (x, board, move, capture) => {
  let y;
  for (let delta = 1; delta < 8; delta++) {
    y = getIndex(x, delta, delta);
    if (y === -1) break;
    if (board[y].charAt(1) === "0") move[y] = true;
    else if (board[y].charAt(1) === "2") {
      capture[y] = true;
      break;
    } else break;
  }
  for (let delta = 1; delta < 8; delta++) {
    y = getIndex(x, -delta, delta);
    if (y === -1) break;
    if (board[y].charAt(1) === "0") move[y] = true;
    else if (board[y].charAt(1) === "2") {
      capture[y] = true;
      break;
    } else break;
  }
  for (let delta = 1; delta < 8; delta++) {
    y = getIndex(x, delta, -delta);
    if (y === -1) break;
    if (board[y].charAt(1) === "0") move[y] = true;
    else if (board[y].charAt(1) === "2") {
      capture[y] = true;
      break;
    } else break;
  }
  for (let delta = 1; delta < 8; delta++) {
    y = getIndex(x, -delta, -delta);
    if (y === -1) break;
    if (board[y].charAt(1) === "0") move[y] = true;
    else if (board[y].charAt(1) === "2") {
      capture[y] = true;
      break;
    } else break;
  }
};

const kingMoves = (x, board, move, capture) => {
  let y;
  const deltaList = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];
  for (const delta of deltaList) {
    y = getIndex(x, delta[0], delta[1]);
    if (y === -1) continue;
    if (board[y].charAt(1) === "0") move[y] = true;
    else if (board[y].charAt(1) === "2") capture[y] = true;
  }
};

// update move and capture based on the index clicked
// find all available move, enPassantMove, and capture positions for the piece clicked
// ignores en passant capture but includes en passant move
const pieceMoves = (x, board, move, capture, enPassantMove) => {
  if (board[x] === "P1") {
    pawnMoves(x, board, move, capture, enPassantMove);
  } else if (board[x] === "R1") {
    rookMoves(x, board, move, capture);
  } else if (board[x] === "H1") {
    knightMoves(x, board, move, capture);
  } else if (board[x] === "B1") {
    bishopMoves(x, board, move, capture);
  } else if (board[x] === "Q1") {
    rookMoves(x, board, move, capture);
    bishopMoves(x, board, move, capture);
  } else if (board[x] === "K1") {
    kingMoves(x, board, move, capture);
  }
};

module.exports = {
  initializeHistory: async (rid) => {
    // fill in step and history
    const game = await Game.findById(rid).populate(
      "white black",
      "-roomname -joinroomname -time -__v"
    );

    // white is 1 and black is 2
    // default is white is at the bottom
    const newRound = {
      step: 0,
      boardWhite: ["R2", "H2", "B2", "Q2", "K2", "B2", "H2", "R2"],
      boardBlack: null,
      prevPieceWhite: -1,
      prevPieceBlack: -1,
      enPassant: -1,
      check: false,
      winner: "",
      hasKingMoved: false, // for the pieces for this round
      hasLeftRookMoved: false, // for the pieces for this round
      hasRightRookMoved: false, // for the pieces for this round
      castleRight: false, // for next round for my opponent
      castleLeft: false, // for next round for my opponent
    };
    newRound.boardWhite.push(...Array(8).fill("P2"));
    newRound.boardWhite.push(...Array(32).fill("X0"));
    newRound.boardWhite.push(...Array(8).fill("P1"));
    newRound.boardWhite.push(
      ...["R1", "H1", "B1", "Q1", "K1", "B1", "H1", "R1"]
    );
    newRound.boardBlack = convertToBlack(newRound.boardWhite);

    // try ... catch done in the main router
    game.history = [newRound];
    game.step = 0;
    await game.save();

    return {
      white: newRound.boardWhite.slice(),
      black: newRound.boardBlack.slice(),
    };
  },

  checkRound: async (round, color, rid) => {
    const game = await Game.findById(rid).populate(
      "white black",
      "-roomname -joinroomname -time -__v"
    );

    let board = round.board.slice();
    // prevBoard is the previous round's board for the color that just made a move
    // so that "_1" will be the player's pieces and "_2" will be the opponent's pieces
    let prevBoard;
    let board2; // this round's board in enemy's coordinate
    if (color === "White") {
      prevBoard = game.history[game.step].boardWhite.slice();
      board2 = convertToBlack(board);
    } else {
      prevBoard = game.history[game.step].boardBlack.slice();
      board2 = convertToWhite(board);
    }

    // find the indices of the piece that just moved
    let diff = [];
    for (let i = 0; i < 64; i++) {
      if (prevBoard[i] !== board[i]) {
        diff.push(i);
      }
    }

    // the number of indices that changed must be either 2 or 3 or 4
    // 2 in most normal cases
    // 3 in the case of en Passant capture (not en passant move)
    // 4 in the case of castle
    if (diff.length !== 2 && diff.length !== 3 && diff.length !== 4) {
      throw new Error("Illegal move");
    }

    // checking of the move just made is legal for each piece
    // note enPassant is in enemy's coordinate and represents the final
    // position of the en passant capture
    let enPassant = -1;
    // x1 is my initial piece, x2 is my final piece
    let x1, x2, x3, x4;
    if (diff.length === 3) {
      // checking for enPassant capture
      // x1, x2 have the same meaning
      // x3 is the position of the enemy piece that was captured due to my piece's capture move
      let prevEnPassant = game.history[game.step].enPassant;
      let temp = diff.findIndex((x) => x === prevEnPassant);
      if (temp === -1) throw new Error("Illegal piece");
      x2 = diff[temp];
      temp = diff.findIndex((x) => x === prevEnPassant + 8);
      if (temp === -1) throw new Error("Illegal piece");
      x3 = diff[temp];
      let remaining = diff.filter((x) => x !== x2 && x !== x3);
      x1 = remaining[0];
      if (
        !(
          prevBoard[x1] === "P1" &&
          prevBoard[x2] === "X0" &&
          prevBoard[x3] === "P2" &&
          board[x1] === "X0" &&
          board[x2] === "P1" &&
          board[x3] === "X0"
        )
      )
        throw new Error("Illegal piece");
    } else if (diff.length === 4) {
      // castle move case
      // check if castle move was allowed
      const castleLeft = game.history[game.step].castleLeft;
      const castleRight = game.history[game.step].castleRight;
      if (!castleLeft && !castleRight) throw new Error("You cannot castle");
      let temp = diff.findIndex((x) => x === 56);
      if (temp !== -1) {
        // left castle
        if (!castleLeft) throw new Error("You cannot left castle");
        if (color === "White") {
          x2 = 58;
          if (
            !(
              prevBoard[56] === "R1" &&
              prevBoard[58] === "X0" &&
              prevBoard[59] === "X0" &&
              prevBoard[60] === "K1" &&
              board[56] === "X0" &&
              board[58] === "K1" &&
              board[59] === "R1" &&
              board[60] === "X0"
            )
          )
            throw new Error("Illegal left castle");
        } else {
          x2 = 57;
          if (
            !(
              prevBoard[56] === "R1" &&
              prevBoard[57] === "X0" &&
              prevBoard[58] === "X0" &&
              prevBoard[59] === "K1" &&
              board[56] === "X0" &&
              board[57] === "K1" &&
              board[58] === "R1" &&
              board[59] === "X0"
            )
          )
            throw new Error("Illegal left castle");
        }
      } else {
        temp = diff.findIndex((x) => x === 63);
        if (temp === -1) throw new Error("Illegal castle");
        // right castle
        if (!castleRight) throw new Error("You cannot right castle");
        if (color === "White") {
          x2 = 62;
          if (
            !(
              prevBoard[60] === "K1" &&
              prevBoard[61] === "X0" &&
              prevBoard[62] === "X0" &&
              prevBoard[63] === "R1" &&
              board[60] === "X0" &&
              board[61] === "R1" &&
              board[62] === "K1" &&
              board[63] === "X0"
            )
          )
            throw new Error("Illegal right castle");
        } else {
          x2 = 61;
          if (
            !(
              prevBoard[59] === "K1" &&
              prevBoard[60] === "X0" &&
              prevBoard[61] === "X0" &&
              prevBoard[63] === "R1" &&
              board[59] === "X0" &&
              board[60] === "R1" &&
              board[61] === "K1" &&
              board[63] === "X0"
            )
          )
            throw new Error("Illegal right castle");
        }
      }
    } else {
      // when exactly two indices changed

      // figure out which of thw two indices should be x1 and x2
      if (prevBoard[diff[0]].charAt(1) === "1") {
        if (prevBoard[diff[1]].charAt(1) === "1") {
          throw new Error("Illegal piece");
        }
        x1 = diff[0];
        x2 = diff[1];
      } else if (prevBoard[diff[1]].charAt(1) === "1") {
        if (prevBoard[diff[0]].charAt(1) === "1") {
          throw new Error("Illegal piece");
        }
        x1 = diff[1];
        x2 = diff[0];
      } else {
        throw new Error("Illegal piece");
      }

      // think of all the possible moves
      const move = {};
      const enPassantMove = {};
      const capture = {};
      pieceMoves(x1, prevBoard, move, capture, enPassantMove);

      // move I just made, x2, must be within legal moves and captures
      if (prevBoard[x2].charAt(1) == "0") {
        if (!move[x2]) {
          // if my move was an en passant move, then I need to pass
          // enPassant position for my enemy which is the position for my enemy to capture
          // this P1 piece that I just moved with en passant
          if (enPassantMove[x2]) enPassant = 63 - (x2 + 8);
          else throw new Error("Illegal move");
        }
      } else if (prevBoard[x2].charAt(1) == "2") {
        if (!capture[x2]) throw new Error("Illegal capture");
      }
    }

    // Check if the move I just made caused myself to be "checked"
    // This is not alllowed in frontend but we double-check here
    // We need the opponent's board to figure out whether I am checked
    let kingIndex; // index of my king in the coordinate of enemy's board
    let enemyMove = {}; // irrelvant here
    let enemyCapture = {}; // available captures enemy can make in enemy's board
    for (let i = 0; i < 64; i++) {
      if (board2[i] === "K2") {
        kingIndex = i;
      }
      pieceMoves(i, board2, enemyMove, enemyCapture, enemyMove);
    }
    if (kingIndex in enemyCapture) {
      throw new Error("You have moved your piece to a check position");
    }

    // checking if my move puts a check on my opponent
    // operations done in my perspective
    let enemyKingIndex; // index of enemy king in my coordinate
    let myMove = {};
    let myCapture = {}; // available captures I can make
    for (let i = 0; i < 64; i++) {
      if (board[i] === "K2") {
        enemyKingIndex = i;
      }
      pieceMoves(i, board, myMove, myCapture, myMove);
    }
    let check = false;
    if (enemyKingIndex in myCapture) {
      check = true;
    }

    // determine if the enemy can castle in the next round
    // (1) king has not moved (2) not in check (3) rook on the side not moved
    // (4) No piece between king and rook (5) not check in the path of king towards castle
    let castleRight = true;
    let castleLeft = true;
    let hasEnemyKingMoved = game.history[game.step].hasKingMoved;
    if (hasEnemyKingMoved || check) {
      castleRight = false;
      castleLeft = false;
    } else {
      let hasEnemyLeftRookMoved = game.history[game.step].hasLeftRookMoved;
      let hasEnemyRightRookMoved = game.history[game.step].hasRightRookMoved;
      if (hasEnemyLeftRookMoved) castleLeft = false;
      if (hasEnemyRightRookMoved) castleRight = false;
      // check no piece between king and rook
      if (castleLeft) {
        if (color === "White") {
          if (
            !(
              board[4] === "K2" &&
              board[5] === "X0" &&
              board[6] === "X0" &&
              board[7] === "R2"
            )
          )
            castleLeft = false;
        } else {
          if (
            !(
              board[3] === "K2" &&
              board[4] === "X0" &&
              board[5] === "X0" &&
              board[6] === "X0" &&
              board[7] === "R2"
            )
          )
            castleLeft = false;
        }
      }
      if (castleRight) {
        if (color === "White") {
          if (
            !(
              board[4] === "K2" &&
              board[3] === "X0" &&
              board[2] === "X0" &&
              board[1] === "X0" &&
              board[0] === "R2"
            )
          )
            castleRight = false;
        } else {
          if (
            !(
              board[3] === "K2" &&
              board[2] === "X0" &&
              board[1] === "X0" &&
              board[0] === "R2"
            )
          )
            castleRight = false;
        }
      }
      // check if the king's castle path is in myCapture
      // Note: myCapture is in my coordinate
      if (castleLeft) {
        if (enemyKingIndex - 1 in myCapture) {
          castleLeft = false;
        }
        if (enemyKingIndex - 2 in myCapture) {
          castleLeft = false;
        }
      }
      if (castleRight) {
        if (enemyKingIndex + 1 in myCapture) {
          castleRight = false;
        }
        if (enemyKingIndex + 2 in myCapture) {
          castleRight = false;
        }
      }
    }

    // Regardess of I put a check on my opponent, I want to know if the enemy can make legal moves
    // that would not cause himself to be checked
    // if check === true, the enemy can't move --> checkmate (I win)
    // if check === false, the enemy can't move --> stalemate (we tie)
    let canEnemyMove = false;
    for (let x = 0; x < 64; x++) {
      // x is in enemy's coordinate
      enemyMove = {}; // available moves enemy can make in enemy's board
      enemyCapture = {}; // available captures enemy can make in enemy's board
      // find each opponent piece's move/capture
      pieceMoves(x, board2, enemyMove, enemyCapture, enemyMove);

      // for each enemyMove, check if such move will cuase the enemy to be checked by me
      for (let key in enemyMove) {
        // x is enemy's current position, y is enemy's new position both in enemy's coordinate
        let y = Number(key);

        // Enemy makes the move and record in my board
        board[63 - y] = board[63 - x];
        board[63 - x] = "X0";

        let enemyKingIndex; // index of enemy king in my coordinate
        let myCounterMove = {}; // irrelevant
        let myCounterCapture = {}; // available captures I can make in response to enemy's move
        for (let i = 0; i < 64; i++) {
          if (board[i] === "K2") {
            enemyKingIndex = i;
          }
          pieceMoves(i, board, myCounterMove, myCounterCapture, myCounterMove);
        }
        // Undo Enemy move and record in my board
        board[63 - x] = board[63 - y];
        board[63 - y] = "X0";

        if (!(enemyKingIndex in myCounterCapture)) {
          canEnemyMove = true;
          break;
        }
      }
      if (canEnemyMove) break;

      // for each enemyCapture, check if such capture will cuase the enemy to be checked by me
      for (let key in enemyCapture) {
        // x is enemy's current position, y is enemy's new position both in enemy's coordinate
        let y = Number(key);

        // Enemy makes the capture and record in my board
        let capturedPiece = board[63 - y];
        board[63 - y] = board[63 - x];
        board[63 - x] = "X0";
        if (board2[x] === "P1" && y === enPassant) {
          // en Passant capture
          board[63 - (y + 8)] = "X0";
        }

        let enemyKingIndex; // index of enemy king in my coordinate
        let myCounterMove = {}; // irrelevant
        let myCounterCapture = {}; // available captures I can make in response to enemy's capture
        for (let i = 0; i < 64; i++) {
          if (board[i] === "K2") {
            enemyKingIndex = i;
          }
          pieceMoves(i, board, myCounterMove, myCounterCapture, myCounterMove);
        }
        // Undo Enemy capture and record in my board
        board[63 - x] = board[63 - y];
        board[63 - y] = capturedPiece;
        if (board2[x] === "P1" && y === enPassant) {
          board[63 - (y + 8)] = "P2";
        }

        if (!(enemyKingIndex in myCounterCapture)) {
          canEnemyMove = true;
          break;
        }
      }
      if (canEnemyMove) break;
    }
    if (castleLeft) canEnemyMove = true;
    if (castleRight) canEnemyMove = true;

    // update if king or rooks have moved for this round
    let hasMyKingMoved = false;
    let hasMyLeftRookMoved = false;
    let hasMyRightRookMoved = false;
    if (game.step !== 0) {
      hasMyKingMoved = game.history[game.step - 1].hasKingMoved;
      hasMyLeftRookMoved = game.history[game.step - 1].hasLeftRookMoved;
      hasMyRightRookMoved = game.history[game.step - 1].hasRightRookMoved;
      if (!hasMyKingMoved) {
        const kingIndex = color === "White" ? 60 : 59;
        if (board[kingIndex] !== "K1") hasMyKingMoved = true;
        if (board[56] !== "R1") hasMyLeftRookMoved = true;
        if (board[63] !== "R1") hasMyRightRookMoved = true;
      }
    }

    const checkmate = check && !canEnemyMove;
    const stalemate = !check && !canEnemyMove;
    let winner = "";
    if (stalemate) winner = "tie";
    if (checkmate) winner = color === "White" ? "White" : "Black";

    // save new round
    const newRound = {
      step: round.step,
      boardWhite: color === "White" ? round.board : convertToWhite(round.board),
      boardBlack: color === "White" ? convertToBlack(round.board) : round.board,
      prevPieceWhite: color === "White" ? x2 : 63 - x2,
      prevPieceBlack: color === "White" ? 63 - x2 : x2,
      enPassant,
      check,
      winner,
      hasKingMoved: hasMyKingMoved,
      hasLeftRookMoved: hasMyLeftRookMoved,
      hasRightRookMoved: hasMyRightRookMoved,
      castleRight,
      castleLeft,
    };

    game.step = round.step;
    game.history.push(newRound);
    await game.save();

    return game;
  },
};

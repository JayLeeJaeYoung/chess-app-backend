# Chess App backend

This React app is a backend for the fullstack MERN app whose frontend can be found at:
https://github.com/JayLeeJaeYoung/chess-app-frontend

The app is hosted live at: http://JayLeeJaeYoung.github.io/chess-app-frontend
Please contact the admin for access password

## Description

Please refer to https://github.com/JayLeeJaeYoung/chess-app-frontend

## Design

Built on MERN stack.
socket.io to handle emit events.
mongoose to manage mongoDB.
controller and routers are combined under router folder.

/router/games-helper.js managers algorithm for chess board movements.
Since I want to show the chess board such that each player (i.e. "white" and "black" pieces) sees his/her own board at the bottom of the board, I save boardWhite: [] and boardBlack: [] separately at each round and send different boards to each player when API requests are made. The player that just made a move in a round would submit through REST API, then receives a response from the API call. The player who is waiting for his/her turn gets updated chess board through socket.io's emit event.

I chose to represent the chess board as a 1D array of size 64 where the player in turn will have pieces named "P1" (pawn), "B1" (bishop), etc and the opponent player's pieces will be named "P2" (pawn), etc, and the empty cell is named "X0." 

The detailed algorithm to check en passant move, en passant capture (i.e. capturing the pawn who just made an en passant move), castle, check, checkmate, stalemate are commented throughout games-helper.js.

The token is set to expire after 3 hours.

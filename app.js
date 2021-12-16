const express = require("express");
const mongoose = require("mongoose");
const CronJob = require("cron").CronJob;

const { MONGODB_URL } = require("./util/config");
const { PORT } = require("./util/config");
const userRouter = require("./router/users-router");
const gameRouter = require("./router/games-router");
const checkTokenSocket = require("./middleware/check-token-socket");
const HttpError = require("./util/http-error");

const User = require("./models/user");

let users = {}; // cache

mongoose.connect(MONGODB_URL).catch((err) => console.log(err));

mongoose.connection.on("connected", () => {
  console.log("MongoDB has connected succesfully");
});
mongoose.connection.on("reconnected", () => {
  console.log("MongoDB has reconnected");
});
mongoose.connection.on("error", (error) => {
  console.log("MongoDB connection has an error", error);
  mongoose.disconnect();
});
mongoose.connection.on("disconnected", () => {
  console.log("MongoDB connection is disconnected");
});

const app = express();
const server = app.listen(PORT);
const io = require("./util/socket").init(server);

app.use(express.json());

// CORS allow
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-type, Accept, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE"
  );
  next();
});

app.use("/api/users", userRouter);
app.use("/api/games", gameRouter);

io.use(checkTokenSocket);

// No router found error
app.use((error, req, res, next) => {
  if (res.headerSent) return next(error);
  res.status(error.code || 500);
  res.json({ message: error.message || "500 Internal Server Error" });
});

io.on("connect", async (socket) => {
  console.log(`Socket ${socket.id}   ${socket.uid} connected.`);
  // if this socket is not in cache or that th socket id has changed (due to refreshing the page)
  if (!users[socket.uid] || users[socket.uid] !== socket.id) {
    users[socket.uid] = socket.id;
    let user;
    try {
      user = await User.findById(socket.uid);
    } catch (err) {
      throw new HttpError(err, 500);
    }
    if (!user) {
      throw new HttpError("No user found", 404);
    }
    user.sid = socket.id;
    try {
      await user.save();
    } catch (err) {
      throw new HttpError(err, 500);
    }
  }

  socket.on("disconnect", async () => {
    console.log(`Socket ${socket.id}   ${socket.uid} disconnected.`);
    // delete from cache and User database
    delete users[socket.uid];
    let user;
    try {
      user = await User.findById(socket.uid);
    } catch (err) {
      throw new HttpError(err, 500);
    }
    if (!user) {
      throw new HttpError("No user found", 404);
    }
    user.sid = undefined;
    try {
      await user.save();
    } catch (err) {
      throw new HttpError(err, 500);
    }
  });
});

const User = require("../models/user");
const Game = require("../models/game");
const { MONGODB_URL } = require("./config");
const MongoClient = require("mongodb").MongoClient;

// const job = new CronJob("00 00 00 * * *", async () => {
//     // https://github.com/kelektiv/node-cron/blob/master/examples/at_midnight.js
//     // delete any data older than 24 hours at midnight
//     const d = new Date();
//     console.log("Midnight:", d);

//     try {
//       let yesterday = new Date();
//       yesterday.setDate(yesterday.getDate() - 1);
//       let deleteCount = await User.deleteMany({ time: { $lte: yesterday } });
//       console.log("Old user data deleted: " + deleteCount);
//       deleteCount = await Game.deleteMany({ time: { $lte: yesterday } });
//       console.log("Old game data deleted: " + deleteCount);
//     } catch (err) {
//       return next(new HttpError("Old user/game data deletion fail " + err), 500);
//     }
//   });
//   job.start();

const cleanUpDatabase = async () => {
  // https://github.com/kelektiv/node-cron/blob/master/examples/at_midnight.js
  // delete any data older than 24 hours at midnight
  const d = new Date();
  let yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const client = new MongoClient(MONGODB_URL);

  try {
    await client.connect();
    const db = client.db();
    // let deleteCount = await User.deleteMany({ time: { $lte: yesterday } });
    let deleteCount = await db
      .collection("games")
      .deleteMany({ time: { $lte: yesterday } });
    console.log("Old user data deleted: " + deleteCount);
    // deleteCount = await Game.deleteMany({ time: { $lte: yesterday } });
    deleteCount = await db
      .collection("users")
      .deleteMany({ time: { $lte: yesterday } });
    console.log("Old game data deleted: " + deleteCount);
  } catch (err) {
    console.log(`error occurred: ${err}`);
  }
};

cleanUpDatabase();

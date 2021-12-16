const User = require("../models/user");
const Game = require("../models/game");

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
  try {
    let yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    let deleteCount = await User.deleteMany({ time: { $lte: yesterday } });
    console.log("Old user data deleted: " + deleteCount);
    deleteCount = await Game.deleteMany({ time: { $lte: yesterday } });
    console.log("Old game data deleted: " + deleteCount);
  } catch (err) {
    return next(new HttpError("Old user/game data deletion fail " + err), 500);
  }
};

cleanUpDatabase();

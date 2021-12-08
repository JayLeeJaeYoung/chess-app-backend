const jwt = require("jsonwebtoken");

const HttpError = require("../util/http-error");
const { TOKEN_SECRET_KEY } = require("../util/config");

//middleware
const checkTokenSocket = (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      console.log(`No token provided: id: ${socket.id}`);
      return next(new Error(`No token provided: ${socket.id}`));
    }
    const decodedToken = jwt.verify(token, TOKEN_SECRET_KEY);
    socket.uid = decodedToken.uid;
    // console.log(`Token correct: id: ${socket.id}   uid: ${socket.uid}`);
    next();
  } catch (err) {
    return next(new HttpError("Forbidden (token): " + err, 403));
  }
};

module.exports = checkTokenSocket;

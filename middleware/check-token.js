const jwt = require("jsonwebtoken");

const HttpError = require("../util/http-error");
const { TOKEN_SECRET_KEY } = require("../util/config");

//middleware
const checkToken = (req, res, next) => {
  if (req.method == "OPTIONS") return next();
  try {
    // Authorization: 'Bearer token'
    const token = req.headers.authorization.split(" ")[1];
    if (!token) throw new Error("No token");
    const decodedToken = jwt.verify(token, TOKEN_SECRET_KEY);
    req.userData = { uid: decodedToken.uid };
    next();
  } catch (err) {
    return next(new HttpError("Forbidden (token): " + err, 403));
  }
};

module.exports = checkToken;

const express = require("express");
const router = express.Router();
const uuid = require("uuid");

const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const HttpError = require("../util/http-error");
const { TOKEN_SECRET_KEY, PASSWORD } = require("../util/config");

/**
 * POST /api/users/login: log in user
 */
router.post(
  "/login",

  [check("password").trim()],

  async (req, res, next) => {
    // validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        new HttpError("Invalid inputs: " + JSON.stringify(errors.errors), 400)
      );
    }

    const { password } = req.body;

    // check password
    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(PASSWORD, 12);
    } catch (err) {
      return next(new HttpError("Server Error: " + err, 500));
    }

    let isPasswordValid;
    try {
      isPasswordValid = await bcrypt.compare(password, hashedPassword);
    } catch (err) {
      return next(new HttpError("Server Error: " + err), 500);
    }
    if (!isPasswordValid) {
      return next(new HttpError("Invalid password", 403));
    }

    // create a new user and save to db
    // arbitrarily give a name to identify the unique user
    const newUser = new User({ name: uuid.v1() });
    try {
      await newUser.save();
    } catch (err) {
      return next(new HttpError("Signup failure: " + err, 500));
    }

    // create token
    let token;
    try {
      token = jwt.sign({ uid: newUser.id }, TOKEN_SECRET_KEY, {
        expiresIn: "3h",
      });
    } catch (err) {
      return next(new HttpError("Token creation fail: " + err), 500);
    }

    res.status(201).json({
      message: "POST /api/users/login: log in user",
      uid: newUser.id,
      token,
    });
  }
);

module.exports = router;

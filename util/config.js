module.exports = {
  PASSWORD: process.env.PASSWORD,
  TOKEN_SECRET_KEY: process.env.TOKEN_SECRET_KEY,
  MONGODB_URL: `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.dkxpc.mongodb.net/${process.env.DB_NAME}`,
  PORT: process.env.PORT,
};

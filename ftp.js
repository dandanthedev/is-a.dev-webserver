const fs = require("fs");
const FtpSrv = require("ftp-srv");
const port = 21;
require('dotenv').config();
const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
const userSchema = require('./data'); // Import your Mongoose schema definition
// bcrypt
const bcrypt = require('bcrypt');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/';
const dbName = process.env.DATABASE_NAME || 'your_database_name';

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connect(uri + "hosting-config", { useNewUrlParser: true, useUnifiedTopology: true });

const ftpServer = new FtpSrv({
  url: "ftp://0.0.0.0:" + port,
  anonymous: false,
  pasv_url: '217.174.245.249',
  pasv_min: '15000',
  pasv_max: '15100',
});
const { generateConfig } = require("./functions.js");

ftpServer.on("login", async ({ connection, username, password }, resolve, reject) => {
  try {
    if (
      username.includes("..") ||
      username.includes("/") ||
      username.includes("\\") ||
      username.includes(" ")
    )
      return reject("Invalid username");

    const User = mongoose.model("hostingdata"); // Replace with your Mongoose model name
    const user = await User.findOne({ domain: username }).exec();

    if (!user) {
      return reject("User does not exist");
    }

    if (!user.FTP) {
      return reject("FTP is disabled for this user");
    }

    if (user.HashedPassword && !bcrypt.compareSync(password, user.HashedPassword)) {
      return reject("Invalid password");
    }

    return resolve({ root: `content/${username}` });
  } catch (err) {
    console.log(err);
    return reject("Internal server error");
  }
});

ftpServer.listen().then(() => {
  console.log("FTP Server listening on port " + port);
});

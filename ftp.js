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

// Function to calculate the size of a file (you need to implement this)
function calculateFileSize(filename) {
  // Implement logic to calculate the size of the file
  // For example, you can use fs.statSync(filename).size
}

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

ftpServer.on("stor", async ({ connection, username, filename }, accept, reject) => {
  try {
    // Calculate the size of the file being uploaded
    const fileSize = calculateFileSize(filename);

    // Retrieve the user's storage usage from MongoDB
    const User = mongoose.model("hostingdata");
    const user = await User.findOne({ domain: username }).exec();

    if (!user) {
      return reject("User does not exist");
    }

    if (!user.FTP) {
      return reject("FTP is disabled for this user");
    }

    // Calculate the user's new storage usage after the upload
    const newUserStorageUsed = user.storageUsed + fileSize;

    // Check if the user's storage will exceed the limit
    if (newUserStorageUsed > 100 * 1024 * 1024) { // 100MB in bytes
      return reject("Storage quota exceeded. Please delete files to free up space.");
    }

    // Update the user's storage usage in the database
    user.storageUsed = newUserStorageUsed;
    await user.save();

    // If all checks pass, accept the file upload
    accept();
  } catch (err) {
    console.error(err);
    reject("Internal server error");
  }
});

ftpServer.on("dele", async ({ connection, username, filename }, resolve, reject) => {
  try {
    // Calculate the size of the file being deleted
    const fileSize = calculateFileSize(filename);

    // Retrieve the user's storage usage from MongoDB
    const User = mongoose.model("hostingdata");
    const user = await User.findOne({ domain: username }).exec();

    if (!user) {
      return reject("User does not exist");
    }

    if (!user.FTP) {
      return reject("FTP is disabled for this user");
    }

    // Subtract the file size from the user's storage usage
    const newUserStorageUsed = user.storageUsed - fileSize;

    // Ensure that the storage usage doesn't go below 0
    if (newUserStorageUsed < 0) {
      user.storageUsed = 0;
    } else {
      user.storageUsed = newUserStorageUsed;
    }

    // Update the user's storage usage in the database
    await user.save();

    // Resolve the file deletion request
    resolve();
  } catch (err) {
    console.error(err);
    reject("Internal server error");
  }
});

ftpServer.listen().then(() => {
  console.log("FTP Server listening on port " + port);
});

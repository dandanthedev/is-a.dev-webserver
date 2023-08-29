const fs = require("fs");
const chmod = require("chmod");
require("dotenv").config();
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
const userSchema = require('./data'); // Import your Mongoose schema definition
// bcrypt
const bcrypt = require('bcrypt');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/';
const dbName = process.env.DATABASE_NAME || 'your_database_name';

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connect(uri + "hosting-config", { useNewUrlParser: true, useUnifiedTopology: true });



async function generateConfigWithActivation(domain, email) {
  let config = {};
    config = {
      domain: domain,
      ACTIVATION_EMAIL: email,
      FTP: true,
      ACTIVATED: false,
      HashedPassword:
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15),
    };
    let userDocument = new userSchema(config);
    await userDocument.save();
  

  return config.ACTIVATION_CODE;
}

async function generateConfig(domain) {
  let config = {};
    config = {
      domain: domain,
      FTP: true,
      ACTIVATED: true,
      HashedPassword:
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15),
    };
    let userDocument = new userSchema(config);
    await userDocument.save();

  return config;
}

async function activateDomain(domain, callback) {
  const User = mongoose.model("hostingdata"); // Replace with your Mongoose model name
  const user = await User.findOne({ domain }).exec();
    let useremail = '';

    try {
      let config = user;
      //console.log(config.activation_code);
      
      //if (config.ACTIVATION_CODE === activation_code) {
        // Remove activation code
          useremail = config.ACTIVATION_EMAIL;
          password = config.HashedPassword;
          // hash password
          const pas = await bcrypt.hash(password, 10);
          await User.updateOne({ domain }, { $set: {  ACTIVATED: true, HashedPassword: pas } });
          const msg = {
            to: useremail,
            from: 'hosting@maintainers.is-a.dev', // This email should be verified in your SendGrid settings
            templateId: 'd-694e5d1edfca4cbca4958fb4fb4516f3', // Replace with your actual dynamic template ID
            dynamic_template_data: {
              username: domain,
              password: password,
              // Other dynamic data that your template requires
            },
          };
          await sgMail
            .send(msg)
            .then(() => {
              console.log('Email sent');
            })
            .catch((error) => {
              console.error(error);
            });

          // Success: Activation code matched and config file updated
          callback(null, true);
    
}
    catch (err) {
      // Error: Activation code did not match
      callback(err, false);
    }
}

function fetchDir(dir) {
  let files = [];
  let dirFiles = fs.readdirSync(dir);
  for (let file of dirFiles) {
    let stats = fs.statSync(`${dir}/${file}`);
    if (stats.isDirectory()) {
      files.push({
        file: `${file}`,
        type: "directory",
        path: dir.replace(`content/${dir.split("/")[1]}`, ""),
      });
      let subFiles = fetchDir(`${dir}/${file}`);
      subFiles.forEach((element) => {
        files.push(element);
      });
    } else {
      files.push({
        file: `${file}`,
        type: "file",
        path: dir.replace(`content/${dir.split("/")[1]}`, ""),
      });
    }
  }
  return files;
}

function getUserFiles(domain) {
  try {
    //recursively get all files and make them an array with {file, type}
    let files = fetchDir(`content/${domain}`);
    return files;
  } catch (err) {
    return [];
  }
}

module.exports = { generateConfig, getUserFiles, generateConfigWithActivation, activateDomain };

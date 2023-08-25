const fs = require('fs');
require('dotenv').config();
const path = require('path');
const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
const userSchema = require('./data'); // Import your Mongoose schema definition
// bcrypt
const bcrypt = require('bcrypt');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/';
const dbName = process.env.DATABASE_NAME || 'your_database_name';

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connect(uri + "hosting-config", { useNewUrlParser: true, useUnifiedTopology: true });

async function processConfigFiles(directoryPath) {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(dbName);

    const folderName = path.basename(directoryPath);

    const files = fs.readdirSync(directoryPath);

    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Recurse into subdirectory
        await processConfigFiles(filePath);
      } else if (file === 'config.json') {
        const configData = fs.readFileSync(filePath, 'utf-8');
        const configObj = JSON.parse(configData);
        let pas = '';
        // hash password
        if (configObj.ftp_password) {
            pas = await bcrypt.hash(configObj.ftp_password, 10);
        }


        // Extract relevant fields from configObj
        const userData = {
          domain: folderName,
          HashedPassword: pas,
          FTP: configObj.ftp,
        };

        // Conditionally add HashPagePassword if it exists
        if (configObj.HashPagePassword) {
          userData.HashPagePassword = configObj.HashPagePassword;
        }
        if (configObj.SMTP) {
          userData.EMAIL = configObj.SMTP;
        }
        if (configObj.ACTIVATED) {
          userData.ACTIVATED = configObj.ACTIVATED;
        }
        if (configObj.ACTIVATION_CODE) {
          userData.ACTIVATION_CODE = configObj.ACTIVATION_CODE;
        }

        // Create a new Mongoose document
        const userDocument = new userSchema(userData);

        // Save the document to MongoDB using Mongoose
        await userDocument.save();
        console.log(`Inserted data from ${filePath} into MongoDB`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

async function main() {
  try {
    await processConfigFiles('content/');
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB (Mongoose)');
  }
}

main();

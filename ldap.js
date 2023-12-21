const ldap = require('ldapjs');
require("dotenv").config();
const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
const userSchema = require('./data'); // Import your Mongoose schema definition
// bcrypt
const bcrypt = require('bcrypt');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/';
const dbName = process.env.DATABASE_NAME || 'your_database_name';

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connect(uri + "hosting-config", { useNewUrlParser: true, useUnifiedTopology: true });



// Create an LDAP server
const server = ldap.createServer();

// Handle LDAP bind (authentication) requests
server.bind('ou=users,o=isdev', function (req, res, next) {
  const dn = req.dn.toString();
  const domain = dn.split(',')[0].split('=')[1];
  const password = req.credentials;

  // Search for the user in MongoDB
  userSchema.findOne({ domain }, (err, user) => {
    if (err) {
      return next(new ldap.InvalidCredentialsError());
    }

    if (user.HashedPassword && !bcrypt.compareSync(password, user.HashedPassword)) {
        return next(new ldap.InvalidCredentialsError());
    }

    // Authentication successful
    res.end();
    return next();
  });
});

// Start the LDAP server
server.listen(1389, () => {
  console.log('LDAP server listening on port 1389');
});

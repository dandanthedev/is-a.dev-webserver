require("dotenv").config();
const Sentry = require("@sentry/node");
const express = require("express");
const session = require("express-session");
const path = require('path');
const cors = require("cors");
const archiver = require('archiver');
const { generateConfig, getUserFiles, generateConfigWithActivation, activateDomain } = require("./functions.js");
const { generateLink, checkLinkExpiration } = require("./downloads.js");
const { getSocketJWT } = require("./auth.js");
const { sgMail } = require('@sendgrid/mail');
const app = express();
const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
const userSchema = require('./data'); // Import your Mongoose schema definition
// bcrypt
const bcrypt = require('bcrypt');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/';
const dbName = process.env.DATABASE_NAME || 'your_database_name';

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connect(uri + "hosting-config", { useNewUrlParser: true, useUnifiedTopology: true });

const User = mongoose.model("hostingdata"); 

Sentry.init({
  dsn: "https://244a1ad4b427c80530cffbebc2c7b3a4@o4505716264599552.ingest.sentry.io/4505716341800960",
  integrations: [
    // enable HTTP calls tracing
    new Sentry.Integrations.Http({
      tracing: true
    }),
    // enable Express.js middleware tracing
    new Sentry.Integrations.Express({
      app
    }),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% of the transactions, reduce in production!,
});

// Trace incoming requests
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());
app.set("view engine", "ejs");

const port = 3000;




const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());



app.use((req, res, next) => {
  if (req.url.includes("config.json"))
    return res.status(404).send("nice try ;)");

  // If 'config.json' is not in the requested URL, move to the next middleware
  next();
});

app.use(cors())

const fs = require("fs");
const { getJWT } = require("./jwt");



//api routes
app.post("/api/upload", async (req, res) => {
  try {
    let domain = req.query.domain;
    let jwt = req.query.jwt;
    let user = getJWT(jwt);
    if (!user) return res.status(403).send("Invalid JWT");

    let data = await fetch(process.env.API_URL + "/domains/" + domain + "/get");
    data = await data.json();

    if (data.error) return res.status(500).send(data.error);
    if (data.owner?.username != user.user.login)
      return res
        .status(403)
        .json({ error: "You are not the owner of this domain" });

    //check if directory content/host exists
    if (!fs.existsSync(`content/${domain}`))
      return res.status(404).json({ error: "Domain dosnt' exist" });

    //check if file is in request
    if (!req.files) return res.status(400).json({ error: "No file uploaded" });

    // save file to disk
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: err });
  }
});

app.get('/api/protected/:domain/:linkId', checkLinkExpiration, (req, res) => {
  // Serve a file (you might need to adjust the file path)
  res.render('archive', { domain: req.params.domain + ".is-a.dev", download: req.params.linkId });
  

});    

app.get('/api/download', async (req, res) => {
  // get user input
  let domain = req.query.domain;
  domain = domain.split(".is-a.dev")[0];
  const jwt = req.query.jwt;

  // check if user is authenticated
  const user = getJWT(jwt);
  if (!user) return res.status(403).send("Invalid JWT");

  // check if user is owner of the domain
  let data = await fetch(process.env.API_URL + "/domains/" + domain + "/get");
  data = await data.json();
  if (data.error) return res.status(500).send(data.error);
  if (data.owner?.username != user.user.login)
    return res
      .status(403)
      .json({ error: "You are not the owner of this domain" });

  if (!fs.existsSync(`content/${domain}`))
    return res.status(404).json({ error: "Domain dosnt' exist" });
      
  const folderToZip = path.join(__dirname, `/content/${domain}/`);
  const zipFileName = `${domain}.zip`;

  // Create a writable stream for the zip file
  const output = fs.createWriteStream(zipFileName);

  // Create an archiver instance
  const archive = archiver('zip', {
    zlib: { level: 9 } // Set compression level
  });

  // Pipe the output stream to the archive
  archive.pipe(output);

  // Append the entire folder to the archive
  archive.directory(folderToZip, false);

  // Finalize the archive
  archive.finalize();

  // Set response headers to indicate a downloadable file
  res.attachment(zipFileName);

  // Pipe the zip file to the response
  output.on('close', () => {
    res.status(200).sendFile(zipFileName, { root: __dirname });
  });
});

app.get("/api/discord", async (req, res) => {
  let domain = req.query.domain;
  domain = domain.split(".is-a.dev")[0];
  let jwt = req.query.jwt;
  let contents = req.query.dh;
  let user = getJWT(jwt);
  if (!user) return res.status(403).send("Invalid JWT");
  if (!domain) return res.status(400).send("No domain provided");
  let data = await fetch(process.env.API_URL + "/domains/" + domain + "/get");
  data = await data.json();
  if (data.error) return res.status(500).send(data.error);
  if (data.owner?.username.toLowerCase() != user.user.login.toLowerCase())
    return res
      .status(403)
      .json({ error: "You are not the owner of this domain" });

  LinkDiscord(domain, contents)
  return res.json({ success: true });
});
  



app.get("/api/SMTP", async (req, res) => {
  let domain = req.query.domain;
  domain = domain.split(".is-a.dev")[0];
  let jwt = req.query.jwt;
  let enabled = req.query.enabled;
  let user = getJWT(jwt);
  if (!user) return res.status(403).send("Invalid JWT");
  if (!domain) return res.status(400).send("No domain provided");
  let data = await fetch(process.env.API_URL + "/domains/" + domain + "/get");
  data = await data.json();
  if (data.error) return res.status(500).send(data.error);
  if (data.owner?.username.toLowerCase() != user.user.login.toLowerCase())
    return res
      .status(403)
      .json({ error: "You are not the owner of this domain" });
  await User.findOneAndUpdate(
    { domain },
    { EMAIL: enabled })
  return res.json({ success: true });
});

app.get("/api/panel", async (req, res) => {
  let jwt = req.query.jwt;
  let domain = req.query.domain;
  let user = getJWT(jwt);
  let profilepic = `https://avatars.githubusercontent.com/${user.user.login}`
  if (!user) return res.status(403).send("Invalid JWT");

  let data = await fetch(process.env.API_URL + "/domains/" + domain + "/get");
  data = await data.json();
  const domainData = await User.findOne({ domain }).exec();
  let EMAIL = '';
  if (domainData.EMAIL == undefined) {
    EMAIL = "";
  } else {
    // if domainData.EMAIL is true then set EMAIL to checked
    if (domainData.EMAIL == true) {
      EMAIL = "checked";
    }
    else {
      EMAIL = "";
    }
  }
    
  domain = domain + ".is-a.dev"
  if (data.error) return res.status(500).send(data.error);
  if (data.owner?.username.toLowerCase() != user.user.login.toLowerCase())
    return res
      .status(403)
      .json({ error: "You are not the owner of this domain" });
  return res.render("panel", { username: user.user.login, profilepic: profilepic, domain: domain, SMTP: EMAIL, jwt: jwt });
});

app.get("/api/domain", async (req, res) => {
  try {
    let domain = req.query.domain;
    let jwt = req.query.jwt;
    
    let user = getJWT(jwt);
    if (!user) return res.status(403).send("Invalid JWT");

    let data = await fetch(process.env.API_URL + "/domains/" + domain + "/get");
    data = await data.json();

    
    if (data.error) return res.status(500).send(data.error);
    if (data.owner?.username.toLowerCase() != user.user.login.toLowerCase())
      return res
        .status(403)
        .json({ error: "You are not the owner of this domain" });

    if (!fs.existsSync(`content/${domain}`))
      return res.status(404).json({ error: "Domain dosnt' exist" });
    
    
    return res.json({ success: true });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: err });
  }
});

app.get("/api/activate", async (req, res) => {
  let domain = req.query.domain;
  let NOTIFY = req.query.NOTIFY_TOKEN;
  // if notify token dosnt match process.env.NOTIFY_TOKEN return 403
  if (NOTIFY !== process.env.NOTIFY_TOKEN) return res.status(403).send("Invalid token");

  //let activation_code = req.query.activation_code;
  activateDomain(domain, async (err, result) => {
    if (err) {
      console.error('Error:', err);
      return;
    }
    
    if (result) {
      return res.json({ success: true });
    } else {
      return res.status(500).json({ error: "Invalid activation code" });
    }
  });
});


app.get("/api/preregister", async (req, res) => {
  try {
    let domain = req.query.domain;
    let jwt = req.query.jwt;
    let pr = req.query.pr;
    let user = getJWT(jwt);
    if (!user) return res.status(403).send("Invalid JWT");

    let data = await fetch(process.env.API_URL + "/domains/" + domain + "/get");
    data = await data.json();
    let email = user.emails.find((email) => email.primary)

    if (data.error) return res.status(500).send(data.error);

    if (data.info) {
      //check if directory content/host exists
      if (fs.existsSync(`content/${domain}`))
      return res.status(400).json({ error: "Domain already exists" });

      //duplicate skeleton
      fs.mkdirSync(`content/${domain}`);
      let files = fs.readdirSync("skeleton");
      for (let file of files) {
        fs.copyFileSync(`skeleton/${file}`, `content/${domain}/${file}`);
      }
      let response = generateConfigWithActivation(domain, email.email);
      let activation_code = "notUsed";
      console.log(activation_code + " " + email.email + " " + domain);
      await fetch(`https://notify-api.is-a.dev/api/preregister?domain=${domain}&pr=${pr}&activation_code=${activation_code}&token=${process.env.NOTIFY_TOKEN}`)
      return res.json({ success: true });
    }
    if (data.owner?.username != user.user.login)
      return res
        .status(403)
        .json({ error: "You are not the owner of this domain" });    

  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: err });
  }
});

app.get('/api/domain/set-password', async (req, res) => {
  try {
    let domain = req.query.domain;
    domain = domain.split(".is-a.dev")[0];
    let jwt = req.query.jwt;

    let user = getJWT(jwt);
    if (!user) return res.status(403).send('Invalid JWT');

    // Fetch data from API to authenticate the user
    let data = await fetch(process.env.API_URL + '/domains/' + domain + '/get');
    data = await data.json();

    if (data.error) return res.status(500).send(data.error);
    if (data.owner?.username.toLowerCase() != user.user.login.toLowerCase())
      return res
        .status(403)
        .json({ error: 'You are not the owner of this domain' });

    let password = req.query.password;

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the user's password in the database
    const User = mongoose.model('hostingdata'); // Replace with your Mongoose model name
    const updatedUser = await User.findOneAndUpdate(
      { domain },
      { HashedPassword: hashedPassword },
      { new: true } // Return the updated user document
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.get("/api/register", async (req, res) => {
  try {
    let domain = req.query.domain;
    let jwt = req.query.jwt;

    let user = getJWT(jwt);
    if (!user) return res.status(403).send("Invalid JWT");

    let data = await fetch(process.env.API_URL + "/domains/" + domain + "/get");
    data = await data.json();

    if (data.error) return res.status(500).send(data.error);
    if (data.owner?.username != user.user.login)
      return res
        .status(403)
        .json({ error: "You are not the owner of this domain" });

    //check if directory content/host exists
    if (fs.existsSync(`content/${domain}`))
      return res.status(400).json({ error: "Domain already exists" });

    //duplicate skeleton
    fs.mkdirSync(`content/${domain}`);
    let files = fs.readdirSync("skeleton");
    for (let file of files) {
      fs.copyFileSync(`skeleton/${file}`, `content/${domain}/${file}`);
    }
    let response = generateConfig(domain);

    return res.json({ success: true, pass: 'NOT ready' });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: err });
  }
});

app.get(".isadev", async (req, res) => {
  try {
    //Check if the domain exists
    if (!fs.existsSync(`content/${domain}`))
      return res.status(404).json({
        error: "Domain not found",
      });
    //Load config
    let config = fs.readFileSync(__dirname + `/content/${domain}/config.json`);
    config = JSON.parse(config);

    res.json({
      isadev: true,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});

app.get("*", async (req, res) => {
  try {
    // Domain variable
    let domain = req.headers.host;
    domain = domain.split(":")[0];
    domain = domain.split(".is-a.dev")[0];

    // Connect to MongoDB and find user data
    const User = mongoose.model("hostingdata"); // Replace with your Mongoose model name
    const user = await User.findOne({ domain }).exec();

    if (!user) {
      return res.status(404).sendFile(__dirname + "/404.html");
    }

    let file = req.url;
    // Remove query string
    if (file.includes("?")) file = file.split("?")[0];

    // Password protection
    if (user.HashPagePassword && !bcrypt.compareSync(req.query.password, user.HashPagePassword)) {
      return res.sendFile(__dirname + "/login.html");
    }

    if (user.ACTIVATED !== true) {
      return res.sendFile(__dirname + "/activation.html");
    }

    // Get file
    if (file.includes("..")) {
      return res.status(403).sendFile(__dirname + "/403.html");
    }
    if (file.startsWith("/")) {
      file = file.substring(1);
    }

    // Check if file exists
    let path = `content/${domain}/${file}`;
    // If path is a directory, add index.html
    if (fs.lstatSync(path).isDirectory()) {
      path += "/index.html";
    }
    if (!fs.existsSync(path)) {
      // If custom 404 exists, send it, else send default
      if (fs.existsSync(`content/${domain}/404.html`)) {
        return res.status(404).sendFile(`content/${domain}/404.html`);
      }
      return res.status(404).sendFile(__dirname + "/404.html");
    }

    // Serve file
    return res.sendFile(__dirname + "/" + path);
  } catch (err) {
    console.log(err);
    return res.status(500).sendFile(__dirname + "/500.html");
  } 
});



app.post("*", (req, res) => {
  try {
    let domain = req.headers.host;
    domain = domain.split(":")[0];
    domain = domain.split(".is-a.dev")[0];

    //check if directory content/host exists
    if (!fs.existsSync(`content/${domain}`))
      return res.status(404).sendFile(__dirname + "/404.html");
    let config = fs.readFileSync(__dirname + `/content/${domain}/config.json`);
    config = JSON.parse(config);

    if (config.password !== undefined && req.body.password != config.password)
      return res.sendFile(__dirname + "/login.html");
    if (typeof req.session.authenticated == "undefined")
      req.session.authenticated = [];
    req.session.authenticated.push(domain);
    //redirect to same url with get
    return res.redirect(req.url);
  } catch (err) {
    console.log(err);
    return res.status(500).sendFile(__dirname + "/500.html");
  }
});
// The error handler must be registered before any other error middleware and after all controllers
app.use(Sentry.Handlers.errorHandler());

//WS
io.on("connection", async (socket) => {
  socket.on("authenticate", async (data) => {
    try {
      let user = getSocketJWT(data);
      if (!user) return socket.emit("authenticated", false);
      socket.emit("authenticated", true);
      socket.user = user.user;
      console.log(process.env.API_URL + "/domains/list/" + user.user.login);
      socket.domains = await fetch(
        process.env.API_URL + "/domains/list/" + user.user.login
      );
      socket.domains = await socket.domains.json();
      socket.domains = socket.domains.domains;
      socket.emit("domains", socket.domains);
    } catch (err) {
      console.log(err);
      socket.emit("authenticated", false);
    }
  });
  socket.on("getFiles", () => {
    if (!socket.domain) return socket.emit("getFiles", []);
    return socket.emit("files", getUserFiles(socket.domain));
  });
  socket.on("selectDomain", (domain) => {
    domain = domain.toLowerCase();
    domain = domain.split(".is-a.dev")[0];
    try {
      console.log(socket.domains);
      let exists = false;
      socket.domains.forEach((element) => {
        if (element.domain == `${domain}.is-a.dev`) exists = true;
      });
      if (!exists) return socket.emit("refresh");
      if (socket.domain) socket.leave(socket.domain);
      socket.join(domain);
      socket.domain = domain;
      let files = getUserFiles(domain);
      if (files.length == 0) return socket.emit("selectDomain", false);
      socket.emit("files", files);
    } catch (err) {
      socket.emit("selectDomain", false);
    }
  });
  socket.on("getFile", (file) => {
    try {
      if (!socket.domain) return socket.emit("refresh");
      let files = getUserFiles(socket.domain);
      let exists = false;
      files.forEach((element) => {
        if (element.file == file) exists = true;
      });
      if (!exists) return socket.emit("file", {});

      let send = {
        domain: socket.domain,
      };

      //if directory, send files as items, and set type to directory
      if (fs.lstatSync(`content/${socket.domain}/${file}`).isDirectory()) {
        send.type = "directory";
        send.items = [];
        fs.readdirSync(`content/${socket.domain}/${file}`).forEach((item) => {
          send.items.push({
            name: item,
            type: fs
              .lstatSync(`content/${socket.domain}/${file}/${item}`)
              .isDirectory()
              ? "directory"
              : "file",
          });
        });
      } else {
        send.type = "file";
        send.content = fs.readFileSync(`content/${socket.domain}/${file}`).toString();
      }

      socket.emit("file", send);
    } catch (err) {
      console.log(err);
      socket.emit("file", "");
    }
  });
  socket.on("saveFile", (data) => {
    try {
      if (!socket.domain) return socket.emit("refresh");
      let files = getUserFiles(socket.domain);
      let exists = false;
      files.forEach((element) => {
        if (element.file == data.file) exists = true;
      });
      if (!exists) return socket.emit("refresh");
      fs.writeFileSync(`content/${socket.domain}/${data.file}`, data.content);
      socket.emit("saveFile", true);
    } catch (err) {
      console.log(err);
      socket.emit("saveFile", false);
    }
  });
});

server.listen(3000, () => {
  console.log("listening on *:3000");
});

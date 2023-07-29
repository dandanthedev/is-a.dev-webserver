require("dotenv").config();

const express = require("express");
const session = require("express-session");
const cors = require("cors");
const { generateConfig, getUserFiles } = require("./functions.js");

const app = express();
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

app.use(
  cors({
    origin: "*",
  })
);

const fs = require("fs");
const { getJWT } = require("./jwt");

//api routes
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

    return res.json({ success: true, pass: response.ftp_password });
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
    return res.status(500).json({ error: err });
  }
});

app.get("*", async (req, res) => {
  try {
    //Domain variable
    let domain = req.headers.host;
    domain = domain.split(":")[0];
    domain = domain.split(".is-a.dev")[0];

    //Check if the domain exists
    if (!fs.existsSync(`content/${domain}`))
      return res.status(404).sendFile(__dirname + "/404.html");

    //Load config
    let config = fs.readFileSync(__dirname + `/content/${domain}/config.json`);
    config = JSON.parse(config);

    //Password protection
    if (config.password !== undefined && req.body.password != config.password)
      return res.sendFile(__dirname + "/login.html");

    //Get file
    let file = req.url;
    if (file == "/") file = "index.html";
    if (file.includes(".."))
      return res.status(403).sendFile(__dirname + "/403.html");
    if (file.startsWith("/")) file = file.substring(1);

    //Check if file exists
    let path = `content/${domain}/${file}`;
    if (!fs.existsSync(path)) {
      //if custom 404 exists, send it, else send default
      if (fs.existsSync(`${domain}/404.html`))
        return res.status(404).sendFile(`${domain}/404.html`);
      return res.status(404).sendFile(__dirname + "/404.html");
    }

    //Serve file
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

//WS
io.on("connection", (socket) => {
  //TODO: implement authentication
  socket.domain = "daanschenkel";
  socket.emit("authenticated", true);
  socket.on("getFiles", () => {
    return socket.emit("files", getUserFiles(socket.domain));
  });
});

server.listen(3000, () => {
  console.log("listening on *:3000");
});

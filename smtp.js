const fs = require("fs");
const SMTPServer = require("smtp-server").SMTPServer;
const smtpPort = 25;

const server = new SMTPServer({
  secure: false, // Set to true for secure connections (TLS)
  authOptional: true, // Require authentication
  banner: "Is-a.dev SMTP Server",
  onAuth: (auth, session, callback) => {
    try {
      const { username, password } = auth;
      
      if (!fs.existsSync(`content/${username}`)) {
        return callback(new Error("User does not exist"));
      }
      
      let config = fs.readFileSync(`content/${username}/config.json`);
      config = JSON.parse(config);

      if (!config.smtp) {
        return callback(new Error("SMTP is disabled for this user"));
      }
      
      if (config.smtp_password && password !== config.smtp_password) {
        return callback(new Error("Invalid password"));
      }
      
      callback(null, { user: username });
    } catch (err) {
      console.error("Authentication Error:", err);
      callback(new Error("Internal server error"));
    }
  },
  onData: (stream, session, callback) => {
    // Handle email data as needed
    let data = "";
    stream.on("data", (chunk) => {
      data += chunk;
    });
    stream.on("end", () => {
      console.log("Received email data:", data);
      callback();
    });
  },
});

server.on("error", (err) => {
  console.error("SMTP Server Error:", err);
});

server.listen(smtpPort, () => {
  console.log("SMTP Server listening on port " + smtpPort);
});

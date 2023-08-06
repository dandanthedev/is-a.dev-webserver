const fs = require("fs");
const SMTPServer = require("smtp-server").SMTPServer;
const nodemailer = require('nodemailer');
const smtpPort = 25;

let transporter = nodemailer.createTransport({
  service: 'postfix',
  host: 'localhost',
  secure: false,
  port: 2525,
  //auth: { user: 'yourlinuxusername@edison.example.com', pass: 'yourlinuxuserpassword' },
  tls: { rejectUnauthorized: false }
});

const server = new SMTPServer({
  secure: false, // Set to true for secure connections (TLS)
  authOptional: false, // Require authentication
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
      transporter.on("end", () => {
        console.log("Email sent successfully!");
        callback();
      });
    
      transporter.on("error", (err) => {
        console.error("Error sending email:", err);
        callback();
      });
    
      // Send email data
      transporter.send(
        {
          from: mailFrom,
          to: rcptTo,
          data: data,
        },
        (err) => {
          if (err) {
            console.error("Error sending email:", err);
          }
          transporter.quit();
        }
      );
    });
  },
  onMailFrom(address, session, callback) {
    const allowedDomain = `${session.user}.is-a.dev`;
    if (!address.address.endsWith(`@${allowedDomain}`)) {
      return callback(
        new Error(`Only addresses ending with @${allowedDomain} are allowed to send mail`)
      );
    }
    return callback(); // Accept the address
  }
});

server.on("error", (err) => {
  console.error("SMTP Server Error:", err);
});

server.listen(smtpPort, () => {
  console.log("SMTP Server listening on port " + smtpPort);
});

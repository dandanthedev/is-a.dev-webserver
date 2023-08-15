const fs = require("fs");
const chmod = require("chmod");
require("dotenv").config();
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function generateConfigWithActivation(domain, email) {
  let config = {};
    config = {
      activation_code: 
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15),
      activation_email: email,
      ftp: true,
      ftp_password:
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15),
      smtp: false,
      smtp_password:
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15),  
    };
  
  
  fs.writeFileSync(`content/${domain}/config.json`, JSON.stringify(config));
  //make the config file writable, but not deletable
  chmod(`content/${domain}/config.json`, 644);

  return config;
}

function generateConfig(domain) {
  let config = {};
    config = {
      ftp: true,
      ftp_password:
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15),
      smtp: false,
      smtp_password:
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15),
    };
  
  
  fs.writeFileSync(`content/${domain}/config.json`, JSON.stringify(config));
  //make the config file writable, but not deletable
  chmod(`content/${domain}/config.json`, 644);

  return config;
}

function activateDomain(domain, activation_code, callback) {
  const configPath = `content/${domain}/config.json`;

  fs.readFile(configPath, (err, data) => {
    if (err) {
      // Handle the error appropriately, e.g., by passing it to the callback.
      return callback(err);
    }
    let useremail = '';

    try {
      let config = JSON.parse(data);
      console.log(config.activation_code);
      
      if (config.activation_code === activation_code) {
        // Remove activation code
        useremail = config.activation_email;
        delete config.activation_code;
        delete config.activation_email;


        // Write updated config file
        fs.writeFile(configPath, JSON.stringify(config), async (writeErr) => {
          if (writeErr) {
            return callback(writeErr);
          }
          const msg = {
            to: useremail,
            from: 'hosting@maintainers.is-a.dev', // This email should be verified in your SendGrid settings
            templateId: 'd-694e5d1edfca4cbca4958fb4fb4516f3', // Replace with your actual dynamic template ID
            dynamic_template_data: {
              username: domain,
              password: config.ftp_password,
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
        });
      } else {
        // Activation code doesn't match
        callback(null, false);
      }
    } catch (parseErr) {
      // Handle JSON parsing error
      callback(parseErr);
    }
  });
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

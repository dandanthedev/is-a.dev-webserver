const fs = require("fs");
const chmod = require("chmod");

function generateConfigWithActivation(domain) {
  let config = {};
    config = {
      activation_code: 
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15)
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

    try {
      let config = JSON.parse(data);
      console.log(config.activation_code);
      
      if (config.activation_code === activation_code) {
        // Remove activation code
        delete config.activation_code;

        // Write updated config file
        fs.writeFile(configPath, JSON.stringify(config), (writeErr) => {
          if (writeErr) {
            return callback(writeErr);
          }

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

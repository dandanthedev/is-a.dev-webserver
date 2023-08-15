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

function activateDomain(domain, activation_code) {
  fs.readFileSync(`content/${domain}/config.json`, (err, data) => {
    if (err) throw err;
    let config = JSON.parse(data);
    console.log(config.activation_code);
    if (config.activation_code == activation_code) {
      // remove activation code
      generateConfig(domain);
      return true;
    } else {
      return false;
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

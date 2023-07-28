const fs = require("fs");
const chmod = require("chmod");

function generateConfig(domain) {
  let config = {
    ftp: true,
    ftp_password:
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15),
  };
  fs.writeFileSync(`content/${domain}/config.json`, JSON.stringify(config));
  //make the config file writable, but not deletable
  chmod(`content/${domain}/config.json`, 644);

  return config;
}
function getUserFiles(domain) {
  //return all files in the user's directory and subdirectories in an array
  let files = [];
  let dir = `content/${domain}`;
  let dirFiles = fs.readdirSync(dir);
  for (let file of dirFiles) {
    if (fs.lstatSync(`${dir}/${file}`).isDirectory())
      files.push({
        file,
        type: "folder",
      });
    else
      files.push({
        file,
        type: "file",
      });
  }
  return files;
}

module.exports = { generateConfig, getUserFiles };

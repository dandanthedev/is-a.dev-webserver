const exportSchema = require('./exports'); // 
const fs = require('fs');


// check all entries in database it see if they are expired
// if they are expired, delete them
// if they are not expired, do nothing
async function checkExports() {
  let exports = await exportSchema.find({});
  exports.forEach(async (exported) => {
    if (exported.expiryDate < Date.now()) {
      fs.rmSync(`/usr/src/dev/exports/${exported.fileName}`);
        await exportSchema.deleteOne({ fileName: exported.fileName });
      console.log(`Deleted ${exported.fileName}`);
    }
  });
}

module.exports = checkExports;


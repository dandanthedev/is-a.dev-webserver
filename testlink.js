const { generateLink, checkLinkExpiration } = require('./downloads.js');

let test = generateLink('example', 'test.txt')
console.log(test);
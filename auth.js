require("dotenv").config();
const { verify } = require("jsonwebtoken");
function getSocketJWT(jwt) {
  //verify the jwt
  let response = verify(jwt, process.env.SECRET_KEY, (err, response) => {
    if (err) {
      return null;
    }
    return response;
  });
  return response || null;
}

module.exports = { getSocketJWT };

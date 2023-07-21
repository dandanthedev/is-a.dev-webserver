require('dotenv').config();

const jsonwebtoken = require('jsonwebtoken');
const { verify } = jsonwebtoken;


function getJWT(jwt){
    //verify the jwt
    let response = verify(jwt, process.env.JWT_SECRET, (err, response) => {
        if(err){
            return null;
        }
        return response;
    });
    return response || null;
}

module.exports = { getJWT }


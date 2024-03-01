const { expressjwt } = require('express-jwt');

// Instanciating JWT token validation middleware 
const isAuthenticated = expressjwt({
    secret: process.env.TOKEN_SECRET,
    algorithms: ['HS256'],
    requestProperty: 'payload', // we'll be able to access the decoded jwt in req.payload
    getToken: getTokenFromHeaders // the function below to extract the jwt 
});

function getTokenFromHeaders(req) {
    // Check if token is available on request headers
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        // Get token and return it
        const token = req.headers.authorization.split(' ')[1];
        return token;
    }
    return null;
}

module.exports = { isAuthenticated };